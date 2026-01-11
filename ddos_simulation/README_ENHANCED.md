# DDoS Simulation with CPU/Memory Stress Testing

Enhanced DDoS simulation framework that combines network flood attacks with target stress testing to create realistic resource exhaustion scenarios for cyber range training.

## 🎯 Features

### Network Attack Types
- **HTTP Flood (GoldenEye)**: Keep-alive HTTP connections with multiple workers
- **Heavy hping3 Attacks**: SYN/UDP floods with large payloads to maximize CPU/memory impact
- **Distributed Attacks**: Coordinated attacks from multiple Red Team VMs
- **Protocol Variants**: TCP SYN flood, UDP flood, HTTP GET/POST flood

### Target Stress Testing
- **CPU Stress**: Configurable CPU load using stress-ng with multiple workers
- **Memory Stress**: Memory allocation stress with configurable size and workers
- **Combined Stress**: Simultaneous network flood + CPU/memory stress for realistic DoS simulation

### Monitoring & Metrics
- **Real-time Metrics**: CPU usage, memory usage, load average sampling during attacks
- **Background Monitoring**: Non-blocking metrics collection with configurable intervals
- **Metrics Export**: JSON report export with attack correlation and timestamps
- **SSH-based Collection**: Remote metrics gathering from Blue Team targets

### Testing Infrastructure
- **Unit Tests**: Comprehensive test suite with SSH mocking for offline validation
- **CLI Interface**: Command-line tool for easy attack combination selection
- **Safety Features**: Attack duration limits, emergency stop functionality
- **Documentation**: Detailed API documentation and usage examples

## 🔧 Installation & Setup

### Prerequisites
```bash
# On Red Team VMs (192.168.60.62, 64, 65 - OPNsense LAN IPs)
sudo apt-get update
sudo apt-get install -y hping3 stress-ng

# On control machine
cd /home/iftee/Documents/Projects/attackers/ddos/ddos_simulation
pip3 install -r requirements.txt
```

### Dependencies
```
paramiko>=3.0.0      # SSH remote execution
scapy>=2.4.5         # Packet crafting
stress-ng            # CPU/memory stress testing
hping3               # Network flooding
```

## 🚀 Quick Start

### 1. Command Line Interface (Recommended)
```bash
# HTTP flood + CPU stress on team1 for 3 minutes
python3 run_cli_attacks.py --attack-type http_flood --target team1 --duration 180 --cpu-stress --metrics

# Heavy hping attack with full stress testing
python3 run_cli_attacks.py --attack-type hping_heavy --target team2 --duration 240 --cpu-stress --memory-stress --metrics

# Quick 30-second test
python3 run_cli_attacks.py --quick-test

# List all available options
python3 run_cli_attacks.py --list-options
```

### 2. Python API
```python
from distributed_ddos_executor import DDoSOrchestrator

orchestrator = DDoSOrchestrator()

# HTTP flood attack
result = orchestrator.execute_goldeneye_attack(
    attacker_vm="192.168.60.62",  # Attack Generator (OPNsense LAN)
    target_ip="20.10.40.11",      # Blue Team 1 (OPNsense LAN)
    target_port=9080,
    duration=180,
    workers=50,
    connections=100,
    background=True
)

# CPU stress on target
cpu_result = orchestrator.execute_target_cpu_stress(
    target_ip="10.72.200.51",
    duration=180,
    cpu_workers=4,
    cpu_load=80,
    background=True
)

# Real-time metrics monitoring
import threading
monitoring_thread = threading.Thread(
    target=orchestrator.monitor_target_metrics,
    args=("20.10.40.11", 5)  # Blue Team 1, sample every 5 seconds
)
monitoring_thread.daemon = True
monitoring_thread.start()
```

## 📊 Attack Types & Options

### HTTP Flood (GoldenEye)
```bash
# Basic HTTP flood
python3 run_cli_attacks.py --attack-type http_flood --target team1 --duration 300

# HTTP flood with 100 workers, 200 connections each
python3 run_cli_attacks.py --attack-type http_flood --target team1 --duration 300 --workers 100 --connections 200
```

**Characteristics:**
- Keep-alive HTTP connections to exhaust server resources
- Configurable worker count and connections per worker
- Targets web applications (DVWA, bWAPP, Juice Shop)

### Heavy hping3 Attack
```bash
# SYN flood with large payloads
python3 run_cli_attacks.py --attack-type hping_heavy --target team2 --duration 240

# Maximum impact hping attack
python3 run_cli_attacks.py --attack-type hping_heavy --target team2 --duration 300 --payload-size 1400 --rate flood
```

