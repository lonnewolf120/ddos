# Automated Backup System Setup Guide

Complete solution for automated, secure backups from Windows PC (10.72.200.81) to Linux backup server (10.72.200.91).

## 📋 Overview

**What this does:**
- ✅ Compresses E:\Documents into timestamped ZIP files
- ✅ Transfers securely via SFTP using SSH keys
- ✅ Runs automatically daily at 2:00 AM
- ✅ Also runs at system startup (with 5-minute delay)
- ✅ Maintains 30-day retention policy
- ✅ Automatic cleanup of old backups
- ✅ Comprehensive logging and monitoring

**Requirements:**
- Windows PC: 10.72.200.81 (Source)
- Backup Server: 10.72.200.91 (Destination)
- Credentials: mist / Cyber#Range (both systems)
- OpenSSH or PuTTY installed on Windows
- SSH server running on backup server

---

## 🚀 Quick Start Installation

### Step 1: Prepare the Backup Server (10.72.200.91)

SSH into the backup server:

```bash
ssh mist@10.72.200.91
```

Create backup directories:

```bash
mkdir -p /home/mist/backups/windows-documents
mkdir -p /home/mist/backup-scripts
mkdir -p /home/mist/backup-logs
chmod 755 /home/mist/backups/windows-documents
```

Transfer the server scripts (from your local machine):

```bash
# From your local machine where you have the scripts
scp manage-backups.sh mist@10.72.200.91:/home/mist/backup-scripts/
scp setup-cron.sh mist@10.72.200.91:/home/mist/backup-scripts/
```

On the backup server, make scripts executable:

```bash
cd /home/mist/backup-scripts
chmod +x manage-backups.sh setup-cron.sh
```

Setup the automated maintenance cron job:

```bash
./setup-cron.sh
```

---

### Step 2: Setup Windows PC (10.72.200.81)

#### 2.1 Install Required Software

**Option A: Using OpenSSH (Recommended for Windows 10/11)**

Open PowerShell as Administrator:

```powershell
# Install OpenSSH Client
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0

# Install OpenSSH Server (if not already installed)
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
```

**Option B: Using PuTTY/WinSCP**

