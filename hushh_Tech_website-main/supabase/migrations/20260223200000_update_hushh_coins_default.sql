-- Update default hushh_coins_awarded from 100 to 300000
-- 1 dollar = 100 Hushh coins, $3000 charge = 300,000 coins
ALTER TABLE ceo_meeting_payments 
  ALTER COLUMN hushh_coins_awarded SET DEFAULT 300000;

-- Update existing records that had the old default of 100
UPDATE ceo_meeting_payments 
SET hushh_coins_awarded = 300000 
WHERE hushh_coins_awarded = 100;
