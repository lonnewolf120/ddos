# OPNsense LAN-Only Attack Configuration

## Overview
DDoS attacks are now configured to ONLY use Red Team VMs with OPNsense LAN IP addresses (192.168.60.x subnet). This ensures attacks route through the OPNsense firewall for proper Blue Team detection and monitoring.

---

## Active Red Team VMs (With OPNsense LAN Access)

### 1. Attack Generator (VM12)
- **Internal IP:** 10.10.30.50
- **OPNsense LAN IP:** 192.168.60.62 ✅
- **WAN IP:** 10.72.200.62
- **Role:** Primary Attacker
- **Status:** ONLINE

### 2. Botnet Generator 1 (VM13)
- **Internal IP:** 10.10.30.60
- **OPNsense LAN IP:** 192.168.60.64 ✅
- **WAN IP:** 10.72.200.64
- **Role:** Distributed Attack
- **Status:** ONLINE

### 3. Botnet Generator 2 (VM14)
- **Internal IP:** 10.10.30.60
- **OPNsense LAN IP:** 192.168.60.65 ✅
- **WAN IP:** 10.72.200.65
- **Role:** Distributed Attack
- **Status:** ONLINE

---

## Disabled Red Team VMs (No OPNsense LAN Access)

### Attack Scheduler (VM10)
- **IP:** 10.10.30.30 / 10.72.200.61
- **Status:** OFFLINE (Hidden - No LAN IP)

### Red Team GUI (VM11)
- **IP:** 10.10.30.40 / 10.72.200.63
- **Status:** OFFLINE (Hidden - No LAN IP)

---

## Active Blue Team Targets (Blue Team 2 Only)

### 1. Vulnerable Bank Website (VM23) ⭐ PRIMARY
- **OPNsense LAN IP:** 192.168.50.101
- **WAN IP:** 10.72.200.101
- **Port:** 3000 (Nginx → 5000 Flask)
- **Services:**
  - Flask Application (Port 5000)
  - Nginx Reverse Proxy (Port 3000)
  - PostgreSQL Database (Port 5432)

### 2. Blue Team 2 - Web Apps (VM4) ⭐ PRIMARY
- **OPNsense LAN IP:** 192.168.50.11
- **WAN IP:** 10.72.200.54
- **Services:**
  - bWAPP (Port 9090)
  - DVWA (Port 9080)
  - Juice Shop (Port 3000)

### 3. Team 2 SIEM (VM5)
- **WAN IP:** 10.72.200.55
- **Service:** Wazuh (Port 5601)
- **Status:** Monitoring Only

### 4. Team 2 IDS (VM6)
- **WAN IP:** 10.72.200.56
- **Service:** Suricata/Evebox (Port 5636)
- **Status:** Monitoring Only

---

## Hidden Blue Team Infrastructure

### Blue Team 1 (Commented Out)
- ❌ Team 1 Web Apps (10.72.200.51) - No OPNsense LAN
- ❌ Team 1 SIEM (10.72.200.52)
- ❌ Team 1 IDS (10.72.200.53)

### Blue Team 3 (Commented Out)
- ❌ Team 3 Web Apps (10.72.200.57) - No OPNsense LAN
- ❌ Team 3 SIEM (10.72.200.58)
- ❌ Team 3 IDS (10.72.200.59)

---

## Attack Flow

```
Red Team VMs (192.168.60.x)
    ↓
OPNsense Firewall (Routing & Monitoring)
    ↓
Blue Team 2 Targets (192.168.50.x)
    ↓
SIEM/IDS Detection (Wazuh, Suricata)
```

### Attack Paths:
1. **192.168.60.62** (Generator) → **192.168.50.101:3000** (Bank)
2. **192.168.60.64** (Botnet-1) → **192.168.50.11:9080** (DVWA)
3. **192.168.60.65** (Botnet-2) → **192.168.50.11:3000** (Juice Shop)

---

## Backend Configuration

**File:** `backend/main.py`

```python
RED_TEAM_VMS = {
    "generator": {
        "lan_ip": "192.168.60.62",  # OPNsense LAN
        "wan_ip": "10.72.200.62",
    },
    "botnet1": {
        "lan_ip": "192.168.60.64",  # OPNsense LAN
        "wan_ip": "10.72.200.64",
    },
    "botnet2": {
        "lan_ip": "192.168.60.65",  # OPNsense LAN
        "wan_ip": "10.72.200.65",
    },
}

BLUE_TEAM_TARGETS = {
    "team2": {
        "lan_ip": "192.168.50.11",  # Attack target
        "wan_ip": "10.72.200.54",
        "ports": [9080, 9090, 3000],
    },
    "bank": {
        "lan_ip": "192.168.50.101",  # Attack target
        "wan_ip": "10.72.200.101",
        "ports": [3000],
    },
}
```

---

## Frontend Configuration

**File:** `src/lib/network-data.ts`

- ✅ Only VMs with `lanIp` field are shown as ONLINE
- ❌ VMs without `lanIp` are commented out or marked OFFLINE
- 🎯 Primary targets marked with `isPrimary: true`

---

## Why OPNsense LAN Only?

1. **Firewall Monitoring:** All attacks route through OPNsense for traffic analysis
2. **Blue Team Detection:** SIEM/IDS can see attack traffic in real-time
3. **Network Segmentation:** Proper subnet isolation (60.x → 50.x)
4. **Realistic Training:** Mimics real-world network architecture
5. **Rule Enforcement:** OPNsense can apply blocking rules during mitigation

---

## Testing Commands

### Check Bank Accessibility
```bash
# From control machine (via WAN)
curl http://10.72.200.101:3000

# From Red Team VM (via LAN - should work)
ssh mist@10.72.200.62 "curl http://192.168.50.101:3000"
```

### Launch Attack
```bash
# Via management script (uses LAN IPs)
cd /home/iftee/Documents/Projects/attackers
sudo bash attack_bank_ddos.sh
```

### Monitor Attack
```bash
# Check bank status
bash manage_bank.sh status
bash manage_bank.sh test

# View attack traffic (on OPNsense)
# Firewall > Traffic Graphs
# Filter: src 192.168.60.0/24 and dst 192.168.50.0/24
```

---

## Network Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Red Team Subnet                         │
│                    (192.168.60.x)                           │
├─────────────────────────────────────────────────────────────┤
│  Generator (.62)  │  Botnet-1 (.64)  │  Botnet-2 (.65)     │
└──────────┬──────────────────┬──────────────────┬────────────┘
           │                  │                  │
           └──────────────────┼──────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   OPNsense FW     │
                    │  (Routing/IDS)    │
                    └─────────┬─────────┘
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
┌──────────▼─────────┬────────▼────────┬────────▼────────────┐
│  Bank Website      │  Team 2 Apps    │  SIEM/IDS          │
│  (.101:3000)       │  (.11:9080-3000)│  (Monitoring)      │
│  192.168.50.101    │  192.168.50.11  │                    │
└────────────────────┴─────────────────┴────────────────────┘
           Blue Team 2 Subnet (192.168.50.x)
```

---

**Last Updated:** 2026-01-06  
**Configuration:** OPNsense LAN-Only Attack Routing  
**Active VMs:** 3 Red Team, 2 Blue Team Targets  
**Hidden VMs:** Blue Team 1, Blue Team 3, Red Team GUI/Scheduler
