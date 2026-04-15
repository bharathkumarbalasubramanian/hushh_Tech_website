#!/bin/bash
# =============================================================================
# Hushh DevOps Notification System - Google Cloud Setup
# =============================================================================
# This script sets up the Google Cloud infrastructure for GitHub webhook
# notifications to dev-ops@hushh.ai
#
# Usage: ./scripts/gcloud-devops-setup.sh
# =============================================================================

set -e

# Configuration
PROJECT_ID="hushh-devops-notifier"
SERVICE_ACCOUNT_NAME="hushh-github-notifier"
DISPLAY_NAME="Hushh GitHub Notifier"
# Secure temporary directory for credentials
TEMP_DIR=$(mktemp -d)
KEY_FILE="$TEMP_DIR/hushh-github-notifier-key.json"

# Self-destruct trap: Deletes the key the exact second the script finishes
trap 'rm -rf "$TEMP_DIR"; echo -e "\n[SECURITY CHECK]: Temporary credential files securely deleted from disk."' EXIT

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Hushh DevOps Notification System - Google Cloud Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed."
    echo "   Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if logged in
ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null || echo "")
if [ -z "$ACCOUNT" ]; then
    echo "📝 Please login to Google Cloud..."
    gcloud auth login
fi

echo ""
echo "📋 Step 1: Creating/Setting Project..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Try to create project (will fail silently if exists)
gcloud projects create $PROJECT_ID --name="Hushh DevOps Notifier" 2>/dev/null || echo "   Project already exists, continuing..."

# Set as active project
gcloud config set project $PROJECT_ID
echo "   ✅ Active project: $PROJECT_ID"

echo ""
echo "📋 Step 2: Enabling Gmail API..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

gcloud services enable gmail.googleapis.com
echo "   ✅ Gmail API enabled"

echo ""
echo "📋 Step 3: Creating Service Account..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if service account exists
SA_EMAIL="$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"
SA_EXISTS=$(gcloud iam service-accounts list --filter="email:$SA_EMAIL" --format="value(email)" 2>/dev/null || echo "")

if [ -z "$SA_EXISTS" ]; then
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
        --display-name="$DISPLAY_NAME" \
        --description="Service account for GitHub webhook notifications"
    echo "   ✅ Service account created: $SA_EMAIL"
else
    echo "   ✅ Service account exists: $SA_EMAIL"
fi

echo ""
echo "📋 Step 4: Generating Service Account Key..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "$KEY_FILE" ]; then
    echo "   ⚠️  Key file already exists at $KEY_FILE"
    read -p "   Overwrite? (y/n): " OVERWRITE
    if [ "$OVERWRITE" != "y" ]; then
        echo "   Skipping key generation..."
    else
        rm -f "$KEY_FILE"
        gcloud iam service-accounts keys create "$KEY_FILE" \
            --iam-account="$SA_EMAIL"
        echo "   ✅ New key generated: $KEY_FILE"
    fi
else
    gcloud iam service-accounts keys create "$KEY_FILE" \
        --iam-account="$SA_EMAIL"
    echo "   ✅ Key generated: $KEY_FILE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Google Cloud Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📧 Service Account Email:"
echo "   $SA_EMAIL"
echo ""
echo "🔑 Key File:"
echo "   $KEY_FILE"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 NEXT STEPS (Manual):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Setup Domain-Wide Delegation in Google Workspace Admin:"
echo "   - Go to: admin.google.com → Security → API Controls → Domain-wide Delegation"
echo "   - Click 'Add new'"
echo "   - Client ID: (Get from service account details in GCP Console)"
echo "   - OAuth Scopes: https://www.googleapis.com/auth/gmail.send"
echo ""
echo "2. Add Service Account Key to Supabase Secrets:"
          B64_KEY=$(cat "$KEY_FILE" | base64 -w 0 2>/dev/null || cat "$KEY_FILE" | base64)
echo "  Run this exact command in your terminal:"
echo "  supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON=\"$B64_KEY\""
echo ""
echo "3. Add GitHub Webhook Secret to Supabase:"
echo "   supabase secrets set GITHUB_WEBHOOK_SECRET=\"$(openssl rand -hex 20)\""
echo ""
echo "4. Deploy the Edge Function:"
echo "   supabase functions deploy github-devops-notify"
echo ""
echo "5. Add Webhook to GitHub:"
echo "   - Go to: github.com/hushh-labs/hushh_Tech_website/settings/hooks"
echo "   - Payload URL: https://jbvfjyxpjyspafqzohmi.supabase.co/functions/v1/github-devops-notify"
echo "   - Content type: application/json"
echo "   - Secret: (same as GITHUB_WEBHOOK_SECRET)"
echo "   - Events: Pull requests (select 'closed' to capture merges)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
