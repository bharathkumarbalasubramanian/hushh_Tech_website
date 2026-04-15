#!/bin/bash
# ============================================
# Hushh Studio - Veo 3.1 API Test Script
# Tests video generation using Vertex AI (GCP paid billing)
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f ".env.local" ]; then
    export $(grep -E "^VITE_VERTEX_AI_" .env.local | xargs)
fi

# Default values from .env.local
PROJECT_ID="${VITE_VERTEX_AI_PROJECT_ID:-hushone-app}"
LOCATION="${VITE_VERTEX_AI_LOCATION:-us-central1}"

# Get access token from gcloud
echo -e "${YELLOW}Getting GCP access token...${NC}"
ACCESS_TOKEN=$(gcloud auth print-access-token 2>/dev/null)

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}ERROR: Could not get GCP access token${NC}"
    echo "Please authenticate with gcloud first:"
    echo "  gcloud auth login"
    echo "  gcloud config set project ${PROJECT_ID}"
    exit 1
fi

echo -e "${GREEN}✓ GCP authenticated (project: ${PROJECT_ID})${NC}"

# Vertex AI Base URL
BASE_URL="https://${LOCATION}-aiplatform.googleapis.com/v1"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Hushh Studio - Veo 3.1 API Test${NC}"
echo -e "${BLUE}  (Vertex AI - GCP Paid Billing)${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "  Project: ${PROJECT_ID}"
echo -e "  Location: ${LOCATION}"
echo ""

# Model endpoint for Vertex AI
MODEL_ENDPOINT="${BASE_URL}/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models"

# Test 1: Check Vertex AI Access
echo -e "${YELLOW}Test 1: Checking Vertex AI Access...${NC}"

