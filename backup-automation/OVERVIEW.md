# Backup Automation System

**Secure, automated backup solution for Windows to Linux**

## System Overview

- **Source**: Windows PC (10.72.200.81) - E:\Documents
- **Destination**: Linux Server (10.72.200.91) - /home/mist/backups/windows-documents
- **Protocol**: SFTP (SSH File Transfer Protocol)
- **Schedule**: Daily at 2:00 AM + System startup
- **Retention**: 30 days
- **Credentials**: mist / Cyber#Range

## Files Included

### Windows Scripts (PowerShell)
1. **backup-documents.ps1** - Main backup script
   - Compresses E:\Documents to ZIP
   - Transfers via SFTP to backup server
   - Manages logging and error handling
   - Cleans up local temporary files

2. **setup-ssh-keys.ps1** - SSH key configuration
   - Generates SSH key pair
   - Copies public key to server
   - Tests authentication
   - Configures SSH settings

3. **create-scheduled-task.ps1** - Task automation
   - Creates Windows scheduled task
   - Configures daily and startup triggers
   - Sets up persistence

### Linux Scripts (Bash)
1. **manage-backups.sh** - Backup management tool
   - Lists all backups
   - Cleans old backups (30+ days)
   - Verifies backup integrity
   - Monitors disk space
   - Generates reports

2. **setup-cron.sh** - Cron job installer
   - Configures automated maintenance
   - Runs daily at 3:00 AM

## Quick Start

See [QUICK_INSTALL.md](QUICK_INSTALL.md) for fast setup instructions.

See [README.md](README.md) for complete documentation.

## Features

✅ **Automated Daily Backups** - Set it and forget it
✅ **Secure SFTP Transfer** - Encrypted file transfers
✅ **SSH Key Authentication** - No passwords stored
✅ **Compression** - Efficient ZIP compression
✅ **Retention Policy** - 30-day automatic cleanup
✅ **Comprehensive Logging** - Full audit trail
✅ **Error Handling** - Robust error management
✅ **Disk Monitoring** - Space usage alerts
✅ **Backup Verification** - Integrity checks
✅ **Easy Recovery** - Simple restore process

## Architecture

```
Windows PC (10.72.200.81)
    │
    ├─ E:\Documents (Source)
    │
    ├─ backup-documents.ps1
    │   ├─ Compress to ZIP
    │   ├─ Transfer via SFTP
    │   └─ Log operations
    │
    ├─ Task Scheduler
    │   ├─ Daily: 2:00 AM
    │   └─ Startup: +5 min
    │
    └─ SSH Keys
        └─ Passwordless auth

            ↓ SFTP (Secure)

Backup Server (10.72.200.91)
    │
    ├─ /home/mist/backups/windows-documents/
    │   ├─ Documents_Backup_2024-12-22_02-00-00.zip
    │   ├─ Documents_Backup_2024-12-21_02-00-00.zip
    │   └─ ...
    │
    ├─ manage-backups.sh
    │   ├─ List backups
    │   ├─ Verify integrity
    │   ├─ Clean old files
    │   └─ Generate reports
    │
    └─ Cron Job (3:00 AM daily)
        └─ Automated maintenance
```

## Security

- **Encryption**: All transfers use SFTP (SSH)
- **Authentication**: SSH key-based (no passwords)
- **Key Strength**: 4096-bit RSA
- **Access Control**: Restricted file permissions
- **Audit Trail**: Complete logging

## Monitoring

### Windows
```powershell
# View backup logs
Get-Content C:\BackupLogs\backup_log_*.txt

# Check task status
Get-ScheduledTask -TaskName "DailyDocumentsBackup"
```

### Linux
```bash
# Interactive management
/home/mist/backup-scripts/manage-backups.sh

# List backups
ls -lh /home/mist/backups/windows-documents/

# View logs
tail -f /home/mist/backup-logs/*.log
```

## Troubleshooting

Common issues and solutions in [README.md](README.md#troubleshooting)

## Requirements

**Windows PC:**
- Windows 10/11 or Windows Server
- PowerShell 5.1+
- OpenSSH Client or WinSCP/PuTTY
- Administrator access

**Backup Server:**
- Linux (Ubuntu/Debian/CentOS/RHEL)
- SSH server (openssh-server)
- Bash shell
- Sufficient disk space

## Maintenance

- **Daily**: Automatic backups and cleanup
- **Weekly**: Verify backup integrity
- **Monthly**: Review reports and disk space
- **Quarterly**: Test restore procedures

## Support

For issues or questions:
1. Check logs: `C:\BackupLogs\` (Windows) or `/home/mist/backup-logs/` (Linux)
2. Review [README.md](README.md) troubleshooting section
3. Test components individually

## Version

**Version**: 1.0
**Created**: December 2024
**Author**: Automated Backup Solution

---

**Status Indicators:**
- 🟢 Automated and persistent
- 🔒 Secure SFTP protocol
- 📦 ZIP compression
- 🔄 30-day retention
- 📊 Full logging
- ✅ Production ready
