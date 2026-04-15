#!/bin/bash
# Setup Automated Token Refresh for Vertex AI
# This script sets up a cron job (macOS launchd) to refresh tokens every 50 minutes
#
# Usage: ./scripts/setup-token-refresh-cron.sh
#
# For production, use Google Cloud Scheduler instead.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PLIST_NAME="ai.hushh.vertex-ai-token-refresh"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"
REFRESH_SCRIPT="$SCRIPT_DIR/refresh-vertex-ai-token.sh"
LOG_DIR="$HOME/Library/Logs/hushh"

echo "🔧 Setting up Vertex AI Token Refresh Cron Job"
echo "================================================"
echo ""

# Create log directory
mkdir -p "$LOG_DIR"

# Check if refresh script exists
if [ ! -f "$REFRESH_SCRIPT" ]; then
    echo "❌ Refresh script not found at: $REFRESH_SCRIPT"
    exit 1
fi

# Make refresh script executable
chmod +x "$REFRESH_SCRIPT"

# Check for gcloud and supabase CLI
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install Google Cloud SDK first."
    echo "   brew install google-cloud-sdk"
    exit 1
fi

if ! command -v supabase &> /dev/null; then
    echo "❌ supabase CLI not found. Please install Supabase CLI first."
    echo "   npm install -g supabase"
    exit 1
fi

# Create launchd plist for macOS
echo "📝 Creating launchd plist at: $PLIST_PATH"

cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_NAME}</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>${REFRESH_SCRIPT}</string>
    </array>
    
    <!-- Run every 50 minutes (3000 seconds) -->
    <key>StartInterval</key>
    <integer>3000</integer>
    
    <!-- Also run at load (immediately) -->
    <key>RunAtLoad</key>
    <true/>
    
    <!-- Working directory -->
    <key>WorkingDirectory</key>
    <string>${PROJECT_DIR}</string>
    
    <!-- Environment variables -->
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
    
    <!-- Logging -->
    <key>StandardOutPath</key>
    <string>${LOG_DIR}/vertex-ai-token-refresh.log</string>
    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/vertex-ai-token-refresh-error.log</string>
    
    <!-- Keep alive if it crashes -->
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
</dict>
</plist>
EOF

echo "✅ Plist created successfully!"

# Unload if already loaded (to apply changes)
if launchctl list | grep -q "$PLIST_NAME"; then
    echo "🔄 Unloading existing job..."
    launchctl unload "$PLIST_PATH" 2>/dev/null || true
fi

# Load the new plist
echo "🚀 Loading launchd job..."
launchctl load "$PLIST_PATH"

# Verify it's running
if launchctl list | grep -q "$PLIST_NAME"; then
    echo "✅ Cron job installed and running!"
else
    echo "❌ Failed to load cron job"
    exit 1
fi

# Run once immediately to verify
echo ""
echo "🧪 Running initial token refresh..."
bash "$REFRESH_SCRIPT"

echo ""
echo "================================================"
echo "✅ SETUP COMPLETE!"
echo ""
echo "📌 Token will be refreshed automatically every 50 minutes"
echo "📋 View logs: tail -f $LOG_DIR/vertex-ai-token-refresh.log"
echo "🛑 To stop: launchctl unload $PLIST_PATH"
echo "▶️  To restart: launchctl load $PLIST_PATH"
echo ""
echo "🔗 For production, use Google Cloud Scheduler instead:"
echo "   ./scripts/setup-cloud-scheduler-token-refresh.sh"
