# ================================================================
# Windows Documents Backup Script
# ================================================================
# Purpose: Automatically backup E:\Documents to remote server via SFTP
# Source: E:\Documents on 10.72.200.81 (Windows PC)
# Destination: 10.72.200.91 (Backup Server)
# Protocol: SFTP (Secure File Transfer Protocol)
# ================================================================

param(
    [string]$BackupSource = "E:\Documents",
    [string]$RemoteHost = "10.72.200.91",
    [string]$RemoteUser = "mist",
    [string]$RemoteBackupPath = "/home/mist/backups/windows-documents",
    [string]$LocalTempPath = "$env:TEMP\backup-temp",
    [int]$RetentionDays = 30
)

# Configuration
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BackupFileName = "Documents_Backup_$Timestamp.zip"
$LocalBackupPath = Join-Path $LocalTempPath $BackupFileName
$LogPath = "C:\BackupLogs"
$LogFile = Join-Path $LogPath "backup_log_$(Get-Date -Format 'yyyy-MM').txt"

# Ensure log directory exists
if (-not (Test-Path $LogPath)) {
    New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
}

# Function to write logs
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $LogMessage = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Message"
    Write-Host $LogMessage
    Add-Content -Path $LogFile -Value $LogMessage
}

# Function to send email notification (optional - configure as needed)
function Send-BackupNotification {
    param([string]$Status, [string]$Details)
    # Configure your email settings here if needed
    # This is a placeholder for email notifications
    Write-Log "Backup Status: $Status - $Details" "NOTIFICATION"
}

# Start backup process
Write-Log "========================================" "INFO"
Write-Log "Starting backup process" "INFO"
Write-Log "Source: $BackupSource" "INFO"
Write-Log "Destination: ${RemoteUser}@${RemoteHost}:${RemoteBackupPath}" "INFO"

# Check if source directory exists
if (-not (Test-Path $BackupSource)) {
    Write-Log "ERROR: Source directory does not exist: $BackupSource" "ERROR"
    Send-BackupNotification "FAILED" "Source directory not found"
    exit 1
}

# Create temporary directory
if (-not (Test-Path $LocalTempPath)) {
    New-Item -ItemType Directory -Path $LocalTempPath -Force | Out-Null
    Write-Log "Created temporary directory: $LocalTempPath" "INFO"
}

# Compress the Documents folder
try {
    Write-Log "Starting compression of $BackupSource" "INFO"

    # Use .NET compression for better performance and progress tracking
    Add-Type -Assembly System.IO.Compression.FileSystem
    $compressionLevel = [System.IO.Compression.CompressionLevel]::Optimal

    # Calculate total size before compression
    $SourceSize = (Get-ChildItem -Path $BackupSource -Recurse -File | Measure-Object -Property Length -Sum).Sum
    $SourceSizeGB = [math]::Round($SourceSize / 1GB, 2)
    Write-Log "Source data size: $SourceSizeGB GB" "INFO"

    [System.IO.Compression.ZipFile]::CreateFromDirectory($BackupSource, $LocalBackupPath, $compressionLevel, $false)

    $CompressedSize = (Get-Item $LocalBackupPath).Length
    $CompressedSizeGB = [math]::Round($CompressedSize / 1GB, 2)
    $CompressionRatio = [math]::Round((1 - ($CompressedSize / $SourceSize)) * 100, 2)

    Write-Log "Compression completed successfully" "INFO"
    Write-Log "Compressed size: $CompressedSizeGB GB (${CompressionRatio}% compression)" "INFO"

} catch {
    Write-Log "ERROR: Compression failed - $($_.Exception.Message)" "ERROR"
    Send-BackupNotification "FAILED" "Compression error: $($_.Exception.Message)"
    exit 1
}

