# Wazuh DDoS Detection Architecture

## Network Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RED TEAM SUBNET                              │
│                        10.10.30.0/24                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Attack Scheduler:  10.10.30.30  (WAN: 10.72.200.61)                │
│  Attack Generator:  10.10.30.50  (WAN: 10.72.200.62) ◄── DDoS Tools │
│  Red Team GUI:      10.10.30.40  (WAN: 10.72.200.63)                │
│  Botnet Gen 1:      10.10.30.60  (WAN: 10.72.200.64)                │
│  Botnet Gen 2:      10.10.30.60  (WAN: 10.72.200.65)                │
│                                                                       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            │ DDoS Attacks
                            │ (hping3, Scapy, Slowloris, GoldenEye)
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BLUE TEAM SUBNET                                │
│                     20.10.50.0/24                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────┐             │
│  │  Blue Team Server (TARGET)                         │             │
│  │  IP: 10.72.200.54                                  │             │
│  │                                                     │             │
│  │  ┌──────────────────────────────────────────────┐  │             │
│  │  │  WAZUH AGENT                                 │  │             │
│  │  │  - Monitors logs                             │  │             │
│  │  │  - Executes active responses                 │  │             │
│  │  │  - Blocks attacking IPs                      │  │             │
│  │  └──────────────────────────────────────────────┘  │             │
│  │                                                     │             │
│  │  ┌──────────────────────────────────────────────┐  │             │
│  │  │  IPTABLES LOGGING                            │  │             │
│  │  │  - REDTEAM_SYN: (SYN flood detection)        │  │             │
│  │  │  - REDTEAM_UDP: (UDP flood detection)        │  │             │
│  │  │  - REDTEAM_ICMP: (ICMP flood detection)      │  │             │
│  │  │  - IPTABLES_BWAPP: (Port 9080 logging)       │  │             │
│  │  │  - IPTABLES_DVWA: (Port 9090 logging)        │  │             │
│  │  └──────────────────────────────────────────────┘  │             │
│  │                                                     │             │
│  │  Applications:                                      │             │
│  │  - bWAPP (Port 9080)                                │             │
│  │  - DVWA (Port 9090)                                 │             │
│  │  - OWASP Juice Shop (Port 3000)                     │             │
│  │  - Apache/Nginx (Port 80, 443)                      │             │
│  └────────────────────────────────────────────────────┘             │
│                            │                                          │
│                            │ Forwards logs                            │
│                            │                                          │
└────────────────────────────┼──────────────────────────────────────────┘
                             │
                             │ Secure Agent Protocol (Port 1514)
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    WAZUH SIEM INFRASTRUCTURE                         │
│                      10.72.200.55                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────┐             │
│  │  WAZUH MANAGER                                     │             │
│  │  - Analyzes logs from agents                       │             │
│  │  - Applies detection rules (200xxx series)         │             │
│  │  - Triggers active responses                       │             │
│  │  - Generates alerts                                │             │
│  └────────────────────────────────────────────────────┘             │
│                            │                                          │
│  ┌────────────────────────────────────────────────────┐             │
│  │  WAZUH INDEXER (Elasticsearch)                     │             │
│  │  - Stores alerts and events                        │             │
│  │  - Provides search capabilities                    │             │
│  └────────────────────────────────────────────────────┘             │
│                            │                                          │
│  ┌────────────────────────────────────────────────────┐             │
│  │  WAZUH DASHBOARD (Kibana)                          │             │
│  │  - Web UI: https://10.72.200.55:443                │             │
│  │  - Real-time monitoring                            │             │
│  │  - Alert visualization                             │             │
│  │  - Event correlation                               │             │
│  └────────────────────────────────────────────────────┘             │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## IP Address Summary

### Wazuh Infrastructure
- **10.72.200.55** - Wazuh Manager + Indexer + Dashboard (All-in-One)
- **10.72.200.54** - Wazuh Agent (Blue Team Server - TARGET)

### Red Team Attack Sources
- **10.72.200.61** - Attack Scheduler (WAN IP of 10.10.30.30)
- **10.72.200.62** - Attack Generator (WAN IP of 10.10.30.50) ← Primary attack source
- **10.72.200.63** - Red Team GUI (WAN IP of 10.10.30.40)
- **10.72.200.64** - Botnet Generator 1
- **10.72.200.65** - Botnet Generator 2

---

## Data Flow

