import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

import { corsHeaders } from '../_shared/cors.ts'
import { executeDeleteUserAccount } from './service.ts'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse(500, {
      success: false,
      error: 'Server configuration error',
      details: 'Supabase environment variables are missing',
    })
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey)
  const result = await executeDeleteUserAccount(
    adminClient,
    req.headers.get('Authorization')
  )

  return jsonResponse(result.status, result.body)
})
