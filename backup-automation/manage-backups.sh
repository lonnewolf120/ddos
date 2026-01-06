#!/bin/bash
# ================================================================
# Backup Server Management Script
# ================================================================
# Purpose: Manage backups on the backup server (10.72.200.91)
# Features: Retention policy, disk monitoring, backup verification
# ================================================================

# Configuration
BACKUP_DIR="/home/mist/backups/windows-documents"
RETENTION_DAYS=30
LOG_DIR="/home/mist/backup-logs"
LOG_FILE="${LOG_DIR}/backup-management_$(date +%Y-%m).log"
EMAIL_ALERTS="false"  # Set to true and configure email if needed
ALERT_EMAIL="admin@example.com"
DISK_THRESHOLD=90  # Alert if disk usage exceeds 90%

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create necessary directories
mkdir -p "$BACKUP_DIR"
mkdir -p "$LOG_DIR"

# Logging function
log_message() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

# Email notification function
send_alert() {
    local subject=$1
    local message=$2

    if [ "$EMAIL_ALERTS" = "true" ]; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL" 2>/dev/null || \
            log_message "WARNING" "Failed to send email alert"
    fi

    log_message "ALERT" "$subject - $message"
}

# Check disk space
check_disk_space() {
    log_message "INFO" "Checking disk space..."

    local disk_usage=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
    local disk_available=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $4}')

    log_message "INFO" "Disk usage: ${disk_usage}% (${disk_available} available)"

    if [ "$disk_usage" -ge "$DISK_THRESHOLD" ]; then
        send_alert "DISK SPACE WARNING" "Backup disk usage is at ${disk_usage}%. Available: ${disk_available}"
        return 1
    fi

    return 0
}

# Clean old backups based on retention policy
cleanup_old_backups() {
    log_message "INFO" "=========================================="
    log_message "INFO" "Starting cleanup of old backups (retention: ${RETENTION_DAYS} days)"

    local count_before=$(find "$BACKUP_DIR" -name "Documents_Backup_*.zip" -type f | wc -l)
    log_message "INFO" "Total backups before cleanup: ${count_before}"

    # Find and delete old backups
    find "$BACKUP_DIR" -name "Documents_Backup_*.zip" -type f -mtime +${RETENTION_DAYS} -print0 | while IFS= read -r -d '' file; do
        local filesize=$(du -h "$file" | cut -f1)
        log_message "INFO" "Deleting old backup: $(basename "$file") (${filesize})"
        rm -f "$file"
    done

    local count_after=$(find "$BACKUP_DIR" -name "Documents_Backup_*.zip" -type f | wc -l)
    local deleted=$((count_before - count_after))

    log_message "INFO" "Cleanup complete. Deleted ${deleted} old backup(s)"
    log_message "INFO" "Remaining backups: ${count_after}"
}

# Verify backup integrity
verify_backups() {
    log_message "INFO" "=========================================="
    log_message "INFO" "Verifying backup integrity..."

    local verified=0
    local failed=0

    # Check the most recent 5 backups
    find "$BACKUP_DIR" -name "Documents_Backup_*.zip" -type f -mtime -7 | sort -r | head -n 5 | while read -r backup; do
        log_message "INFO" "Verifying: $(basename "$backup")"

        if unzip -t "$backup" >/dev/null 2>&1; then
            log_message "INFO" "✓ $(basename "$backup") - OK"
            ((verified++))
        else
            log_message "ERROR" "✗ $(basename "$backup") - CORRUPTED"
            send_alert "BACKUP CORRUPTION" "Corrupted backup detected: $(basename "$backup")"
            ((failed++))
        fi
    done

    log_message "INFO" "Verification complete. Verified: ${verified}, Failed: ${failed}"
}

# List all backups
list_backups() {
    log_message "INFO" "=========================================="
    log_message "INFO" "Current backups in ${BACKUP_DIR}:"

    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR")" ]; then
        log_message "WARNING" "No backups found"
        return
    fi

    local total_size=0

    echo -e "\n${BLUE}Date                 | Size      | Filename${NC}"
    echo "---------------------+-----------+------------------------------------------"

    find "$BACKUP_DIR" -name "Documents_Backup_*.zip" -type f -printf "%T@ %s %p\n" | sort -rn | while read -r timestamp size filepath; do
        local date=$(date -d "@${timestamp}" '+%Y-%m-%d %H:%M:%S')
        local size_human=$(numfmt --to=iec-i --suffix=B "$size" 2>/dev/null || echo "${size} bytes")
        local filename=$(basename "$filepath")

        printf "%s | %9s | %s\n" "$date" "$size_human" "$filename"
        total_size=$((total_size + size))
    done

    local total_size_human=$(numfmt --to=iec-i --suffix=B "$total_size" 2>/dev/null || echo "${total_size} bytes")
    echo "---------------------+-----------+------------------------------------------"
    echo -e "${GREEN}Total backup size: ${total_size_human}${NC}\n"
}