# Transfer via SFTP using WinSCP or PSFTP
try {
    Write-Log "Starting SFTP transfer to $RemoteHost" "INFO"

    # Check if WinSCP is available
    $WinSCPPath = "C:\Program Files (x86)\WinSCP\WinSCP.com"

    if (Test-Path $WinSCPPath) {
        Write-Log "Using WinSCP for transfer" "INFO"

        # Create WinSCP script
        $WinSCPScript = @"
option batch abort
option confirm off
open sftp://${RemoteUser}@${RemoteHost}/ -privatekey=C:\Users\$env:USERNAME\.ssh\id_rsa
option transfer binary
mkdir -p $RemoteBackupPath
cd $RemoteBackupPath
put "$LocalBackupPath"
exit
"@

        $ScriptPath = Join-Path $LocalTempPath "winscp_script.txt"
        $WinSCPScript | Out-File -FilePath $ScriptPath -Encoding ASCII

        # Execute WinSCP
        $process = Start-Process -FilePath $WinSCPPath -ArgumentList "/script=`"$ScriptPath`" /log=`"$LogPath\winscp_$(Get-Date -Format 'yyyy-MM-dd').log`"" -Wait -PassThru -NoNewWindow

        if ($process.ExitCode -eq 0) {
            Write-Log "SFTP transfer completed successfully" "INFO"
        } else {
            throw "WinSCP transfer failed with exit code $($process.ExitCode)"
        }

        Remove-Item $ScriptPath -Force

    } else {
        # Fallback to PSFTP (PuTTY SFTP)
        Write-Log "WinSCP not found, using PSFTP" "INFO"

        $PSFTPPath = "C:\Program Files\PuTTY\psftp.exe"

        if (-not (Test-Path $PSFTPPath)) {
            throw "Neither WinSCP nor PSFTP found. Please install WinSCP or PuTTY."
        }

        # Create PSFTP batch commands
        $PSFTPCommands = @"
cd $RemoteBackupPath
put "$LocalBackupPath"
bye
"@

        $BatchPath = Join-Path $LocalTempPath "psftp_commands.txt"
        $PSFTPCommands | Out-File -FilePath $BatchPath -Encoding ASCII

        # Execute PSFTP
        $process = Start-Process -FilePath $PSFTPPath -ArgumentList "-i C:\Users\$env:USERNAME\.ssh\id_rsa -b `"$BatchPath`" ${RemoteUser}@${RemoteHost}" -Wait -PassThru -NoNewWindow

        if ($process.ExitCode -eq 0) {
            Write-Log "SFTP transfer completed successfully" "INFO"
        } else {
            throw "PSFTP transfer failed with exit code $($process.ExitCode)"
        }

        Remove-Item $BatchPath -Force
    }

} catch {
    Write-Log "ERROR: SFTP transfer failed - $($_.Exception.Message)" "ERROR"
    Send-BackupNotification "FAILED" "Transfer error: $($_.Exception.Message)"

    # Clean up local backup file
    if (Test-Path $LocalBackupPath) {
        Remove-Item $LocalBackupPath -Force
    }
    exit 1
}

# Clean up local temporary backup
try {
    Remove-Item $LocalBackupPath -Force
    Write-Log "Cleaned up local temporary backup file" "INFO"
} catch {
    Write-Log "WARNING: Could not remove temporary backup file: $($_.Exception.Message)" "WARNING"
}

# Remote cleanup - remove old backups (keep last 30 days)
try {
    Write-Log "Initiating remote cleanup of old backups (retention: $RetentionDays days)" "INFO"

    # SSH command to clean up old backups on remote server
    $SSHPath = "C:\Program Files\PuTTY\plink.exe"
    if (-not (Test-Path $SSHPath)) {
        $SSHPath = "C:\Windows\System32\OpenSSH\ssh.exe"
    }

    if (Test-Path $SSHPath) {
        $CleanupCommand = "find $RemoteBackupPath -name 'Documents_Backup_*.zip' -type f -mtime +$RetentionDays -delete"
        $process = Start-Process -FilePath $SSHPath -ArgumentList "-i C:\Users\$env:USERNAME\.ssh\id_rsa ${RemoteUser}@${RemoteHost} `"$CleanupCommand`"" -Wait -PassThru -NoNewWindow

        if ($process.ExitCode -eq 0) {
            Write-Log "Remote cleanup completed successfully" "INFO"
        } else {
            Write-Log "WARNING: Remote cleanup may have failed" "WARNING"
        }
    }
} catch {
    Write-Log "WARNING: Remote cleanup error - $($_.Exception.Message)" "WARNING"
}

# Final summary
Write-Log "Backup process completed successfully" "INFO"
Write-Log "Backup file: $BackupFileName" "INFO"
Write-Log "========================================" "INFO"

Send-BackupNotification "SUCCESS" "Backup completed: $BackupFileName"

exit 0
