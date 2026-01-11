# DDoS Simulation Framework - Updated Network Configuration

## 🌐 OPNsense LAN IP Mappings

Based on the DNS-IP configuration provided, the DDoS simulation framework has been updated to use the correct OPNsense LAN IP addresses for both Red Team attackers and Blue Team targets.

### 🔴 Red Team Attack Infrastructure (OPNsense LAN IPs)

| VM Role | Domain | Original IP | **OPNsense LAN IP** | Purpose |
|---------|--------|-------------|---------------------|---------|
| Scheduler | scheduler.cyberrange.local | 10.72.200.61 | **192.168.60.61** | Attack scheduling and coordination |
| Generator | console.cyberrange.local | 10.72.200.62 | **192.168.60.62** | Primary attack generator ⭐ |
| GUI | redteam.cyberrange.local | 10.72.200.63 | **192.168.60.63** | Red Team GUI interface |
| Botnet1 | attacker.cyberrange.local | 10.72.200.64 | **192.168.60.64** | Distributed attack node 1 |
| Botnet2 | botnet.cyberrange.local | 10.72.200.65 | **192.168.60.65** | Distributed attack node 2 |
| Kali | attacker-kali | 10.72.200.66 | **192.168.60.66** | Kali Linux attack platform |

### 🔵 Blue Team Targets (OPNsense LAN IPs)

| Team | Domain | Original IP | **OPNsense LAN IP** | Services | Purpose |
|------|--------|-------------|---------------------|----------|---------|
| Team 1 | attackdrill.blueteam1.local | 10.72.200.51 | **20.10.40.11** | DVWA:9080, bWAPP:9090, Juice:3000 | Blue Team 1 Infrastructure |
| Team 2 | attackdrill.blueteam2.local | 10.72.200.54 | **192.168.50.11** | DVWA:9080, bWAPP:9090, Juice:3000 | Blue Team 2 Infrastructure ⭐ |
| Team 3 | attackdrill.blueteam3.local | 10.72.200.57 | **20.10.60.11** | DVWA:9080, bWAPP:9090, Juice:3000 | Blue Team 3 Infrastructure |

### 🏦 Additional Targets

| Target | Domain | **OPNsense LAN IP** | Purpose |
|--------|--------|---------------------|---------|
| Windows Test | ransomtest1.local | **192.168.50.81** | Windows ransomware testing |
| Vulnerable Bank | bank.cyberrange.local | **192.168.50.101** | Vulnerable banking application |

## 🔄 Framework Updates Applied

### 1. Core Orchestrator (`distributed_ddos_executor.py`)
```python
# Updated Red Team VM mappings
self.red_team_vms = {
    "scheduler": "192.168.60.61",   # scheduler.cyberrange.local
    "generator": "192.168.60.62",   # console.cyberrange.local (primary)
    "gui": "192.168.60.63",         # redteam.cyberrange.local
    "botnet1": "192.168.60.64",     # attacker.cyberrange.local
    "botnet2": "192.168.60.65",     # botnet.cyberrange.local
    "kali": "192.168.60.66",        # attacker-kali
}

# Updated Blue Team target mappings
self.blue_team_targets = {
    "team1": "20.10.40.11",         # Blue Team 1
    "team2": "192.168.50.11",       # Blue Team 2 (Primary target)
    "team3": "20.10.60.11",         # Blue Team 3
    "windows_target": "192.168.50.81",   # Windows test target
    "vuln_bank": "192.168.50.101",       # Vulnerable Bank
}
```

### 2. CLI Interface (`run_cli_attacks.py`)
- Updated help text: `team1=20.10.40.11, team2=192.168.50.11, team3=20.10.60.11`
- Updated attack execution to use `192.168.60.62` (generator) as primary attacker
- Updated quick test to target `20.10.40.11` (team1)

### 3. Documentation (`README_ENHANCED.md`)
- Updated all code examples with OPNsense LAN IP addresses
- Updated integration section with new network topology
- Updated SSH command examples for emergency procedures

## 🎯 Target Selection Strategy