```
1. Red Team Attack (10.72.200.62)
   │
   │ hping3 -S -p 9080 --flood --rand-source 10.72.200.54
   │
   ▼
2. Blue Team Server (10.72.200.54)
   │
   │ iptables logs: REDTEAM_SYN: SRC=10.72.200.62 DST=10.72.200.54 DPT=9080
   │ → /var/log/kern.log
   │
   ▼
3. Wazuh Agent (10.72.200.54)
   │
   │ Reads /var/log/kern.log
   │ Forwards to Wazuh Manager via port 1514
   │
   ▼
4. Wazuh Manager (10.72.200.55)
   │
   │ Analyzes log against rules in /var/ossec/etc/rules/local_rules.xml
   │ Rule 200100: SYN packet detected → Level 5
   │ Rule 200101: 50+ SYN in 10s → Level 8 → Frequency match!
   │ Rule 200102: 100+ SYN to port 9080 → Level 10 → CRITICAL!
   │
   ▼
5. Active Response Triggered
   │
   │ Manager sends command to Agent (10.72.200.54):
   │ firewall-drop 10.72.200.62 for 3600 seconds
   │
   ▼
6. Agent Executes Response (10.72.200.54)
   │
   │ iptables -I INPUT -s 10.72.200.62 -j DROP
   │ Attack blocked!
   │
   ▼
7. Alert Stored & Displayed
   │
   │ → Wazuh Indexer (10.72.200.55)
   │ → Wazuh Dashboard: https://10.72.200.55:443
   │ → Email alert (if configured)
```

---

## Deployment Targets

### On Blue Team Server (10.72.200.54) - Wazuh Agent
```bash
# 1. Setup iptables logging
sudo /tmp/setup_ddos_logging.sh

# 2. Verify Wazuh agent is running
sudo systemctl status wazuh-agent

# 3. Check agent connection to manager
sudo cat /var/ossec/etc/client.keys
# Should show: 10.72.200.55 as manager

# 4. Monitor logs
sudo tail -f /var/log/kern.log | grep REDTEAM
```

### On Wazuh Manager (10.72.200.55)
```bash
# 1. Deploy detection rules
sudo mv ddos_defense_rules.xml /var/ossec/etc/rules/local_rules.xml
sudo chown wazuh:wazuh /var/ossec/etc/rules/local_rules.xml

# 2. Validate rules
sudo /var/ossec/bin/wazuh-logtest-legacy -t

# 3. Restart manager
sudo systemctl restart wazuh-manager

# 4. Verify agent connection
sudo /var/ossec/bin/agent_control -l
# Should show agent 10.72.200.54 as "Active"

# 5. Monitor alerts
sudo tail -f /var/ossec/logs/alerts/alerts.log
```

---

## Quick Test Command

From Red Team (10.72.200.62):
```bash
# Launch SYN flood attack
sudo hping3 -S -p 9080 --flood --rand-source 10.72.200.54 &
sleep 5
sudo pkill hping3
```

Expected Result:
1. **10.72.200.54** - iptables logs SYN packets
2. **10.72.200.54** - Wazuh agent forwards logs
3. **10.72.200.55** - Manager detects SYN flood (Rules 200100→200101→200102)
4. **10.72.200.55** - Sends active response command
5. **10.72.200.54** - Blocks 10.72.200.62 for 3600s
6. **10.72.200.55** - Dashboard shows alerts

---

## Access Points

- **Wazuh Dashboard:** https://10.72.200.55:443
- **Target Applications:**
  - bWAPP: http://10.72.200.54:9080
  - DVWA: http://10.72.200.54:9090
  - Juice Shop: http://10.72.200.54:3000

---

## File Locations

### On Blue Team Agent (10.72.200.54)
- Agent config: `/var/ossec/etc/ossec.conf`
- Agent logs: `/var/ossec/logs/ossec.log`
- Kernel logs: `/var/log/kern.log` (iptables logs here)
- Apache logs: `/var/log/apache2/access.log`, `/var/log/apache2/error.log`
- Active response log: `/var/ossec/logs/active-responses.log`

### On Wazuh Manager (10.72.200.55)
- Manager config: `/var/ossec/etc/ossec.conf`
- Detection rules: `/var/ossec/etc/rules/local_rules.xml`
- Manager logs: `/var/ossec/logs/ossec.log`
- Alerts: `/var/ossec/logs/alerts/alerts.log`
- Active response log: `/var/ossec/logs/active-responses.log`

---

This architecture ensures **real-time DDoS detection** with **< 3 seconds** response time!