# List available models
MODELS_RESPONSE=$(curl -s -w "\n%{http_code}" \
    "${BASE_URL}/projects/${PROJECT_ID}/locations/${LOCATION}/models" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json")

HTTP_CODE=$(echo "$MODELS_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$MODELS_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Vertex AI access confirmed${NC}"
else
    echo -e "${YELLOW}⚠ Models list not accessible (HTTP $HTTP_CODE) - continuing with direct model call${NC}"
fi

echo ""

# Test 2: Check Veo Model Availability via Imagen/Video API
echo -e "${YELLOW}Test 2: Checking Veo 3.1 Model Access...${NC}"

# Try to get model info (may not work for all models, but worth checking)
MODEL_CHECK=$(curl -s -w "\n%{http_code}" \
    "${MODEL_ENDPOINT}/veo-3.1-generate-preview" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json")

HTTP_CODE=$(echo "$MODEL_CHECK" | tail -n 1)
RESPONSE_BODY=$(echo "$MODEL_CHECK" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Veo 3.1 model endpoint accessible${NC}"
elif [ "$HTTP_CODE" -eq 404 ]; then
    echo -e "${YELLOW}⚠ Model info endpoint returned 404 - trying predictLongRunning directly${NC}"
else
    echo -e "${YELLOW}⚠ Model check returned HTTP $HTTP_CODE - will try generation anyway${NC}"
fi

echo ""

# Test 3: Start Video Generation
echo -e "${YELLOW}Test 3: Starting Video Generation (Vertex AI)...${NC}"
echo -e "  Prompt: 'A calm ocean wave rolling onto a sandy beach at sunset'"
echo -e "  Aspect Ratio: 16:9"
echo ""

# Vertex AI Veo endpoint: predictLongRunning
VEO_ENDPOINT="${MODEL_ENDPOINT}/veo-3.1-generate-preview:predictLongRunning"
echo -e "  Endpoint: ${VEO_ENDPOINT}"
echo ""

# Vertex AI format uses instances/parameters
GENERATE_RESPONSE=$(curl -s -w "\n%{http_code}" \
    "${VEO_ENDPOINT}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "instances": [{"prompt": "A calm ocean wave rolling onto a sandy beach at sunset, golden hour lighting, peaceful atmosphere"}],
        "parameters": {"aspectRatio": "16:9"}
    }')

HTTP_CODE=$(echo "$GENERATE_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$GENERATE_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Video generation started successfully${NC}"
    
    # Extract operation name
    OPERATION_NAME=$(echo "$RESPONSE_BODY" | jq -r '.name // empty')
    
    if [ -n "$OPERATION_NAME" ]; then
        echo -e "  Operation: ${OPERATION_NAME}"
        echo ""
        
        # Test 4: Poll for completion
        echo -e "${YELLOW}Test 4: Polling for Video Completion...${NC}"
        echo -e "  (This may take 1-2 minutes)"
        echo ""
        
        MAX_POLLS=18  # 18 * 10s = 3 minutes max
        POLL_COUNT=0
        
        # Extract the operation ID from the full operation name
        # Format: projects/{project}/locations/{location}/publishers/google/models/{model}/operations/{op_id}
        OPERATION_ID=$(echo "$OPERATION_NAME" | grep -oE 'operations/[^/]+$' | cut -d'/' -f2)
        
        # Standard Vertex AI operations endpoint
        POLL_ENDPOINT="${BASE_URL}/projects/${PROJECT_ID}/locations/${LOCATION}/operations/${OPERATION_ID}"
        echo -e "  Poll endpoint: ${POLL_ENDPOINT}"
        echo ""
        
        while [ $POLL_COUNT -lt $MAX_POLLS ]; do
            POLL_COUNT=$((POLL_COUNT + 1))
            
            # Try both endpoints - first the standard operations endpoint
            POLL_RESPONSE=$(curl -s -w "\n%{http_code}" \
                "${POLL_ENDPOINT}" \
                -H "Authorization: Bearer ${ACCESS_TOKEN}" \
                -H "Content-Type: application/json")
            
            POLL_CODE=$(echo "$POLL_RESPONSE" | tail -n 1)
            POLL_BODY=$(echo "$POLL_RESPONSE" | sed '$d')
            
            if [ "$POLL_CODE" -eq 200 ]; then
                IS_DONE=$(echo "$POLL_BODY" | jq -r '.done // false')
                
                if [ "$IS_DONE" = "true" ]; then
                    echo -e "${GREEN}✓ Video generation completed!${NC}"
                    
                    # Check for error
                    ERROR=$(echo "$POLL_BODY" | jq -r '.error // empty')
                    if [ -n "$ERROR" ] && [ "$ERROR" != "null" ]; then
                        echo -e "${RED}✗ Generation Error:${NC}"
                        echo "$ERROR" | jq .
                    else
                        # Extract video info
                        VIDEO_INFO=$(echo "$POLL_BODY" | jq -r '.response.generatedVideos[0] // empty')
                        if [ -n "$VIDEO_INFO" ]; then
                            echo -e "${GREEN}✓ Video generated successfully!${NC}"
                            
                            VIDEO_URI=$(echo "$VIDEO_INFO" | jq -r '.video.uri // empty')
                            if [ -n "$VIDEO_URI" ]; then
                                echo -e "  Video URI: ${VIDEO_URI}"
                                
                                # Save result
                                echo "$POLL_BODY" > /tmp/veo-test-result.json
                                echo -e "${GREEN}✓ Full result saved to: /tmp/veo-test-result.json${NC}"
                            fi
                        fi
                    fi
                    break
                else
                    ELAPSED=$((POLL_COUNT * 10))
                    echo -e "  [${ELAPSED}s] Still generating..."
                fi
            else
                echo -e "${RED}✗ Poll failed (HTTP $POLL_CODE)${NC}"
            fi
            
            sleep 10
        done
        
        if [ $POLL_COUNT -eq $MAX_POLLS ]; then
            echo -e "${YELLOW}⚠ Polling timeout. Video may still be generating.${NC}"
            echo "  Operation: ${OPERATION_NAME}"
        fi
    else
        echo -e "${YELLOW}⚠ Could not extract operation name from response${NC}"
        echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"
    fi
else
    echo -e "${RED}✗ Video generation request failed (HTTP $HTTP_CODE)${NC}"
    echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"
    
    # Check for specific errors
    ERROR_MSG=$(echo "$RESPONSE_BODY" | jq -r '.error.message // empty')
    ERROR_CODE=$(echo "$RESPONSE_BODY" | jq -r '.error.code // empty')
    
    if [ -n "$ERROR_MSG" ]; then
        echo ""
        echo -e "${YELLOW}Error Analysis:${NC}"
        
        if echo "$ERROR_MSG" | grep -qi "permission denied\|not authorized\|forbidden"; then
            echo -e "  → GCP account may not have Vertex AI Video API enabled"
            echo -e "  → Run: gcloud services enable aiplatform.googleapis.com"
            echo -e "  → Or enable in GCP Console: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com"
        elif echo "$ERROR_MSG" | grep -qi "model not found\|unknown model\|not supported"; then
            echo -e "  → Veo 3.1 may not be available in ${LOCATION}"
            echo -e "  → Try: us-central1, europe-west4, or asia-northeast1"
            echo -e "  → Alternative models: veo-2.0-generate-preview, imagegeneration@006"
        elif echo "$ERROR_MSG" | grep -qi "quota\|rate limit\|resource exhausted"; then
            echo -e "  → Vertex AI quota exceeded"
            echo -e "  → Check quota: https://console.cloud.google.com/iam-admin/quotas"
        elif echo "$ERROR_MSG" | grep -qi "billing\|payment"; then
            echo -e "  → GCP billing not enabled for project: ${PROJECT_ID}"
            echo -e "  → Enable billing: https://console.cloud.google.com/billing"
        fi
    fi
    
    # Suggest debugging
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo -e "  1. Verify project: gcloud config get project"
    echo -e "  2. Check auth: gcloud auth list"
    echo -e "  3. Enable API: gcloud services enable aiplatform.googleapis.com"
fi

echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Test Complete${NC}"
echo -e "${BLUE}======================================${NC}"
