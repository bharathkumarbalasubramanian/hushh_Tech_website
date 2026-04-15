-- Add GPS location columns to onboarding_data table
-- These columns store location data detected from user's GPS in Step 6

-- Add GPS location data columns
ALTER TABLE onboarding_data
ADD COLUMN IF NOT EXISTS gps_location_data JSONB,
ADD COLUMN IF NOT EXISTS gps_detected_country TEXT,
ADD COLUMN IF NOT EXISTS gps_detected_state TEXT,
ADD COLUMN IF NOT EXISTS gps_detected_city TEXT,
ADD COLUMN IF NOT EXISTS gps_detected_postal_code TEXT,
ADD COLUMN IF NOT EXISTS gps_detected_phone_dial_code TEXT,
ADD COLUMN IF NOT EXISTS gps_detected_timezone TEXT;

-- Add comments for documentation
COMMENT ON COLUMN onboarding_data.gps_location_data IS 'Full GPS location data JSON from Google Geocoding API';
COMMENT ON COLUMN onboarding_data.gps_detected_country IS 'Country name detected from GPS';
COMMENT ON COLUMN onboarding_data.gps_detected_state IS 'State/Province detected from GPS';
COMMENT ON COLUMN onboarding_data.gps_detected_city IS 'City detected from GPS';
COMMENT ON COLUMN onboarding_data.gps_detected_postal_code IS 'Postal/ZIP code detected from GPS';
COMMENT ON COLUMN onboarding_data.gps_detected_phone_dial_code IS 'Phone dial code (+1, +91, etc.) detected from GPS country';
COMMENT ON COLUMN onboarding_data.gps_detected_timezone IS 'Timezone detected from GPS location';

-- Create index for faster GPS data lookups
CREATE INDEX IF NOT EXISTS idx_onboarding_data_gps_detected_country 
ON onboarding_data(gps_detected_country) 
WHERE gps_detected_country IS NOT NULL;