### Primary Targets (Recommended)
1. **Team2 (192.168.50.11)** - Primary target with OPNsense LAN connectivity
2. **Vulnerable Bank (192.168.50.101)** - Dedicated application testing
3. **Windows Target (192.168.50.81)** - Windows-specific attack testing

### Standard Targets
- **Team1 (20.10.40.11)** - Standard Blue Team infrastructure
- **Team3 (20.10.60.11)** - Standard Blue Team infrastructure

## 🚀 Usage Examples (Updated)

### HTTP Flood Attack
```bash
# Target Blue Team 2 (Primary OPNsense LAN target)
python3 run_cli_attacks.py --attack-type http_flood --target team2 --duration 300 --cpu-stress --metrics

# Target Vulnerable Bank
python3 run_cli_attacks.py --attack-type http_flood --target vuln_bank --duration 180 --metrics
```

### Heavy hping Attack
```bash
# Maximum impact on Team2
python3 run_cli_attacks.py --attack-type hping_heavy --target team2 --duration 240 --cpu-stress --memory-stress --metrics

# Target Windows system
python3 run_cli_attacks.py --attack-type hping_heavy --target windows_target --duration 180 --cpu-stress
```

### Distributed Attack
```bash
# Coordinated attack on Team2 from multiple Red Team VMs
python3 run_cli_attacks.py --attack-type distributed_http --target team2 --duration 300 --num-attackers 3 --cpu-stress --metrics
```

## 🔧 Network Configuration Notes

### OPNsense LAN Subnets
- **Red Team Network**: `192.168.60.0/24` - Attack infrastructure
- **Blue Team 2 Network**: `192.168.50.0/24` - Primary target network with OPNsense connectivity
- **Blue Team 1/3 Networks**: `20.10.40.0/24` and `20.10.60.0/24` - Standard target networks

### Connectivity Requirements
1. **Red Team VMs** must have network access to Blue Team targets via OPNsense routing
2. **SSH access** must be configured for all VMs using `mist/Cyber#Range` credentials
3. **Tools installation** required on Red Team VMs: hping3, stress-ng, GoldenEye, HULK
4. **Firewall rules** in OPNsense must allow attack traffic from Red Team to Blue Team networks

### Testing Network Connectivity
```bash
# Test Red Team to Blue Team connectivity
ssh mist@192.168.60.62 "ping -c 3 192.168.50.11"    # Generator to Team2
ssh mist@192.168.60.62 "ping -c 3 20.10.40.11"      # Generator to Team1

# Test SSH access to updated IPs
ssh mist@192.168.60.62 "hostname"                    # Red Team Generator
ssh mist@192.168.50.11 "hostname"                    # Blue Team 2
ssh mist@20.10.40.11 "hostname"                      # Blue Team 1
```

## ✅ Migration Summary

### Changes Applied
1. ✅ **Red Team VMs**: Updated 6 VM IP addresses to OPNsense LAN subnet (192.168.60.0/24)
2. ✅ **Blue Team Targets**: Updated 3 primary targets + 2 additional targets with OPNsense LAN IPs
3. ✅ **CLI Interface**: Updated help text and command examples
4. ✅ **Documentation**: Updated README with new network topology
5. ✅ **Example Code**: Updated all Python code examples and workflows

### Backward Compatibility
- Legacy target mappings maintained for existing scripts
- Original team names (team1, team2, team3) still functional
- All existing functionality preserved with new IP addressing

### Next Steps
1. **Network Testing**: Verify connectivity between updated IP ranges
2. **SSH Configuration**: Ensure SSH keys/credentials work with new IPs
3. **Firewall Rules**: Configure OPNsense to allow attack traffic
4. **Tool Installation**: Install attack tools on Red Team VMs with new IPs
5. **Monitoring Setup**: Configure SIEM/IDS for new IP ranges

---

**Updated**: January 11, 2026
**Network Topology**: OPNsense LAN IP addressing
**Primary Target**: Team2 (192.168.50.11) with OPNsense LAN connectivity