**Characteristics:**
- TCP SYN flood with large packet payloads (up to 1400 bytes)
- Flood mode for maximum packet rate
- Designed to overload CPU and memory on target

### Target Stress Testing
```bash
# CPU stress: 8 workers at 90% load
python3 run_cli_attacks.py --attack-type http_flood --target team1 --duration 300 --cpu-stress --cpu-workers 8 --cpu-load 90

# Memory stress: 4 workers allocating 2GB each
python3 run_cli_attacks.py --attack-type hping_heavy --target team2 --duration 300 --memory-stress --memory-workers 4 --memory-size 2G

# Combined network + CPU + memory stress
python3 run_cli_attacks.py --attack-type distributed_http --target team3 --duration 300 --cpu-stress --memory-stress --metrics
```

**Stress Options:**
- `--cpu-stress`: CPU intensive calculations using stress-ng
- `--memory-stress`: Memory allocation/deallocation cycles
- `--cpu-workers N`: Number of CPU stress processes
- `--cpu-load N`: Target CPU load percentage (1-100)
- `--memory-workers N`: Number of memory stress processes
- `--memory-size SIZE`: Memory allocation per worker (1G, 512M, etc.)

### Distributed Attacks
```bash
# Coordinated attack from 3 VMs
python3 run_cli_attacks.py --attack-type distributed_http --target team1 --duration 300 --num-attackers 3

# Distributed attack with target stress
python3 run_cli_attacks.py --attack-type distributed_http --target team2 --duration 300 --num-attackers 2 --cpu-stress --memory-stress
```

**Features:**
- Simultaneous attacks from multiple Red Team VMs
- Configurable number of attacking VMs (1-5)
- Automatic VM selection and coordination

## 📈 Metrics & Monitoring

### Real-time Metrics Collection
```bash
# Enable metrics with 5-second sampling
python3 run_cli_attacks.py --attack-type http_flood --target team1 --duration 300 --metrics --metrics-interval 5
```

**Collected Metrics:**
- **CPU Usage**: Real-time CPU utilization percentage
- **Memory Usage**: RAM utilization percentage
- **Load Average**: System load (1min, 5min, 15min)
- **Timestamp**: ISO 8601 timestamp for each sample
- **Target**: IP address of monitored system

### Metrics Export
```python
# Export metrics to JSON report
report_path = "/tmp/attack_metrics.json"
success = orchestrator.export_metrics_report(report_path)

# Example report structure:
{
    "export_info": {
        "timestamp": "2025-01-15T14:30:00",
        "target": "20.10.40.11",
        "export_version": "1.0"
    },
    "metrics_summary": {
        "total_samples": 60,
        "duration_seconds": 300,
        "avg_cpu_usage": 78.5,
        "max_cpu_usage": 95.2,
        "avg_memory_usage": 65.3,
        "max_memory_usage": 82.1
    },
    "detailed_metrics": [
        {
            "timestamp": "2025-01-15T14:25:00",
            "cpu_usage": 45.2,
            "memory_usage": 58.7,
            "load_average": "2.14 1.98 1.76"
        }
        // ... more samples
    ]
}
```

## 🧪 Testing & Validation

### Unit Tests with SSH Mocking
```bash
# Run comprehensive test suite
python3 test_ddos_orchestrator.py

# Example output:
Running DDoS Orchestrator Unit Tests with SSH Mocking
============================================================
test_execute_goldeneye_attack ... ok
test_execute_hping_heavy_attack ... ok
test_execute_target_cpu_stress ... ok
test_execute_target_memory_stress ... ok
test_get_target_metrics ... ok
test_export_metrics_report ... ok
test_distributed_attack_execution ... ok
test_combined_network_and_stress_attack ... ok
test_metrics_monitoring_integration ... ok

============================================================
Tests run: 15
Failures: 0
Errors: 0
Success rate: 100.0%
```

**Test Coverage:**
- SSH command execution with paramiko mocking
- Attack orchestration logic validation
- Metrics collection and export functionality
- Error handling and timeout scenarios
- Distributed attack coordination
- Combined attack scenarios

### Manual Testing
```bash
# Test individual components
python3 -c "
from distributed_ddos_executor import DDoSOrchestrator
orchestrator = DDoSOrchestrator()
metrics = orchestrator.get_target_metrics('20.10.40.11')  # Blue Team 1
print(f'Current metrics: {metrics}')
"

# Test SSH connectivity
ssh mist@20.10.40.11 "top -bn1 | grep 'Cpu(s)'"   # Blue Team 1
```

