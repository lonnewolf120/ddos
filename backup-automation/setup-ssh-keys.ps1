# ================================================================
# SSH Key Setup Script for Windows Backup System
# ================================================================
# Purpose: Configure SSH key authentication for automated backups
# Run this script on the Windows PC (10.72.200.81)
# ================================================================

param(
    [string]$RemoteHost = "10.72.200.91",
    [string]$RemoteUser = "mist",
    [string]$RemotePassword = "Cyber#Range"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SSH Key Setup for Backup Automation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if OpenSSH is installed
$OpenSSHClient = Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Client*'

if ($OpenSSHClient.State -ne "Installed") {
    Write-Host "Installing OpenSSH Client..." -ForegroundColor Yellow
    try {
        Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
        Write-Host "OpenSSH Client installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: Failed to install OpenSSH Client - $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Please install OpenSSH Client manually from Windows Settings" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "OpenSSH Client is already installed" -ForegroundColor Green
}

# Create .ssh directory if it doesn't exist
$SSHDir = "$env:USERPROFILE\.ssh"
if (-not (Test-Path $SSHDir)) {
    New-Item -ItemType Directory -Path $SSHDir -Force | Out-Null
    Write-Host "Created .ssh directory at $SSHDir" -ForegroundColor Green
}

# Generate SSH key pair if not exists
$SSHKeyPath = "$SSHDir\id_rsa"
if (-not (Test-Path $SSHKeyPath)) {
    Write-Host "Generating SSH key pair..." -ForegroundColor Yellow

    # Generate key without passphrase for automation
    ssh-keygen -t rsa -b 4096 -f $SSHKeyPath -N '""' -C "backup-automation@10.72.200.81"

    if (Test-Path $SSHKeyPath) {
        Write-Host "SSH key pair generated successfully" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Failed to generate SSH key pair" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "SSH key pair already exists at $SSHKeyPath" -ForegroundColor Green
}

# Read the public key
$PublicKey = Get-Content "$SSHKeyPath.pub"
Write-Host "`nPublic Key:" -ForegroundColor Cyan
Write-Host $PublicKey -ForegroundColor White

# Copy public key to remote server
Write-Host "`nCopying public key to remote server..." -ForegroundColor Yellow
Write-Host "You may be prompted for the password: $RemotePassword" -ForegroundColor Yellow

# Create a temporary script to add the key
$TempScript = @"
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo '$PublicKey' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
echo 'SSH key added successfully'
"@

# Try to copy the key using ssh-copy-id equivalent
try {
    # For Windows, we'll use a PowerShell approach
    $SecurePassword = ConvertTo-SecureString $RemotePassword -AsPlainText -Force

    # Method 1: Using SSH and password (requires sshpass or plink)
    Write-Host "Attempting to add public key to remote server..." -ForegroundColor Yellow

    # Create a temporary batch file for plink if available
    $PlinkPath = "C:\Program Files\PuTTY\plink.exe"

    if (Test-Path $PlinkPath) {
        # Using PuTTY's plink
        $process = Start-Process -FilePath $PlinkPath -ArgumentList "-batch -pw `"$RemotePassword`" ${RemoteUser}@${RemoteHost} `"$TempScript`"" -Wait -PassThru -NoNewWindow

        if ($process.ExitCode -eq 0) {
            Write-Host "Public key copied successfully using plink" -ForegroundColor Green
        } else {
            throw "plink failed with exit code $($process.ExitCode)"
        }
    } else {
        # Manual instructions if automated copy fails
        Write-Host "`nAutomated key copy not available. Please run the following commands manually on the remote server:" -ForegroundColor Yellow
        Write-Host "`n1. SSH to the remote server:" -ForegroundColor Cyan
        Write-Host "   ssh ${RemoteUser}@${RemoteHost}" -ForegroundColor White
        Write-Host "`n2. Run these commands:" -ForegroundColor Cyan
        Write-Host "   mkdir -p ~/.ssh" -ForegroundColor White
        Write-Host "   chmod 700 ~/.ssh" -ForegroundColor White
        Write-Host "   nano ~/.ssh/authorized_keys" -ForegroundColor White
        Write-Host "`n3. Add this public key to the file:" -ForegroundColor Cyan
        Write-Host "   $PublicKey" -ForegroundColor White
        Write-Host "`n4. Save and set permissions:" -ForegroundColor Cyan
        Write-Host "   chmod 600 ~/.ssh/authorized_keys" -ForegroundColor White
        Write-Host "`nPress Enter after completing these steps..." -ForegroundColor Yellow
        Read-Host
    }
} catch {
    Write-Host "WARNING: Automated key copy failed - $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "`nPlease manually copy the public key to the remote server:" -ForegroundColor Yellow
    Write-Host "1. Copy the public key displayed above" -ForegroundColor Cyan
    Write-Host "2. SSH to ${RemoteUser}@${RemoteHost}" -ForegroundColor Cyan
    Write-Host "3. Add it to ~/.ssh/authorized_keys" -ForegroundColor Cyan
    Write-Host "`nPress Enter after completing these steps..." -ForegroundColor Yellow
    Read-Host
}

# Test SSH connection
Write-Host "`nTesting SSH connection..." -ForegroundColor Yellow
$TestResult = ssh -i $SSHKeyPath -o StrictHostKeyChecking=no -o BatchMode=yes ${RemoteUser}@${RemoteHost} "echo 'Connection successful'"

if ($LASTEXITCODE -eq 0) {
    Write-Host "SSH key authentication is working correctly!" -ForegroundColor Green
} else {
    Write-Host "WARNING: SSH key authentication test failed" -ForegroundColor Red
    Write-Host "Please verify the key was added correctly on the remote server" -ForegroundColor Yellow
}

# Create the backup directory on remote server
Write-Host "`nCreating backup directory on remote server..." -ForegroundColor Yellow
ssh -i $SSHKeyPath ${RemoteUser}@${RemoteHost} "mkdir -p /home/mist/backups/windows-documents && chmod 755 /home/mist/backups/windows-documents"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup directory created successfully" -ForegroundColor Green
} else {
    Write-Host "WARNING: Could not create backup directory" -ForegroundColor Yellow
}

# Configure SSH config file for easier connection
$SSHConfig = @"

# Backup Server Configuration
Host backup-server
    HostName $RemoteHost
    User $RemoteUser
    IdentityFile $SSHKeyPath
    StrictHostKeyChecking no
    ServerAliveInterval 60
    ServerAliveCountMax 3
"@

$ConfigPath = "$SSHDir\config"
Add-Content -Path $ConfigPath -Value $SSHConfig
Write-Host "`nSSH config file updated at $ConfigPath" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "SSH Key Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nYou can now use: ssh backup-server" -ForegroundColor Cyan
Write-Host "to connect without a password" -ForegroundColor Cyan
