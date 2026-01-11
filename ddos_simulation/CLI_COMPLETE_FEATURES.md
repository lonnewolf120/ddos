# DDoS Attack CLI - Complete Feature Guide

## 🚀 Overview
The DDoS Attack Orchestrator CLI provides comprehensive command-line access to all distributed attack capabilities with realistic packet statistics, stress testing, and detailed monitoring.

## ✨ ALL IMPLEMENTED FEATURES

### 🌐 Network Attack Types

#### 1. HTTP Flood (`http_flood`)
- **Tool**: GoldenEye HTTP flood
- **Rate**: 1,000-5,000 HTTP requests/sec
- **Packet Size**: ~1,500 bytes per request
- **Bandwidth**: 12-60 Mbps
- **Protocol**: HTTP/TCP with keep-alive connections
- **Use Case**: Web application stress testing
- **Command**: `--attack-type http_flood`

#### 2. Heavy hping Flood (`hping_heavy`)
- **Tool**: hping3 with maximum payload
- **Rate**: 10,000-50,000 packets/sec
- **Packet Size**: 1,400 bytes (maximum payload)
- **Bandwidth**: 112-560 Mbps
- **Protocol**: TCP/UDP
- **Use Case**: High-bandwidth network saturation
- **Command**: `--attack-type hping_heavy`

#### 3. SYN Flood (`syn_flood`)
- **Tool**: hping3 SYN flood
- **Rate**: 30,000-100,000 SYN packets/sec
- **Packet Size**: 40-60 bytes (TCP SYN header only)
- **Bandwidth**: 10-50 Mbps
- **Protocol**: TCP SYN
- **Use Case**: Connection exhaustion attacks
- **Command**: `--attack-type syn_flood`

#### 4. UDP Flood (`udp_flood`)
- **Tool**: hping3 UDP flood
- **Rate**: 20,000-80,000 UDP packets/sec
- **Packet Size**: 1,024 bytes
- **Bandwidth**: 160-640 Mbps
- **Protocol**: UDP
- **Use Case**: Bandwidth saturation, firewall stress
- **Command**: `--attack-type udp_flood`

#### 5. Slowloris Attack (`slowloris`)
- **Tool**: Slowloris
- **Rate**: 10-100 slow connections/sec
- **Packet Size**: 50-200 bytes (partial HTTP headers)
- **Bandwidth**: 1-5 Mbps (low bandwidth, high impact)
- **Protocol**: HTTP/TCP
- **Use Case**: Connection exhaustion with minimal bandwidth
- **Command**: `--attack-type slowloris`

#### 6. Scapy Flood (`scapy_flood`)
- **Tool**: Scapy custom packets
- **Rate**: 5,000-25,000 crafted packets/sec
- **Packet Size**: Variable (custom payloads)
- **Bandwidth**: 40-200 Mbps
- **Protocol**: Custom crafted packets
- **Use Case**: Protocol-specific attacks, evasion testing
- **Command**: `--attack-type scapy_flood`

#### 7. Distributed HTTP Flood (`distributed_http`)
- **Tool**: Multi-VM coordinated GoldenEye
- **Rate**: 3,000-15,000 HTTP requests/sec (distributed)
- **Packet Size**: ~1,500 bytes per request
- **Bandwidth**: 36-180 Mbps (from multiple VMs)
- **Protocol**: HTTP/TCP
- **Use Case**: Realistic botnet simulation
- **Command**: `--attack-type distributed_http --num-attackers 3`

### 🎯 Target Options (OPNsense LAN Network)

| Target | IP Address | Description | Services |
|--------|------------|-------------|----------|
| `team1` | 20.10.40.11 | Blue Team 1 | DVWA:9080, bWAPP:9090 |
| `team2` | 192.168.50.11 | Blue Team 2 (Primary) | DVWA:9080, bWAPP:9090 |
| `team3` | 20.10.60.11 | Blue Team 3 | DVWA:9080, bWAPP:9090 |
| `windows_target` | 192.168.50.81 | Windows VM | RDP:3389, HTTP:80 |
| `vuln_bank` | 192.168.50.101 | Vulnerable Bank | Flask:5000 |

### 💥 Stress Testing Features

#### CPU Stress Testing
- **Tool**: stress-ng
- **Impact**: 80-100% CPU usage per core
- **Workers**: Configurable (default: 4)
- **Use Case**: System performance degradation
- **Command**: `--cpu-stress --cpu-workers 4`

#### Memory Stress Testing
- **Tool**: stress-ng memory allocation
- **Impact**: RAM allocation up to specified size
- **Size**: Configurable (default: 1G)
- **Use Case**: Memory exhaustion attacks
- **Command**: `--memory-stress --memory-size 1G`

### 📊 Monitoring & Metrics Features

#### Real-time Metrics Collection
- **Collection Interval**: Configurable (default: 10s)
- **Metrics**: CPU, memory, network usage on target
- **Export Format**: JSON with timestamps
- **Command**: `--metrics --metrics-interval 10`

#### Network Packet Capture
- **Tool**: tcpdump on target VM
- **Format**: PCAP files
- **Filter**: Port-specific capture
- **Storage**: Target VM `/tmp/` directory
- **Command**: `--capture`

#### Attack Statistics Reporting
- **Data**: Packets sent, bytes transferred, bandwidth utilization
- **Calculations**: Real-time rate calculations based on attack type
- **Export**: JSON format with detailed breakdowns
- **Command**: Automatic with `--metrics`

### 🛠️ Utility Functions

#### Tool Installation (`--install-tools`)
- **Purpose**: Install DDoS tools on Red Team VMs
- **Tools**: GoldenEye, Slowloris, hping3, stress-ng
- **Target VMs**: All Red Team VMs (192.168.60.61-66)
- **Command**: `--install-tools`