## 🛡️ Safety & Security

### Built-in Safety Features
- **Duration Limits**: Maximum attack duration enforcement
- **Emergency Stop**: `stop_attacks.py` script to terminate all running attacks
- **Target Validation**: IP address validation and team mapping
- **Background Mode**: Non-blocking execution with process tracking
- **Isolated Environment**: Designed for cyber range use only

### Emergency Procedures
```bash
# Stop all attacks immediately
python3 stop_attacks.py

# Kill specific attack types
ssh mist@192.168.60.62 "sudo pkill -f goldeneye"      # Red Team Generator
ssh mist@20.10.40.11 "sudo pkill -f stress-ng"        # Blue Team 1

# Reset target system
ssh mist@20.10.40.11 "sudo systemctl restart apache2 nginx"
```

### Security Considerations
⚠️ **WARNING**: This framework is designed for controlled cyber range environments only
- Never use against production systems
- Ensure proper network isolation
- Verify SSH access and credentials before testing
- Monitor system resources to prevent hardware damage
- Use appropriate attack durations to avoid system crashes

## 📁 File Structure
```
ddos_simulation/
├── distributed_ddos_executor.py    # Main orchestrator class
├── run_cli_attacks.py              # CLI interface for attack selection
├── run_new_attacks.py              # Example attack combinations
├── test_ddos_orchestrator.py       # Unit tests with SSH mocking
├── stop_attacks.py                 # Emergency stop utility
├── config.py                       # Configuration and credentials
├── README.md                       # This documentation
└── requirements.txt                # Python dependencies
```

## 🔗 Integration

### Cyber Range Integration
This framework integrates with the broader cyber range ecosystem:
- **Red Team VMs**: 192.168.60.62 (Generator), 192.168.60.64-65 (Botnets) - OPNsense LAN
- **Blue Team Targets**: 20.10.40.11 (Team1), 192.168.50.11 (Team2), 20.10.60.11 (Team3) - OPNsense LAN
- **Monitoring Tools**: Wazuh SIEM, Suricata IDS, ELK stack
- **Applications**: DVWA (9080), bWAPP (9090), Juice Shop (3000)

### Dataset Generation
Perfect for generating realistic network intrusion datasets:
- **CIC IDS 2018 Style**: Multi-attack scenarios with labeled data
- **PCAP Collection**: Network packet captures during attacks
- **Feature Extraction**: Compatible with CICFlowMeter for ML features
- **Behavioral Analysis**: CPU/memory patterns during DoS conditions

## 🚀 Advanced Usage

### Custom Attack Combinations
```python
# Create complex multi-stage attacks
orchestrator = DDoSOrchestrator()

# Stage 1: Network reconnaissance (nmap scan)
recon_result = orchestrator.execute_ssh_command(
    hostname="192.168.60.62",    # Red Team Generator (OPNsense LAN)
    command="nmap -sS 20.10.40.11", # Blue Team 1 (OPNsense LAN)
    timeout=60
)

# Stage 2: HTTP flood + CPU stress
http_result = orchestrator.execute_goldeneye_attack(...)
cpu_result = orchestrator.execute_target_cpu_stress(...)

# Stage 3: Escalation to distributed attack
distributed_ids = orchestrator.execute_distributed_attack(...)

# Monitor throughout
monitoring_thread = threading.Thread(...)
```

### Metrics Analysis
```python
# Load and analyze metrics data
import json
with open('/tmp/attack_metrics.json', 'r') as f:
    data = json.load(f)

# Calculate attack effectiveness
metrics = data['detailed_metrics']
baseline_cpu = metrics[0]['cpu_usage']
peak_cpu = max(m['cpu_usage'] for m in metrics)
cpu_increase = peak_cpu - baseline_cpu

print(f"CPU increase during attack: {cpu_increase}%")
```

## 📚 References

- [stress-ng Documentation](https://wiki.ubuntu.com/Kernel/Reference/stress-ng)
- [hping3 Manual](https://linux.die.net/man/8/hping3)
- [CIC IDS 2018 Dataset](https://www.unb.ca/cic/datasets/ids-2018.html)
- [paramiko SSH Library](https://www.paramiko.org/)

---

**Last Updated**: January 15, 2025
**Version**: 2.0 - CPU/Memory Stress Testing + CLI Interface + Unit Tests