# Generate backup report
generate_report() {
    log_message "INFO" "=========================================="
    log_message "INFO" "Generating backup report..."

    local report_file="${LOG_DIR}/backup-report_$(date +%Y-%m-%d).txt"

    {
        echo "=========================================="
        echo "Backup System Report"
        echo "Generated: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "=========================================="
        echo ""
        echo "Backup Location: $BACKUP_DIR"
        echo "Retention Policy: $RETENTION_DAYS days"
        echo ""

        # Disk usage
        echo "--- Disk Usage ---"
        df -h "$BACKUP_DIR"
        echo ""

        # Backup count
        local backup_count=$(find "$BACKUP_DIR" -name "Documents_Backup_*.zip" -type f | wc -l)
        echo "--- Backup Statistics ---"
        echo "Total backups: $backup_count"

        # Most recent backup
        local latest_backup=$(find "$BACKUP_DIR" -name "Documents_Backup_*.zip" -type f -printf "%T@ %p\n" | sort -rn | head -1 | cut -d' ' -f2)
        if [ -n "$latest_backup" ]; then
            local latest_date=$(date -r "$latest_backup" '+%Y-%m-%d %H:%M:%S')
            local latest_size=$(du -h "$latest_backup" | cut -f1)
            echo "Latest backup: $(basename "$latest_backup")"
            echo "Date: $latest_date"
            echo "Size: $latest_size"
        fi
        echo ""

        # Recent backups
        echo "--- Recent Backups (Last 7 days) ---"
        find "$BACKUP_DIR" -name "Documents_Backup_*.zip" -type f -mtime -7 -printf "%TY-%Tm-%Td %TH:%TM | %s | %f\n" | sort -r

    } > "$report_file"

    cat "$report_file"
    log_message "INFO" "Report saved to: $report_file"
}

# Monitor for new backups (useful for alerting)
monitor_new_backups() {
    log_message "INFO" "Monitoring for new backups..."

    local latest_backup=$(find "$BACKUP_DIR" -name "Documents_Backup_*.zip" -type f -printf "%T@ %p\n" | sort -rn | head -1)

    if [ -n "$latest_backup" ]; then
        local timestamp=$(echo "$latest_backup" | cut -d' ' -f1)
        local filepath=$(echo "$latest_backup" | cut -d' ' -f2)
        local age=$(($(date +%s) - ${timestamp%.*}))
        local hours=$((age / 3600))

        if [ $hours -gt 48 ]; then
            send_alert "BACKUP MISSING" "No backup received in the last ${hours} hours"
        else
            log_message "INFO" "Latest backup is ${hours} hours old: $(basename "$filepath")"
        fi
    else
        send_alert "NO BACKUPS" "No backups found in $BACKUP_DIR"
    fi
}

# Main menu
show_menu() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}Backup Server Management${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo "1. List all backups"
    echo "2. Clean old backups (>$RETENTION_DAYS days)"
    echo "3. Verify backup integrity"
    echo "4. Check disk space"
    echo "5. Generate report"
    echo "6. Monitor backup status"
    echo "7. Run full maintenance"
    echo "8. Exit"
    echo -e "${BLUE}========================================${NC}"
    echo -n "Select an option: "
}

# Full maintenance routine
run_maintenance() {
    log_message "INFO" "=========================================="
    log_message "INFO" "Running full maintenance routine"
    log_message "INFO" "=========================================="

    check_disk_space
    cleanup_old_backups
    verify_backups
    monitor_new_backups
    generate_report

    log_message "INFO" "=========================================="
    log_message "INFO" "Maintenance routine completed"
    log_message "INFO" "=========================================="
}

# Parse command line arguments
case "${1:-menu}" in
    cleanup)
        cleanup_old_backups
        ;;
    verify)
        verify_backups
        ;;
    list)
        list_backups
        ;;
    disk)
        check_disk_space
        ;;
    report)
        generate_report
        ;;
    monitor)
        monitor_new_backups
        ;;
    maintenance)
        run_maintenance
        ;;
    menu|*)
        # Interactive menu
        while true; do
            show_menu
            read -r choice

            case $choice in
                1) list_backups ;;
                2) cleanup_old_backups ;;
                3) verify_backups ;;
                4) check_disk_space ;;
                5) generate_report ;;
                6) monitor_new_backups ;;
                7) run_maintenance ;;
                8)
                    echo -e "${GREEN}Goodbye!${NC}"
                    exit 0
                    ;;
                *)
                    echo -e "${RED}Invalid option${NC}"
                    ;;
            esac

            echo -e "\nPress Enter to continue..."
            read -r
        done
        ;;
esac
