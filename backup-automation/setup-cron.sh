#!/bin/bash
# ================================================================
# Daily Backup Maintenance Cron Job Setup
# ================================================================
# Purpose: Setup cron job for automated backup maintenance
# Run this script on the backup server (10.72.200.91)
# ================================================================

SCRIPT_DIR="/home/mist/backup-scripts"
MANAGEMENT_SCRIPT="$SCRIPT_DIR/manage-backups.sh"

echo "=========================================="
echo "Setting up backup maintenance cron job"
echo "=========================================="

# Create script directory
mkdir -p "$SCRIPT_DIR"

# Copy the management script
if [ -f "$(dirname "$0")/manage-backups.sh" ]; then
    cp "$(dirname "$0")/manage-backups.sh" "$MANAGEMENT_SCRIPT"
    chmod +x "$MANAGEMENT_SCRIPT"
    echo "✓ Copied management script to: $MANAGEMENT_SCRIPT"
else
    echo "✗ ERROR: manage-backups.sh not found"
    exit 1
fi

# Create cron job
CRON_JOB="0 3 * * * $MANAGEMENT_SCRIPT maintenance >> /home/mist/backup-logs/cron.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$MANAGEMENT_SCRIPT"; then
    echo "Cron job already exists. Updating..."
    (crontab -l 2>/dev/null | grep -v "$MANAGEMENT_SCRIPT"; echo "$CRON_JOB") | crontab -
else
    echo "Adding new cron job..."
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
fi

echo ""
echo "✓ Cron job configured successfully!"
echo ""
echo "Schedule: Daily at 3:00 AM"
echo "Command: $MANAGEMENT_SCRIPT maintenance"
echo ""
echo "Current crontab:"
crontab -l | grep -A 1 "$MANAGEMENT_SCRIPT" || echo "No entries"
echo ""
echo "To manually run maintenance:"
echo "$MANAGEMENT_SCRIPT maintenance"
echo ""
echo "=========================================="
