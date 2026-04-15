#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════
# check-production.sh — Verify if hushhtech.com is running the latest code
#
# Usage:  ./scripts/check-production.sh
#
# What it checks:
#   1. GCP Cloud Build — latest build status & commit
#   2. GCP Cloud Run  — active revision & deploy time
#   3. Live Site      — build-commit meta tag from hushhtech.com
#   4. Local Git      — compares with your current HEAD commit
#
# Requires: gcloud CLI authenticated to hushh-tech-prod project
# ════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Config ───
PROJECT="hushh-tech-prod"
SERVICE="hushh-tech-website"
REGION="us-central1"
PROD_URL="https://hushhtech.com"
CLOUD_RUN_URL="https://hushh-tech-website-fro3hygenq-uc.a.run.app"

# ─── Colors ───
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  🔍  Hushh Tech — Production Deployment Checker${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════${NC}"
echo ""

# ─── 1. Local Git Info ───
echo -e "${CYAN}📦 LOCAL GIT${NC}"
LOCAL_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
LOCAL_SHORT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
LOCAL_MSG=$(git log -1 --pretty=format:"%s" 2>/dev/null || echo "unknown")
LOCAL_DATE=$(git log -1 --pretty=format:"%ci" 2>/dev/null || echo "unknown")
echo -e "   Commit:  ${BOLD}${LOCAL_SHORT}${NC}"
echo -e "   Message: ${DIM}${LOCAL_MSG}${NC}"
echo -e "   Date:    ${DIM}${LOCAL_DATE}${NC}"
echo ""

# ─── 2. GCP Cloud Build Status ───
echo -e "${CYAN}🏗️  GCP CLOUD BUILD${NC}"
BUILD_INFO=$(gcloud builds list \
  --project="$PROJECT" \
  --limit=3 \
  --format="table[no-heading](id,status,source.repoSource.commitSha,createTime,duration)" \
  2>/dev/null || echo "")

if [ -n "$BUILD_INFO" ]; then
  # Get the latest build details
  LATEST_BUILD_STATUS=$(gcloud builds list \
    --project="$PROJECT" \
    --limit=1 \
    --format="value(status)" 2>/dev/null || echo "UNKNOWN")
  LATEST_BUILD_COMMIT=$(gcloud builds list \
    --project="$PROJECT" \
    --limit=1 \
    --format="value(source.repoSource.commitSha)" 2>/dev/null || echo "")
  LATEST_BUILD_TIME=$(gcloud builds list \
    --project="$PROJECT" \
    --limit=1 \
    --format="value(createTime)" 2>/dev/null || echo "unknown")
  LATEST_BUILD_ID=$(gcloud builds list \
    --project="$PROJECT" \
    --limit=1 \
    --format="value(id)" 2>/dev/null || echo "unknown")
  LATEST_BUILD_SHORT="${LATEST_BUILD_COMMIT:0:7}"

  if [ "$LATEST_BUILD_STATUS" = "SUCCESS" ]; then
    echo -e "   Status:  ${GREEN}✅ SUCCESS${NC}"
  elif [ "$LATEST_BUILD_STATUS" = "WORKING" ] || [ "$LATEST_BUILD_STATUS" = "QUEUED" ]; then
    echo -e "   Status:  ${YELLOW}⏳ ${LATEST_BUILD_STATUS} (build in progress...)${NC}"
  else
    echo -e "   Status:  ${RED}❌ ${LATEST_BUILD_STATUS}${NC}"
  fi
  echo -e "   Commit:  ${BOLD}${LATEST_BUILD_SHORT:-N/A}${NC}"
  echo -e "   Time:    ${DIM}${LATEST_BUILD_TIME}${NC}"
  echo -e "   Build:   ${DIM}${LATEST_BUILD_ID:0:12}...${NC}"

  # Show last 3 builds
  echo -e "   ${DIM}─── Recent Builds ───${NC}"
  gcloud builds list \
    --project="$PROJECT" \
    --limit=3 \
    --format="table[box](status,source.repoSource.commitSha.slice(0:7):label=COMMIT,createTime.date():label=DATE,duration:label=DURATION)" \
    2>/dev/null | while IFS= read -r line; do echo -e "   ${DIM}${line}${NC}"; done
else
  echo -e "   ${YELLOW}⚠️  Could not fetch Cloud Build info${NC}"
  echo -e "   ${DIM}Make sure gcloud is authenticated to project: ${PROJECT}${NC}"
fi
echo ""

# ─── 3. GCP Cloud Run Revision ───
echo -e "${CYAN}🚀 GCP CLOUD RUN${NC}"
REVISION_INFO=$(gcloud run revisions list \
  --service="$SERVICE" \
  --region="$REGION" \
  --project="$PROJECT" \
  --limit=1 \
  --format="value(metadata.name,status.conditions[0].lastTransitionTime,spec.containers[0].image)" \
  2>/dev/null || echo "")

if [ -n "$REVISION_INFO" ]; then
  REVISION_NAME=$(echo "$REVISION_INFO" | awk '{print $1}')
  REVISION_TIME=$(echo "$REVISION_INFO" | awk '{print $2}')
  REVISION_IMAGE=$(echo "$REVISION_INFO" | awk '{print $3}')

  # Get serving status
  SERVING_STATUS=$(gcloud run services describe "$SERVICE" \
    --region="$REGION" \
    --project="$PROJECT" \
    --format="value(status.conditions[0].status)" 2>/dev/null || echo "Unknown")

  if [ "$SERVING_STATUS" = "True" ]; then
    echo -e "   Status:   ${GREEN}✅ SERVING${NC}"
  else
    echo -e "   Status:   ${RED}❌ ${SERVING_STATUS}${NC}"
  fi
  echo -e "   Revision: ${BOLD}${REVISION_NAME}${NC}"
  echo -e "   Deployed: ${DIM}${REVISION_TIME}${NC}"
  echo -e "   Image:    ${DIM}${REVISION_IMAGE##*/}${NC}"
else
  echo -e "   ${YELLOW}⚠️  Could not fetch Cloud Run info${NC}"
fi
echo ""

# ─── 4. Live Site Build Commit (from meta tag) ───
echo -e "${CYAN}🌐 LIVE SITE (${PROD_URL})${NC}"

# Try hushhtech.com first, fall back to Cloud Run direct URL
SITE_HTML=""
DEPLOYED_COMMIT=""
DEPLOYED_VERSION=""
DEPLOYED_TIME=""

for URL in "$PROD_URL" "$CLOUD_RUN_URL"; do
  SITE_HTML=$(curl -sL --max-time 10 "$URL" 2>/dev/null || echo "")
  if [ -n "$SITE_HTML" ]; then
    DEPLOYED_COMMIT=$(echo "$SITE_HTML" | grep -o 'name="build-commit"[^>]*content="[^"]*"' | grep -o 'content="[^"]*"' | cut -d'"' -f2 || echo "")
    DEPLOYED_VERSION=$(echo "$SITE_HTML" | grep -o 'name="app-version"[^>]*content="[^"]*"' | grep -o 'content="[^"]*"' | cut -d'"' -f2 || echo "")
    DEPLOYED_TIME=$(echo "$SITE_HTML" | grep -o 'name="deploy-verified"[^>]*content="[^"]*"' | grep -o 'content="[^"]*"' | cut -d'"' -f2 || echo "")
    
    if [ -n "$DEPLOYED_COMMIT" ]; then
      echo -e "   Source:  ${BOLD}${URL}${NC}"
      break
    fi
  fi
done

if [ -n "$DEPLOYED_COMMIT" ]; then
  DEPLOYED_SHORT="${DEPLOYED_COMMIT:0:7}"
  echo -e "   Commit:  ${BOLD}${DEPLOYED_SHORT}${NC} ${DIM}(${DEPLOYED_COMMIT})${NC}"
  echo -e "   Version: ${DIM}${DEPLOYED_VERSION:-N/A}${NC}"
  echo -e "   Built:   ${DIM}${DEPLOYED_TIME:-N/A}${NC}"
else
  echo -e "   ${YELLOW}⚠️  No build-commit meta tag found in HTML${NC}"
  echo -e "   ${DIM}The build with version tracking may not be deployed yet.${NC}"
  echo -e "   ${DIM}Expected: <meta name=\"build-commit\" content=\"...\">  ${NC}"
fi
echo ""

# ─── 5. VERDICT ───
echo -e "${BOLD}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  📋  VERDICT${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════${NC}"

if [ -n "$DEPLOYED_COMMIT" ] && [ "$DEPLOYED_COMMIT" = "$LOCAL_COMMIT" ]; then
  echo ""
  echo -e "  ${GREEN}✅  PRODUCTION IS UP-TO-DATE${NC}"
  echo -e "  ${GREEN}   Live commit matches local HEAD: ${LOCAL_SHORT}${NC}"
  echo ""
elif [ -n "$DEPLOYED_COMMIT" ] && [ "$DEPLOYED_COMMIT" != "$LOCAL_COMMIT" ]; then
  echo ""
  echo -e "  ${YELLOW}⚠️   PRODUCTION IS BEHIND${NC}"
  echo -e "  ${YELLOW}   Live:  ${DEPLOYED_COMMIT:0:7}${NC}"
  echo -e "  ${YELLOW}   Local: ${LOCAL_SHORT}${NC}"
  echo ""
  
  # Show how many commits behind
  BEHIND_COUNT=$(git rev-list --count "${DEPLOYED_COMMIT}..HEAD" 2>/dev/null || echo "?")
  echo -e "  ${DIM}Production is ${BEHIND_COUNT} commit(s) behind HEAD${NC}"
  
  # Show the missing commits
  if [ "$BEHIND_COUNT" != "?" ] && [ "$BEHIND_COUNT" -gt 0 ] 2>/dev/null; then
    echo -e "  ${DIM}Missing commits:${NC}"
    git log --oneline "${DEPLOYED_COMMIT}..HEAD" 2>/dev/null | while IFS= read -r line; do
      echo -e "    ${DIM}• ${line}${NC}"
    done
  fi
  echo ""
  
  # Check if build is in progress
  if [ "${LATEST_BUILD_STATUS:-}" = "WORKING" ] || [ "${LATEST_BUILD_STATUS:-}" = "QUEUED" ]; then
    echo -e "  ${CYAN}⏳ A build is currently in progress. Wait a few minutes.${NC}"
  fi
elif [ -z "$DEPLOYED_COMMIT" ]; then
  echo ""
  echo -e "  ${YELLOW}❓  CANNOT VERIFY — no build-commit meta tag on live site${NC}"
  echo -e "  ${DIM}  The version-tracking build (c538e8d) may not be deployed yet.${NC}"
  echo -e "  ${DIM}  Check Cloud Build status above for deployment progress.${NC}"
  echo ""
  
  # Use Cloud Build commit as fallback
  if [ -n "${LATEST_BUILD_COMMIT:-}" ]; then
    if [ "$LATEST_BUILD_COMMIT" = "$LOCAL_COMMIT" ]; then
      echo -e "  ${GREEN}📋 Cloud Build latest matches local HEAD: ${LOCAL_SHORT}${NC}"
      if [ "${LATEST_BUILD_STATUS:-}" = "SUCCESS" ]; then
        echo -e "  ${GREEN}   Build succeeded — site should have latest code.${NC}"
      fi
    else
      echo -e "  ${YELLOW}📋 Cloud Build latest: ${LATEST_BUILD_SHORT:-N/A} ≠ local: ${LOCAL_SHORT}${NC}"
    fi
  fi
  echo ""
fi

echo -e "${BOLD}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${DIM}Quick manual check: Open browser console on hushhtech.com and type:${NC}"
echo -e "${DIM}  __HUSHH_VERSION__${NC}"
echo ""