Download and install:
- [PuTTY](https://www.putty.org/) (for SSH/SFTP)
- [WinSCP](https://winscp.net/) (for SFTP transfers)

#### 2.2 Transfer Scripts to Windows PC

Using SCP or WinSCP, copy these files to the Windows PC:
- `backup-documents.ps1`
- `setup-ssh-keys.ps1`
- `create-scheduled-task.ps1`

Place them in a temporary directory like `C:\Temp\backup-scripts\`

#### 2.3 Setup SSH Keys

Open PowerShell as Administrator and run:

```powershell
cd C:\Temp\backup-scripts
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
.\setup-ssh-keys.ps1
```

**What this does:**
- Generates SSH key pair (if not exists)
- Copies public key to backup server
- Tests the connection
- Creates backup directory on server
- Configures SSH config file

**Manual Key Setup (if automated fails):**

If the automated setup doesn't work, manually copy the key:

1. Generate key (if not exists):
   ```powershell
   ssh-keygen -t rsa -b 4096 -f $env:USERPROFILE\.ssh\id_rsa
   ```

2. View the public key:
   ```powershell
   Get-Content $env:USERPROFILE\.ssh\id_rsa.pub
   ```

3. SSH to the backup server:
   ```powershell
   ssh mist@10.72.200.91
   ```

4. Add the public key:
   ```bash
   mkdir -p ~/.ssh
   nano ~/.ssh/authorized_keys
   # Paste the public key, save and exit
   chmod 600 ~/.ssh/authorized_keys
   chmod 700 ~/.ssh
   ```

5. Test connection:
   ```powershell
   ssh -i $env:USERPROFILE\.ssh\id_rsa mist@10.72.200.91
   ```

#### 2.4 Create Scheduled Task

Run PowerShell as Administrator:

```powershell
cd C:\Temp\backup-scripts
.\create-scheduled-task.ps1
```

**What this does:**
- Copies backup script to `C:\BackupScripts\`
- Creates scheduled task "DailyDocumentsBackup"
- Schedules daily execution at 2:00 AM
- Adds startup trigger (with 5-minute delay)
- Runs with SYSTEM privileges

When prompted, test the backup by entering `Y`.

---

## 📁 File Structure

### Windows PC (10.72.200.81)
```
C:\
├── BackupScripts\
│   └── backup-documents.ps1          # Main backup script
├── BackupLogs\
│   ├── backup_log_2024-12.txt        # Monthly log files
│   └── winscp_2024-12-22.log         # Transfer logs
└── Users\[USERNAME]\.ssh\
    ├── id_rsa                         # Private SSH key
    ├── id_rsa.pub                     # Public SSH key
    └── config                         # SSH configuration
```

### Backup Server (10.72.200.91)
```
/home/mist/
├── backups/
│   └── windows-documents/
│       ├── Documents_Backup_2024-12-22_02-00-00.zip
│       ├── Documents_Backup_2024-12-21_02-00-00.zip
│       └── ...
├── backup-scripts/
│   ├── manage-backups.sh              # Backup management tool
│   └── setup-cron.sh                  # Cron setup script
└── backup-logs/
    ├── backup-management_2024-12.log  # Management logs
    ├── backup-report_2024-12-22.txt   # Daily reports
    └── cron.log                       # Cron job logs
```

---

## 🔧 Configuration Options

### Backup Script Configuration

Edit `C:\BackupScripts\backup-documents.ps1` to customize:

```powershell
param(
    [string]$BackupSource = "E:\Documents",           # Source directory
    [string]$RemoteHost = "10.72.200.91",            # Backup server IP
    [string]$RemoteUser = "mist",                    # SSH username
    [string]$RemoteBackupPath = "/home/mist/backups/windows-documents",
    [string]$LocalTempPath = "$env:TEMP\backup-temp", # Temp directory
    [int]$RetentionDays = 30                         # Keep backups for 30 days
)
```

### Scheduled Task Time

To change the backup time, edit the task:

```powershell
# Change backup time to 3:00 AM
$Trigger = New-ScheduledTaskTrigger -Daily -At "03:00"
Set-ScheduledTask -TaskName "DailyDocumentsBackup" -Trigger $Trigger
```

Or use Task Scheduler GUI:
1. Open `taskschd.msc`
2. Find "DailyDocumentsBackup"
3. Right-click → Properties → Triggers → Edit

### Server Retention Policy

Edit `/home/mist/backup-scripts/manage-backups.sh`:

```bash
RETENTION_DAYS=30        # Change retention period
DISK_THRESHOLD=90        # Disk usage alert threshold
EMAIL_ALERTS="false"     # Enable email alerts
```

---

## 📊 Monitoring and Management

### On Windows PC

**View Backup Logs:**
```powershell
Get-Content C:\BackupLogs\backup_log_$(Get-Date -Format 'yyyy-MM').txt -Tail 50
```

**Check Scheduled Task Status:**
```powershell
Get-ScheduledTask -TaskName "DailyDocumentsBackup"
Get-ScheduledTaskInfo -TaskName "DailyDocumentsBackup"
```

**View Last Task Run:**
```powershell
Get-ScheduledTask -TaskName "DailyDocumentsBackup" | Get-ScheduledTaskInfo |
    Select-Object LastRunTime, LastTaskResult, NextRunTime
```

**Manually Run Backup:**
```powershell
Start-ScheduledTask -TaskName "DailyDocumentsBackup"
```

**Disable Backup:**
```powershell
Disable-ScheduledTask -TaskName "DailyDocumentsBackup"
```

**Re-enable Backup:**
```powershell
Enable-ScheduledTask -TaskName "DailyDocumentsBackup"
```

### On Backup Server

**Run Management Tool (Interactive):**
```bash
/home/mist/backup-scripts/manage-backups.sh
```

**Command-Line Options:**
```bash
# List all backups
./manage-backups.sh list

# Clean old backups
./manage-backups.sh cleanup

# Verify backup integrity
./manage-backups.sh verify

# Check disk space
./manage-backups.sh disk

# Generate report
./manage-backups.sh report

# Monitor backup status
./manage-backups.sh monitor

# Run full maintenance
./manage-backups.sh maintenance
```

**View Logs:**
```bash
# Management logs
tail -f /home/mist/backup-logs/backup-management_$(date +%Y-%m).log

# Cron job logs
tail -f /home/mist/backup-logs/cron.log

# View latest report
cat /home/mist/backup-logs/backup-report_$(date +%Y-%m-%d).txt
```

**Check Cron Job:**
```bash
crontab -l | grep manage-backups
```

---

## 🔐 Security Features

1. **SSH Key Authentication**
   - No passwords stored in scripts
   - 4096-bit RSA encryption
   - Private key protected on Windows PC

2. **SFTP Protocol**
   - Encrypted file transfers
   - Secure authentication
   - No plaintext data transmission

3. **Access Control**
   - Scheduled task runs as SYSTEM
   - SSH keys have restricted permissions
   - Backup directory isolated

4. **Audit Trail**
   - Complete logging of all operations
   - Timestamped backup files
   - Transfer logs maintained

---

## 🛠️ Troubleshooting

### Backup Not Running

**Check scheduled task status:**
```powershell
Get-ScheduledTask -TaskName "DailyDocumentsBackup" | Select-Object State, LastRunTime
```

**Check task history:**
1. Open Event Viewer (`eventvwr.msc`)
2. Navigate to: Applications and Services Logs → Microsoft → Windows → TaskScheduler → Operational
3. Filter for Task ID: DailyDocumentsBackup

**Test manually:**
```powershell
C:\BackupScripts\backup-documents.ps1
```

### SSH Connection Issues

**Test SSH connection:**
```powershell
ssh -i $env:USERPROFILE\.ssh\id_rsa mist@10.72.200.91 "echo 'Connection successful'"
```

**Check SSH key permissions:**
```powershell
icacls $env:USERPROFILE\.ssh\id_rsa
```

**Re-add public key to server:**
```bash
# On backup server
cat ~/.ssh/authorized_keys
# Ensure your public key is present
```

### SFTP Transfer Failures

**Check WinSCP/PSFTP installation:**
```powershell
Test-Path "C:\Program Files (x86)\WinSCP\WinSCP.com"
Test-Path "C:\Program Files\PuTTY\psftp.exe"
```

**Install WinSCP if missing:**
```powershell
# Download from https://winscp.net/
# Or use Chocolatey:
choco install winscp
```

**View transfer logs:**
```powershell
Get-Content C:\BackupLogs\winscp_$(Get-Date -Format 'yyyy-MM-dd').log
```

### Disk Space Issues

**Check available space on Windows:**
```powershell
Get-PSDrive E | Select-Object Used, Free
```

**Check backup server space:**
```bash
df -h /home/mist/backups/windows-documents
```

**Manually clean old backups:**
```bash
./manage-backups.sh cleanup
```

### Compression Failures

**Check source directory:**
```powershell
Test-Path E:\Documents
Get-ChildItem E:\Documents -Recurse -ErrorAction SilentlyContinue |
    Measure-Object -Property Length -Sum
```

**Check for locked files:**
```powershell
# Close applications that might lock files
# Check Process Explorer for file handles
```

**Test compression manually:**
```powershell
Compress-Archive -Path E:\Documents -DestinationPath C:\Temp\test-backup.zip
```

---

## 🔄 Backup Recovery

### Restore Files from Backup

**List available backups:**
```bash
ssh mist@10.72.200.91
cd /home/mist/backups/windows-documents
ls -lh Documents_Backup_*.zip
```

**Download specific backup:**
```powershell
# Using SCP
scp mist@10.72.200.91:/home/mist/backups/windows-documents/Documents_Backup_2024-12-22_02-00-00.zip C:\Temp\

# Using WinSCP GUI or command line
```

**Extract backup:**
```powershell
Expand-Archive -Path C:\Temp\Documents_Backup_2024-12-22_02-00-00.zip -DestinationPath C:\Temp\Restored\
```

**Restore specific files:**
```powershell
# Extract only specific files
Add-Type -Assembly System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("C:\Temp\Documents_Backup_2024-12-22_02-00-00.zip")
$zip.Entries | Where-Object { $_.FullName -like "*important_file*" } | ForEach-Object {
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($_, "C:\Temp\Restored\$($_.Name)", $true)
}
$zip.Dispose()
```

---

## 📈 Performance Optimization

### For Large Documents Folders (>100GB)

1. **Enable Incremental Backups:**
   - Consider using rsync instead of full ZIP archives
   - Modify script to use differential backups

2. **Compression Settings:**
   ```powershell
   # In backup-documents.ps1, change compression level:
   $compressionLevel = [System.IO.Compression.CompressionLevel]::Fastest
   ```

3. **Network Optimization:**
   - Schedule backups during off-peak hours
   - Use compression on SFTP transfers
   - Consider bandwidth throttling

4. **Parallel Compression:**
   - Split large directories
   - Compress in parallel
   - Merge on server

---

## 🔔 Email Notifications (Optional)

### Configure Email Alerts on Backup Server

Edit `/home/mist/backup-scripts/manage-backups.sh`:

```bash
EMAIL_ALERTS="true"
ALERT_EMAIL="admin@example.com"
```

Install mail utility:
```bash
sudo apt-get install mailutils
# or
sudo yum install mailx
```

Configure SMTP (example for Gmail):
```bash
sudo nano /etc/ssmtp/ssmtp.conf
```

Add:
```
root=admin@example.com
mailhub=smtp.gmail.com:587
AuthUser=your-email@gmail.com
AuthPass=your-app-password
UseSTARTTLS=YES
```

---

## 📝 Maintenance Schedule

| Task | Frequency | Command |
|------|-----------|---------|
| Backup Creation | Daily 2:00 AM | Automatic (Task Scheduler) |
| Old Backup Cleanup | Daily 3:00 AM | Automatic (cron) |
| Backup Verification | Weekly | `./manage-backups.sh verify` |
| Disk Space Check | Weekly | `./manage-backups.sh disk` |
| Generate Report | Monthly | `./manage-backups.sh report` |
| Test Restore | Quarterly | Manual |

---

## ✅ Verification Checklist

After installation, verify:

- [ ] SSH key authentication works without password
- [ ] Manual backup script runs successfully
- [ ] Backup file appears on server
- [ ] Scheduled task is enabled and configured
- [ ] Task runs at specified time (wait for next scheduled run or test manually)
- [ ] Logs are being created on both systems
- [ ] Old backups are being cleaned up (wait 31+ days or test manually)
- [ ] Cron job is configured on server
- [ ] Test file restoration works

---

## 🆘 Support and Contact

**Log Locations:**
- Windows: `C:\BackupLogs\`
- Server: `/home/mist/backup-logs/`

**Configuration Files:**
- Windows Task: `taskschd.msc` → DailyDocumentsBackup
- Backup Script: `C:\BackupScripts\backup-documents.ps1`
- Server Script: `/home/mist/backup-scripts/manage-backups.sh`
- Cron: `crontab -l` on server

---

## 📄 License and Credits

This backup solution uses:
- PowerShell for Windows automation
- OpenSSH/WinSCP for secure transfers
- Bash scripts for Linux management
- Standard Windows Task Scheduler

All scripts are provided as-is for your backup automation needs.

---

**Created:** December 2024
**Version:** 1.0
**Last Updated:** $(date)
