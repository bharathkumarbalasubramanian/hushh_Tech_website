-- Add coupon tracking columns to ceo_meeting_payments
ALTER TABLE ceo_meeting_payments ADD COLUMN IF NOT EXISTS coupon_code TEXT DEFAULT NULL;
ALTER TABLE ceo_meeting_payments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe' CHECK (payment_method IN ('stripe', 'coupon'));
