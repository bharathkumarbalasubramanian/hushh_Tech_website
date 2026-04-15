-- Migration: Create user_product_usage table
-- Purpose: Track which users access which products (hushh-ai, kyc, investor-profile, etc.)
-- Date: 2026-01-07

-- Create the user_product_usage table
CREATE TABLE IF NOT EXISTS public.user_product_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    first_access_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_access_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    access_count INTEGER NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- One record per user per product
    CONSTRAINT unique_user_product UNIQUE(user_id, product_name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_product_usage_user_id ON public.user_product_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_product_usage_product_name ON public.user_product_usage(product_name);
CREATE INDEX IF NOT EXISTS idx_user_product_usage_last_access ON public.user_product_usage(last_access_at DESC);

-- Enable RLS
ALTER TABLE public.user_product_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own product usage
CREATE POLICY "Users can view own product usage"
    ON public.user_product_usage
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can insert their own product usage
CREATE POLICY "Users can insert own product usage"
    ON public.user_product_usage
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own product usage
CREATE POLICY "Users can update own product usage"
    ON public.user_product_usage
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role can do anything (for admin analytics)
CREATE POLICY "Service role has full access"
    ON public.user_product_usage
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Function to upsert product usage (increment access count, update last_access_at)
CREATE OR REPLACE FUNCTION public.track_product_usage(
    p_user_id UUID,
    p_product_name TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS public.user_product_usage
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result public.user_product_usage;
BEGIN
    INSERT INTO public.user_product_usage (user_id, product_name, metadata)
    VALUES (p_user_id, p_product_name, p_metadata)
    ON CONFLICT (user_id, product_name) DO UPDATE SET
        last_access_at = NOW(),
        access_count = public.user_product_usage.access_count + 1,
        updated_at = NOW(),
        metadata = COALESCE(public.user_product_usage.metadata, '{}') || p_metadata
    RETURNING * INTO result;
    
    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.track_product_usage TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE public.user_product_usage IS 'Tracks which users access which products. Each user-product combination has one record.';
COMMENT ON COLUMN public.user_product_usage.product_name IS 'Product identifier: hushh-ai, kyc, investor-profile, etc.';
COMMENT ON COLUMN public.user_product_usage.access_count IS 'Number of times user accessed this product';
COMMENT ON COLUMN public.user_product_usage.metadata IS 'Additional context: device, platform, referrer, etc.';
