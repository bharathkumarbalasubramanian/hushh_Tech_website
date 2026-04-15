#!/bin/bash

# Script to update Supabase Auth URL Configuration
# This fixes the redirect from hushh.ai to hushhtech.com

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_REF="ibsisfnjxeowvdtvgzff"
NEW_SITE_URL="https://hushhtech.com"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Supabase Auth URL Configuration Update${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "Project: ${GREEN}${PROJECT_REF}${NC}"
echo -e "New Site URL: ${GREEN}${NEW_SITE_URL}${NC}"
echo ""

# Check if supabase CLI is logged in
if ! npx supabase projects list &>/dev/null; then
    echo -e "${RED}Error: Not logged in to Supabase CLI${NC}"
    echo "Please run: npx supabase login"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI is logged in${NC}"

# Get access token from supabase CLI
echo ""
echo -e "${YELLOW}Getting access token...${NC}"

# The access token is stored in ~/.supabase/access-token after login
ACCESS_TOKEN_FILE="$HOME/.supabase/access-token"
if [ -f "$ACCESS_TOKEN_FILE" ]; then
    ACCESS_TOKEN=$(cat "$ACCESS_TOKEN_FILE")
    echo -e "${GREEN}✓ Access token found${NC}"
else
    echo -e "${RED}Error: Access token not found at ${ACCESS_TOKEN_FILE}${NC}"
    echo "Please run: npx supabase login"
    exit 1
fi

# Update auth config via Management API
echo ""
echo -e "${YELLOW}Updating Site URL via Supabase Management API...${NC}"

RESPONSE=$(curl -s -X PATCH \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "site_url": "https://hushhtech.com",
    "uri_allow_list": "https://hushhtech.com/**,https://www.hushhtech.com/**,https://hushhtech.com/auth/callback,https://hushhtech.com/auth/callback?redirect=/hushh-ai,https://www.hushhtech.com/auth/callback,https://www.hushhtech.com/auth/callback?redirect=/hushh-ai,hushh://auth/callback,hushh://**,ai.hushh.app://,ai.hushh.app://**,capacitor://localhost,http://localhost:3000/**,http://localhost:5173/**"
  }')

# Check if the update was successful
if echo "$RESPONSE" | grep -q "site_url"; then
    echo -e "${GREEN}✓ Auth configuration updated successfully!${NC}"
    echo ""
    echo -e "${GREEN}New Configuration:${NC}"
    echo "$RESPONSE" | jq '.site_url, .uri_allow_list' 2>/dev/null || echo "$RESPONSE"
else
    echo -e "${RED}Error updating auth configuration:${NC}"
    echo "$RESPONSE"
    echo ""
    echo -e "${YELLOW}If this failed, please update manually:${NC}"
    echo "1. Go to: https://supabase.com/dashboard/project/${PROJECT_REF}/auth/url-configuration"
    echo "2. Set Site URL to: https://hushhtech.com"
    echo "3. Add these Redirect URLs:"
    echo "   - https://hushhtech.com/auth/callback"
    echo "   - https://hushhtech.com/auth/callback?redirect=/hushh-ai"
    echo "   - https://www.hushhtech.com/auth/callback"
    echo "   - https://www.hushhtech.com/auth/callback?redirect=/hushh-ai"
    echo "   - hushh://auth/callback"
    echo "   - https://hushhtech.com/**"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}OAuth redirect will now go to hushhtech.com${NC}"
echo -e "${GREEN}========================================${NC}"