#### Attack Management (`--stop-attacks`)
- **Purpose**: Stop all running attack processes
- **Scope**: All active attacks across all VMs
- **Method**: SSH process termination
- **Command**: `--stop-attacks`

#### Quick Test (`--quick-test`)
- **Purpose**: Fast validation of attack capabilities
- **Duration**: 30 seconds
- **Attack**: HTTP flood + CPU stress on team1
- **Expected Rate**: 1,000 HTTP req/sec + CPU stress
- **Command**: `--quick-test`

#### Options Listing (`--list-options`)
- **Purpose**: Display all available attack types and targets
- **Information**: Packet rates, bandwidth, protocols
- **Use Case**: Reference guide for attack selection
- **Command**: `--list-options`

#### Detailed Statistics (`--show-stats`)
- **Purpose**: Comprehensive attack statistics reference
- **Information**: Expected packet counts, bandwidth utilization
- **Breakdowns**: Per-attack-type performance expectations
- **Command**: `--show-stats`

## 🎮 Example Usage Scenarios

### Basic HTTP Flood Attack
```bash
python3 run_cli_attacks.py --attack-type http_flood --target team2 --duration 300
```
**Expected Output**: 1,000-5,000 HTTP req/sec for 5 minutes

### High-Intensity Combined Attack
```bash
python3 run_cli_attacks.py --attack-type hping_heavy --target team2 --duration 180 --cpu-stress --memory-stress --metrics
```
**Expected Output**: 10,000-50,000 pps + CPU stress + memory stress + metrics export

### Distributed Botnet Simulation
```bash
python3 run_cli_attacks.py --attack-type distributed_http --target team1 --duration 300 --num-attackers 3 --capture
```
**Expected Output**: 3,000-15,000 HTTP req/sec from 3 VMs with packet capture

### Low-Bandwidth Stealth Attack
```bash
python3 run_cli_attacks.py --attack-type slowloris --target vuln_bank --duration 600 --metrics
```
**Expected Output**: 10-100 slow connections/sec for 10 minutes

### SYN Flood Connection Exhaustion
```bash
python3 run_cli_attacks.py --attack-type syn_flood --target windows_target --port 3389 --duration 120
```
**Expected Output**: 30,000-100,000 SYN packets/sec targeting RDP

## 📈 Realistic Attack Statistics

### Expected Packet Counts (Per Attack Type, 5-minute duration)

| Attack Type | Packets/Sec | Total Packets | Bytes/Packet | Total Bandwidth |
|-------------|-------------|---------------|--------------|-----------------|
| HTTP Flood | 1,000-5,000 | 300K-1.5M | 1,500 | 12-60 Mbps |
| hping Heavy | 10K-50K | 3M-15M | 1,400 | 112-560 Mbps |
| SYN Flood | 30K-100K | 9M-30M | 50 | 12-40 Mbps |
| UDP Flood | 20K-80K | 6M-24M | 1,024 | 164-655 Mbps |
| Slowloris | 10-100 | 3K-30K | 100 | 0.008-0.08 Mbps |
| Scapy Flood | 5K-25K | 1.5M-7.5M | Variable | 40-200 Mbps |

### System Impact Expectations

| Stress Type | CPU Usage | Memory Usage | Network Impact |
|-------------|-----------|--------------|----------------|
| CPU Stress (4 workers) | 80-100% | Normal | Minimal |
| Memory Stress (1G) | 10-20% | +1GB allocated | Minimal |
| Combined Network+Stress | 80-100% | +1GB | Full saturation |

### Target Response Times

| Normal State | Under Attack | Degradation Factor |
|--------------|--------------|-------------------|
| <100ms HTTP | 2-30 seconds | 20-300x slower |
| <50ms ping | 500ms-timeout | 10x-infinite |
| Normal SSH | Slow/timeout | Connection issues |

## 🎯 All CLI Options Summary

### Required Parameters
- `--attack-type {http_flood,hping_heavy,syn_flood,udp_flood,slowloris,scapy_flood,distributed_http}`
- `--target {team1,team2,team3,windows_target,vuln_bank}`

### Optional Parameters
- `--duration SECONDS` (default: 300)
- `--port PORT` (default: 9080)
- `--num-attackers N` (default: 3, for distributed attacks)

### Stress Testing Options
- `--cpu-stress` + `--cpu-workers N` (default: 4)
- `--memory-stress` + `--memory-size SIZE` (default: 1G)

### Monitoring Options
- `--metrics` + `--metrics-interval SECONDS` (default: 10)
- `--capture` (network packet capture)

### Utility Options
- `--list-options` (show all available options)
- `--quick-test` (30-second validation test)
- `--install-tools` (install DDoS tools on Red Team VMs)
- `--stop-attacks` (stop all running attacks)
- `--show-stats` (detailed statistics reference)

## ✅ Implementation Status

All features are **FULLY IMPLEMENTED** and available through the CLI interface:

- ✅ 7 distinct attack types with realistic packet statistics
- ✅ 5 network targets with OPNsense LAN addressing
- ✅ CPU and memory stress testing
- ✅ Real-time metrics collection and export
- ✅ Network packet capture capabilities
- ✅ Tool installation and management utilities
- ✅ Attack coordination and termination
- ✅ Comprehensive statistics and performance reporting
- ✅ Quick testing and validation functions
- ✅ Complete documentation and help system

**Total Features**: 25+ distinct capabilities
**CLI Options**: 20+ command-line flags
**Attack Combinations**: 100+ possible configurations
**Expected Performance**: Production-grade DDoS simulation with realistic network impact

This represents a complete DDoS simulation framework with comprehensive CLI access to all implemented features.
