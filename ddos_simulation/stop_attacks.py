#!/usr/bin/env python3
"""
Stop Running DDoS Attacks
Utility script to stop all running attacks on Red Team VMs
"""

import paramiko
import os
from dotenv import load_dotenv

load_dotenv()

SSH_USERNAME = os.getenv('SSH_USERNAME', 'mist')
SSH_PASSWORD = os.getenv('SSH_PASSWORD')
SSH_KEY_PATH = os.path.expanduser(os.getenv('SSH_KEY_PATH', '~/.ssh/cyber_range_key') or '')
SSH_PORT = int(os.getenv('SSH_PORT', '22'))

# Red Team VMs
RED_TEAM_VMS = [
    "10.72.200.62",  # generator
    "10.72.200.64",  # botnet1
    "10.72.200.65",  # botnet2
]

def stop_all_attack_processes(hostname: str):
    """
    Stop all DDoS attack processes on a VM
    """
    print(f"\n🛑 Stopping attacks on {hostname}...")

    # Kill commands for different tools
    kill_commands = [
        "sudo pkill -9 -f hping3",
        "sudo pkill -9 -f slowloris",
        "sudo pkill -9 -f goldeneye",
        "sudo pkill -9 -f scapy_ddos",
        "sudo pkill -9 -f hulk",
    ]

    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        connect_kwargs = dict(
            hostname=hostname,
            port=SSH_PORT,
            username=SSH_USERNAME,
            timeout=10,
            allow_agent=True,
            look_for_keys=True,
        )

        if SSH_KEY_PATH and os.path.exists(SSH_KEY_PATH):
            connect_kwargs["key_filename"] = SSH_KEY_PATH
        elif SSH_PASSWORD:
            connect_kwargs["password"] = SSH_PASSWORD

        ssh.connect(**connect_kwargs)

        for cmd in kill_commands:
            stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
            exit_code = stdout.channel.recv_exit_status()
            # exit_code 1 means no process found, which is OK
            if exit_code == 0:
                print(f"   ✅ Stopped: {cmd}")
            elif exit_code == 1:
                print(f"   ℹ️  No process: {cmd}")
            else:
                stderr_text = stderr.read().decode('utf-8')
                print(f"   ⚠️  Error: {cmd} - {stderr_text}")

        ssh.close()
        print(f"✅ Completed on {hostname}")

    except Exception as e:
        print(f"❌ Failed to connect to {hostname}: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("🛑 EMERGENCY STOP - All DDoS Attacks")
    print("=" * 60)

    for vm_ip in RED_TEAM_VMS:
        stop_all_attack_processes(vm_ip)

    print("\n" + "=" * 60)
    print("✅ All attack processes stopped!")
    print("=" * 60)
