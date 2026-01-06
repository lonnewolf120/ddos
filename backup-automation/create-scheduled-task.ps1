# ================================================================
# Scheduled Task Creation Script
# ================================================================
# Purpose: Create a Windows Task Scheduler task for daily backups
# Run this script with Administrator privileges
# ================================================================

param(
    [string]$BackupScriptPath = "C:\BackupScripts\backup-documents.ps1",
    [string]$TaskName = "DailyDocumentsBackup",
    [string]$BackupTime = "02:00",  # 2:00 AM
    [string]$TaskDescription = "Daily backup of E:\Documents to remote server 10.72.200.91"
)

# Check if running as Administrator
$IsAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $IsAdmin) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Please right-click and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Creating Scheduled Backup Task" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Create backup scripts directory if it doesn't exist
$ScriptDir = Split-Path $BackupScriptPath -Parent
if (-not (Test-Path $ScriptDir)) {
    New-Item -ItemType Directory -Path $ScriptDir -Force | Out-Null
    Write-Host "Created directory: $ScriptDir" -ForegroundColor Green
}

# Copy the backup script to the permanent location
$SourceScript = "$PSScriptRoot\backup-documents.ps1"
if (Test-Path $SourceScript) {
    Copy-Item $SourceScript -Destination $BackupScriptPath -Force
    Write-Host "Copied backup script to: $BackupScriptPath" -ForegroundColor Green
} else {
    Write-Host "WARNING: Source backup script not found at $SourceScript" -ForegroundColor Yellow
    Write-Host "Please ensure backup-documents.ps1 is in the same directory" -ForegroundColor Yellow
}

# Remove existing task if it exists
$ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($ExistingTask) {
    Write-Host "Removing existing task: $TaskName" -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Create the scheduled task action
$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$BackupScriptPath`""

# Create the scheduled task trigger (daily at specified time)
$Trigger = New-ScheduledTaskTrigger -Daily -At $BackupTime

# Create additional trigger for system startup (with 5 minute delay)
$StartupTrigger = New-ScheduledTaskTrigger -AtStartup
$StartupTrigger.Delay = "PT5M"  # 5 minute delay

# Combine triggers
$Triggers = @($Trigger, $StartupTrigger)

# Create task settings
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 4) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 10)

# Create the principal (run with highest privileges)
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# Register the scheduled task
try {
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $Action `
        -Trigger $Triggers `
        -Settings $Settings `
        -Principal $Principal `
        -Description $TaskDescription

    Write-Host "`nScheduled task created successfully!" -ForegroundColor Green
    Write-Host "Task Name: $TaskName" -ForegroundColor Cyan
    Write-Host "Schedule: Daily at $BackupTime + At startup (with 5 min delay)" -ForegroundColor Cyan
    Write-Host "Script: $BackupScriptPath" -ForegroundColor Cyan
} catch {
    Write-Host "ERROR: Failed to create scheduled task - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Enable task history
Write-Host "`nEnabling task history..." -ForegroundColor Yellow
wevtutil set-log Microsoft-Windows-TaskScheduler/Operational /enabled:true

# Test the task
Write-Host "`nWould you like to run a test backup now? (Y/N): " -ForegroundColor Yellow -NoNewline
$Response = Read-Host

if ($Response -eq 'Y' -or $Response -eq 'y') {
    Write-Host "Starting test backup..." -ForegroundColor Yellow
    Start-ScheduledTask -TaskName $TaskName

    Write-Host "Test backup initiated. Check C:\BackupLogs for results." -ForegroundColor Cyan
    Write-Host "You can monitor the task in Task Scheduler." -ForegroundColor Cyan
}

# Display task information
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Task Configuration Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nTo view the task:" -ForegroundColor Cyan
Write-Host "1. Open Task Scheduler (taskschd.msc)" -ForegroundColor White
Write-Host "2. Look for: $TaskName" -ForegroundColor White
Write-Host "`nTo view logs:" -ForegroundColor Cyan
Write-Host "Check: C:\BackupLogs\" -ForegroundColor White
Write-Host "`nTo manually run the backup:" -ForegroundColor Cyan
Write-Host "Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
Write-Host "`nTo disable the backup:" -ForegroundColor Cyan
Write-Host "Disable-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
Write-Host "`nTo remove the backup task:" -ForegroundColor Cyan
Write-Host "Unregister-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
