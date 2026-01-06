# Quick Installation Guide

## 🚀 Fast Setup (15 minutes)

### On Backup Server (10.72.200.91)

```bash
# SSH into server
ssh mist@10.72.200.91

# Create directories
mkdir -p /home/mist/backups/windows-documents /home/mist/backup-scripts /home/mist/backup-logs

# Upload scripts (from your local machine)
# scp manage-backups.sh setup-cron.sh mist@10.72.200.91:/home/mist/backup-scripts/

# Make executable and setup cron
cd /home/mist/backup-scripts
chmod +x manage-backups.sh setup-cron.sh
./setup-cron.sh
```

### On Windows PC (10.72.200.81)

**Open PowerShell as Administrator:**

```powershell
# Set execution policy for this session
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force

# Navigate to where you placed the scripts
cd C:\Temp\backup-scripts

# Run setup in order:
# 1. Setup SSH keys
.\setup-ssh-keys.ps1

# 2. Create scheduled task
.\create-scheduled-task.ps1

# 3. Test the backup (optional but recommended)
Start-ScheduledTask -TaskName "DailyDocumentsBackup"
```

### Verify Installation

**On Windows:**
```powershell
# Check task status
Get-ScheduledTask -TaskName "DailyDocumentsBackup"

# View logs
Get-Content C:\BackupLogs\backup_log_$(Get-Date -Format 'yyyy-MM').txt -Tail 20
```

**On Server:**
```bash
# List backups
ls -lh /home/mist/backups/windows-documents/

# Check cron
crontab -l

# View management menu
/home/mist/backup-scripts/manage-backups.sh
```

## ✅ Done!

Your backup system is now:
- ✅ Backing up E:\Documents daily at 2:00 AM
- ✅ Also backing up on system startup (after 5 min delay)
- ✅ Using secure SFTP transfers
- ✅ Keeping 30 days of backups
- ✅ Auto-cleaning old backups at 3:00 AM daily

---

For detailed documentation, see [README.md](README.md)

For troubleshooting, see the **Troubleshooting** section in README.md
