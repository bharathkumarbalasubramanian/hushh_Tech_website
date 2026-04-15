/**
 * Supabase Client for Hushh AI
 * Replaces Redis/Upstash for: Rate limiting, caching, session management
 * Uses Supabase tables instead of Redis
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================
// Rate Limiting
// ============================================

/**
 * Check if user has exceeded rate limit
 * @param userId - User ID
 * @param limit - Max requests per window
 * @param windowSeconds - Time window in seconds
 * @returns { allowed: boolean, remaining: number, resetIn: number }
 */
export async function checkRateLimit(
  userId: string,
  limit: number = 100,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowSeconds * 1000);
    
    // Get current count for this user in the time window
    const { data, error } = await supabase
      .from('hushh_ai_rate_limits')
      .select('request_count, window_start')
      .eq('user_id', userId)
      .gte('window_start', windowStart.toISOString())
      .order('window_start', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      console.error('Rate limit check error:', error);
    }
    
    const currentCount = data?.request_count || 0;
    
    if (currentCount >= limit) {
      const resetTime = data?.window_start 
        ? new Date(data.window_start).getTime() + windowSeconds * 1000 - now.getTime()
        : windowSeconds * 1000;
      return { 
        allowed: false, 
        remaining: 0, 
        resetIn: Math.ceil(resetTime / 1000) 
      };
    }
    
    // Upsert rate limit record
    await supabase
      .from('hushh_ai_rate_limits')
      .upsert({
        user_id: userId,
        request_count: currentCount + 1,
        window_start: data?.window_start || now.toISOString(),
        window_seconds: windowSeconds,
        updated_at: now.toISOString(),
      }, {
        onConflict: 'user_id,window_start',
      });
    
    return { 
      allowed: true, 
      remaining: limit - currentCount - 1, 
      resetIn: 0 
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    // Fail open - allow request if rate limiting fails
    return { allowed: true, remaining: limit, resetIn: 0 };
  }
}

/**
 * Check media upload limit (20 per day)
 * Uses existing table with columns: user_id, daily_uploads, last_reset
 */
export async function checkMediaUploadLimit(userId: string): Promise<{
  allowed: boolean;
  used: number;
  remaining: number;
  resetsAt: string;
}> {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const maxUploads = 20;
    
    // Get current limit record
    const { data, error } = await supabase
      .from('hushh_ai_media_limits')
      .select('daily_uploads, last_reset')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Media limit check error:', error);
    }
    
    let used = 0;
    
    if (data) {
      // Check if last_reset was today
      const lastResetDate = data.last_reset 
        ? new Date(data.last_reset).toISOString().split('T')[0] 
        : null;
      
      if (lastResetDate === today) {
        // Same day, use current count
        used = data.daily_uploads || 0;
      } else {
        // Different day, count should be reset
        used = 0;
      }
    }
    
    if (used >= maxUploads) {
      // Calculate reset time (midnight UTC)
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      
      return {
        allowed: false,
        used,
        remaining: 0,
        resetsAt: tomorrow.toISOString(),
      };
    }
    
    return {
      allowed: true,
      used,
      remaining: maxUploads - used,
      resetsAt: '',
    };
  } catch (error) {
    console.error('Media limit error:', error);
    return { allowed: true, used: 0, remaining: 20, resetsAt: '' };
  }
}

/**
 * Increment media upload count
 * Uses existing table with columns: user_id, daily_uploads, last_reset
 */
export async function incrementMediaUpload(userId: string): Promise<number> {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Get existing record
    const { data: existing } = await supabase
      .from('hushh_ai_media_limits')
      .select('daily_uploads, last_reset')
      .eq('user_id', userId)
      .single();
    
    let newCount = 1;
    
    if (existing) {
      // Check if last_reset was today
      const lastResetDate = existing.last_reset 
        ? new Date(existing.last_reset).toISOString().split('T')[0] 
        : null;
      
      if (lastResetDate === today) {
        // Same day, increment
        newCount = (existing.daily_uploads || 0) + 1;
      } else {
        // New day, reset to 1
        newCount = 1;
      }
      
      // Update existing record
      await supabase
        .from('hushh_ai_media_limits')
        .update({ 
          daily_uploads: newCount,
          last_reset: now.toISOString()
        })
        .eq('user_id', userId);
    } else {
      // Create new record
      await supabase
        .from('hushh_ai_media_limits')
        .insert({
          user_id: userId,
          daily_uploads: 1,
          last_reset: now.toISOString(),
        });
    }
    
    return newCount;
  } catch (error) {
    console.error('Increment media error:', error);
    return 1;
  }
}

// ============================================
// Caching
// ============================================

/**
 * Cache chat context for faster retrieval
 */
export async function cacheContext(
  chatId: string,
  context: { role: string; content: string }[],
  ttlSeconds: number = 3600 // 1 hour
): Promise<void> {
  try {
    const key = `context:${chatId}`;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    
    await supabase
      .from('hushh_ai_cache')
      .upsert({
        cache_key: key,
        cache_type: 'context',
        cache_value: context,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'cache_key',
      });
  } catch (error) {
    console.error('Cache context error:', error);
  }
}

/**
 * Get cached chat context
 */
export async function getCachedContext(chatId: string): Promise<{ role: string; content: string }[] | null> {
  try {
    const key = `context:${chatId}`;
    
    const { data, error } = await supabase
      .from('hushh_ai_cache')
      .select('cache_value')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error || !data) return null;
    
    return data.cache_value as { role: string; content: string }[];
  } catch (error) {
    console.error('Get cached context error:', error);
    return null;
  }
}

/**
 * Cache AI response for similar queries
 */
export async function cacheResponse(
  queryHash: string,
  response: string,
  ttlSeconds: number = 1800 // 30 minutes
): Promise<void> {
  try {
    const key = `response:${queryHash}`;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    
    await supabase
      .from('hushh_ai_cache')
      .upsert({
        cache_key: key,
        cache_type: 'response',
        cache_value: { text: response },
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'cache_key',
      });
  } catch (error) {
    console.error('Cache response error:', error);
  }
}

/**
 * Get cached AI response
 */
export async function getCachedResponse(queryHash: string): Promise<string | null> {
  try {
    const key = `response:${queryHash}`;
    
    const { data, error } = await supabase
      .from('hushh_ai_cache')
      .select('cache_value')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error || !data) return null;
    
    return (data.cache_value as { text: string })?.text || null;
  } catch (error) {
    console.error('Get cached response error:', error);
    return null;
  }
}

// ============================================
// Session Management
// ============================================

/**
 * Store user session data
 */
export async function setSession(
  userId: string,
  sessionData: Record<string, unknown>,
  ttlSeconds: number = 86400 // 24 hours
): Promise<void> {
  try {
    const key = `session:${userId}`;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    
    await supabase
      .from('hushh_ai_cache')
      .upsert({
        cache_key: key,
        cache_type: 'session',
        cache_value: sessionData,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'cache_key',
      });
  } catch (error) {
    console.error('Set session error:', error);
  }
}

/**
 * Get user session data
 */
export async function getSession(userId: string): Promise<Record<string, unknown> | null> {
  try {
    const key = `session:${userId}`;
    
    const { data, error } = await supabase
      .from('hushh_ai_cache')
      .select('cache_value')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error || !data) return null;
    
    return data.cache_value as Record<string, unknown>;
  } catch (error) {
    console.error('Get session error:', error);
    return null;
  }
}

/**
 * Delete user session
 */
export async function deleteSession(userId: string): Promise<void> {
  try {
    const key = `session:${userId}`;
    
    await supabase
      .from('hushh_ai_cache')
      .delete()
      .eq('cache_key', key);
  } catch (error) {
    console.error('Delete session error:', error);
  }
}

// ============================================
// Streaming State (for resumable streams)
// ============================================

/**
 * Save streaming state for resumable streams
 */
export async function saveStreamState(
  chatId: string,
  messageId: string,
  partialContent: string
): Promise<void> {
  try {
    const key = `stream:${chatId}:${messageId}`;
    const expiresAt = new Date(Date.now() + 300 * 1000); // 5 min TTL
    
    await supabase
      .from('hushh_ai_cache')
      .upsert({
        cache_key: key,
        cache_type: 'stream',
        cache_value: { content: partialContent },
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'cache_key',
      });
  } catch (error) {
    console.error('Save stream state error:', error);
  }
}

/**
 * Get streaming state
 */
export async function getStreamState(chatId: string, messageId: string): Promise<string | null> {
  try {
    const key = `stream:${chatId}:${messageId}`;
    
    const { data, error } = await supabase
      .from('hushh_ai_cache')
      .select('cache_value')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error || !data) return null;
    
    return (data.cache_value as { content: string })?.content || null;
  } catch (error) {
    console.error('Get stream state error:', error);
    return null;
  }
}

/**
 * Clear streaming state
 */
export async function clearStreamState(chatId: string, messageId: string): Promise<void> {
  try {
    const key = `stream:${chatId}:${messageId}`;
    
    await supabase
      .from('hushh_ai_cache')
      .delete()
      .eq('cache_key', key);
  } catch (error) {
    console.error('Clear stream state error:', error);
  }
}

// ============================================
// Analytics (simple counters)
// ============================================

/**
 * Increment usage counter for analytics
 */
export async function trackUsage(metric: string): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Try to increment existing record
    const { data, error } = await supabase
      .from('hushh_ai_analytics')
      .select('metric_count')
      .eq('metric_name', metric)
      .eq('metric_date', today)
      .single();
    
    if (error && error.code === 'PGRST116') {
      // No record exists, create one
      await supabase
        .from('hushh_ai_analytics')
        .insert({
          metric_name: metric,
          metric_date: today,
          metric_count: 1,
        });
    } else if (data) {
      // Increment existing record
      await supabase
        .from('hushh_ai_analytics')
        .update({ 
          metric_count: data.metric_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('metric_name', metric)
        .eq('metric_date', today);
    }
  } catch (error) {
    console.error('Track usage error:', error);
  }
}

/**
 * Get usage count
 */
export async function getUsageCount(metric: string, date?: string): Promise<number> {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('hushh_ai_analytics')
      .select('metric_count')
      .eq('metric_name', metric)
      .eq('metric_date', targetDate)
      .single();
    
    if (error || !data) return 0;
    
    return data.metric_count;
  } catch (error) {
    console.error('Get usage count error:', error);
    return 0;
  }
}

// ============================================
// Simple hash function for query caching
// ============================================

export function hashQuery(query: string): string {
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    const char = query.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}
