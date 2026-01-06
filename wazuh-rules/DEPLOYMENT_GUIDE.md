# Wazuh DDoS Defense Rules - Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying comprehensive DDoS defense rules on Wazuh agents protecting Blue Team infrastructure in the Cyber Range environment.

---

## 📁 File Structure

```
wazuh-rules/
├── ddos_defense_rules.xml          # Main detection rules
├── ossec_ddos_config.conf          # Wazuh configuration
├── active-response/
│   └── ddos-mitigate.sh           # Active response script
└── DEPLOYMENT_GUIDE.md            # This file
```

---

## 🎯 Protected Assets

### Blue Team Targets
- **Blue Team 1**: 20.10.40.11/24 (WAN: 10.72.200.51)
- **Blue Team 2**: 20.10.50.11/24 (WAN: 10.72.200.54)
- **Blue Team 3**: 20.10.60.11/24 (WAN: 10.72.200.57)

### Monitored Ports
- **9080** - bWAPP (Buggy Web Application)
- **9090** - DVWA (Damn Vulnerable Web App)
- **3000** - OWASP Juice Shop
- **80** - HTTP
- **443** - HTTPS

### Red Team Attack Sources (Monitored)
- **10.10.30.30** (Attack Scheduler) - WAN: 10.72.200.61
- **10.10.30.40** (Red Team GUI) - WAN: 10.72.200.63
- **10.10.30.50** (Attack Generator) - WAN: 10.72.200.62
- **10.10.30.60** (Botnet Generators) - WAN: 10.72.200.64, 10.72.200.65

---

## 🛡️ Detected Attack Types

### **DDoS Attacks**

### 1. **SYN Flood Attacks** (Rules 100100-100106)
- Detects TCP SYN floods from Red Team sources
- Monitors half-open connections
- Port-specific detection for all Blue Team services
- Threshold: 50-100 packets per 10 seconds

### 2. **UDP Flood Attacks** (Rules 100200-100204)
- Detects UDP packet floods
- Port-specific monitoring
- Threshold: 100-150 packets per 10 seconds

### 3. **ICMP Flood Attacks** (Rules 100300-100305)
- Ping flood detection
- Per-target monitoring for each Blue Team
- Threshold: 50-200 packets per 10 seconds

### 4. **HTTP Flood Attacks** (Rules 100400-100407)
- GoldenEye HTTP flood detection
- HULK attack pattern recognition
- Randomized User-Agent detection
- Threshold: 50-100 requests per 10 seconds

### 5. **Slowloris Attacks** (Rules 100500-100504)
- Partial HTTP header detection
- Slow connection monitoring
- Incomplete request tracking
- Threshold: 20-30 connections per 60 seconds

### 6. **IP Spoofing Attacks** (Rules 100600-100604)
- Detects spoofed private IP ranges
- Sequential IP pattern detection
- Unknown source IP identification
- Threshold: 10 spoofed IPs per 5 seconds

### 7. **Distributed Attacks** (Rules 100700-100702)
- Coordinated multi-source attacks
- Botnet activity detection
- Cross-target attack patterns
- Threshold: 3-5 different sources per 10 seconds

### 8. **Resource Exhaustion** (Rules 100800-100802)
- Connection table exhaustion
- Port exhaustion
- Memory allocation failures

### **Web Application Attacks**

### 9. **SQL Injection** (Rules 120001-120002)
- Common SQL injection patterns (UNION SELECT, OR '1'='1)
- Sleep/benchmark timing attacks
- SQL comment injection
- Threshold: Immediate blocking on detection

### 10. **Cross-Site Scripting (XSS)** (Rules 120010)
- Script tag injection
- JavaScript protocol handlers
- Event handler attributes (onerror, onload)
- Iframe/SVG injection

### 11. **Command Injection** (Rules 120020-120021)
- Shell metacharacters (; | && ` $())
- Command chaining attempts
- File access attempts (/etc/passwd)
- System command execution (whoami, id, ls)

### 12. **Brute Force Login** (Rules 120030)
- Failed login detection
- Invalid credentials tracking
- Threshold: 5 failed attempts in 60 seconds

### 13. **Active Scanning** (Rules 120040, 120050)
- High request rate detection (20+ requests/60s)
- Scanner user-agent detection (ZAP, Burp Suite)
- Automated fuzzing activity

### 14. **Vulnerable Endpoints** (Rules 120060, 120062)
- Requests to bWAPP, DVWA, OWASP Juice Shop
- Targeted attacks on Blue Team hosts
- Threshold: 5 requests in 120 seconds

### 15. **Malicious File Uploads** (Rules 120070-120071)
- PHP shell uploads
- Filename bypass techniques (double extension, null byte)
- Content-Type manipulation
- Embedded PHP code detection

### 16. **XXE/SSRF Attacks** (Rules 120080-120081)
- External entity declarations
- SYSTEM entity references
- Metadata service access (169.254.169.254)
- Local file access attempts (file:///)

### 17. **Network Scanning** (Rules 120090-120091)
- Nmap/Masscan detection
- Port scanning activity
- Connection refused patterns
- Threshold: 50 connection attempts in 60 seconds

---

## 📥 Installation Instructions

### Step 1: Deploy Rules on Wazuh Manager

```bash
# SSH to Wazuh Manager
ssh wazuh-manager

# Copy custom rules
sudo cp ddos_defense_rules.xml /var/ossec/etc/rules/local_rules.xml

# Set permissions
sudo chown wazuh:wazuh /var/ossec/etc/rules/local_rules.xml
sudo chmod 640 /var/ossec/etc/rules/local_rules.xml
```

### Step 2: Configure Wazuh Manager

```bash
# Edit ossec.conf
sudo nano /var/ossec/etc/ossec.conf

# Add the active response and email alert configurations from ossec_ddos_config.conf
# Paste sections between <ossec_config> tags

# Test configuration syntax
sudo /var/ossec/bin/wazuh-logtest-legacy -t
```

### Step 3: Deploy Active Response Script

```bash
# Copy script to active-response directory
sudo cp active-response/ddos-mitigate.sh /var/ossec/active-response/bin/

# Set permissions
sudo chmod 750 /var/ossec/active-response/bin/ddos-mitigate.sh
sudo chown root:wazuh /var/ossec/active-response/bin/ddos-mitigate.sh

# Test script
sudo /var/ossec/active-response/bin/ddos-mitigate.sh add - 10.10.30.30 12345 100101
```

### Step 4: Restart Wazuh Manager

```bash
# Restart Wazuh manager
sudo systemctl restart wazuh-manager

# Check status
sudo systemctl status wazuh-manager

# Test configuration before restart
sudo /var/ossec/bin/wazuh-logtest-legacy -t
```

### Step 5: Deploy to Blue Team Agents

For each Blue Team VM (20.10.40.11, 20.10.50.11, 20.10.60.11):

```bash
# SSH to Blue Team VM
ssh mist@20.10.40.11

# Ensure Wazuh agent is installed
sudo apt-get update
sudo apt-get install wazuh-agent

# Configure agent to connect to manager
sudo nano /var/ossec/etc/ossec.conf

# Add manager IP (adjust to your Wazuh manager)
<client>
  <server>
    <address>20.10.40.12</address>  <!-- Blue Team 1 SIEM -->
    <port>1514</port>
    <protocol>tcp</protocol>
  </server>
</client>

# Restart agent
sudo systemctl restart wazuh-agent
```

### Step 6: Configure Log Monitoring

On each Blue Team VM:

```bash
# Enable firewall logging
sudo iptables -I INPUT -j LOG --log-prefix "FW-INPUT: " --log-level 4
sudo iptables -I FORWARD -j LOG --log-prefix "FW-FORWARD: " --log-level 4

# Configure rsyslog to separate firewall logs
sudo nano /etc/rsyslog.d/10-iptables.conf

# Add:
:msg,contains,"FW-INPUT" /var/log/iptables.log
:msg,contains,"FW-FORWARD" /var/log/iptables.log
& stop

# Restart rsyslog
sudo systemctl restart rsyslog

# Ensure Wazuh monitors the log
sudo nano /var/ossec/etc/ossec.conf

# Add under <ossec_config>:
<localfile>
  <log_format>syslog</log_format>
  <location>/var/log/iptables.log</location>
</localfile>

# Restart agent
sudo systemctl restart wazuh-agent
```

### Step 7: Enable Required Kernel Parameters

On each Blue Team VM:

```bash
# Enable SYN cookies
sudo sysctl -w net.ipv4.tcp_syncookies=1

# Enable reverse path filtering (anti-spoofing)
sudo sysctl -w net.ipv4.conf.all.rp_filter=1
sudo sysctl -w net.ipv4.conf.default.rp_filter=1

# Increase SYN backlog
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=4096
sudo sysctl -w net.core.netdev_max_backlog=2000

# Reduce SYN-ACK retries
sudo sysctl -w net.ipv4.tcp_synack_retries=2

# Make changes persistent
sudo nano /etc/sysctl.conf

# Add:
net.ipv4.tcp_syncookies=1
net.ipv4.conf.all.rp_filter=1
net.ipv4.conf.default.rp_filter=1
net.ipv4.tcp_max_syn_backlog=4096
net.core.netdev_max_backlog=2000
net.ipv4.tcp_synack_retries=2

# Apply
sudo sysctl -p
```

### Step 8: Install ipset for Fast Blocking

```bash
# Install ipset
sudo apt-get install ipset

# Create blocklist set
sudo ipset create ddos_blocklist hash:ip timeout 3600

# Create iptables rule to use ipset
sudo iptables -I INPUT -m set --match-set ddos_blocklist src -j DROP

# Make persistent (on Ubuntu/Debian)
sudo apt-get install iptables-persistent
sudo netfilter-persistent save
```

---

## 🔧 Configuration Tuning

### Adjust Detection Thresholds

Edit `/var/ossec/etc/rules/local_rules.xml` and modify frequency values:

```xml
<!-- Example: Increase SYN flood threshold from 50 to 100 -->
<rule id="100101" level="8" frequency="100" timeframe="10">
  <!-- Change frequency="50" to frequency="100" -->
```

### Adjust Active Response Timeout

Edit `/var/ossec/etc/ossec.conf`:

```xml
<!-- Example: Change block duration from 1 hour to 30 minutes -->
<active-response>
  <command>firewall-drop</command>
  <location>local</location>
  <rules_id>101000</rules_id>
  <timeout>1800</timeout> <!-- Changed from 3600 to 1800 -->
</active-response>
```

### Whitelist Legitimate IPs

```bash
# Add to iptables before Wazuh rules
sudo iptables -I INPUT -s 10.10.10.0/24 -j ACCEPT  # Green Team
sudo iptables -I INPUT -s 10.10.20.0/24 -j ACCEPT  # White Team
```

---

## 📊 Monitoring and Verification

### Check Wazuh Alerts

```bash
# View real-time alerts
sudo tail -f /var/ossec/logs/alerts/alerts.log

# View active responses
sudo tail -f /var/ossec/logs/active-responses.log

# Check specific rule triggers
sudo grep "Rule: 100101" /var/ossec/logs/alerts/alerts.log
```

### View Blocked IPs

```bash
# Check iptables rules
sudo iptables -L INPUT -v -n | grep DROP

# View ipset blocklist
sudo ipset list ddos_blocklist

# Check active connections
sudo netstat -anp | grep ESTABLISHED
```

### Monitor System Resources

```bash
# Connection count
sudo netstat -an | grep -c ESTABLISHED

# Half-open connections (SYN_RECV)
sudo netstat -an | grep SYN_RECV | wc -l

# Check for connection table exhaustion
sudo dmesg | grep -i "connection tracking"
```

### Wazuh API Queries

```bash
# Get active agents
curl -u wazuh:wazuh -k -X GET "https://localhost:55000/agents?pretty=true"

# Get alerts for specific agent
curl -u wazuh:wazuh -k -X GET "https://localhost:55000/alerts?agent=001&pretty=true"
```

---

## 🚨 Alert Levels

| Level | Severity | Action |
|-------|----------|--------|
| 0-3   | Low      | Log only |
| 4-7   | Medium   | Alert notification |
| 8-9   | High     | Email alert + Active response |
| 10-12 | Critical | Immediate blocking + Email alert |

---

## 📧 Email Alert Configuration

Edit `/var/ossec/etc/ossec.conf`:

```xml
<global>
  <email_notification>yes</email_notification>
  <email_to>security-team@cyberrange.local</email_to>
  <smtp_server>mail.cyberrange.local</smtp_server>
  <email_from>wazuh@cyberrange.local</email_from>
  <email_maxperhour>50</email_maxperhour>
</global>
```

---

## 🧪 Testing the Rules

### Test SYN Flood Detection

```bash
# From Red Team VM
sudo hping3 -S -p 9080 --flood 20.10.40.11

# Check Wazuh alert on Blue Team
sudo tail -f /var/ossec/logs/alerts/alerts.log | grep "100101"
```

### Test HTTP Flood Detection

```bash
# From Red Team VM
ab -n 1000 -c 100 http://20.10.40.11:9080/

# Check alert
sudo tail -f /var/ossec/logs/alerts/alerts.log | grep "100402"
```

### Test ICMP Flood Detection

```bash
# From Red Team VM
sudo hping3 --icmp --flood 20.10.40.11

# Check alert
sudo tail -f /var/ossec/logs/alerts/alerts.log | grep "100301"
```

### Verify IP Blocking

```bash
# After alert triggers, check if IP is blocked
sudo iptables -L INPUT -v -n | grep 10.10.30.30

# Try to ping from blocked IP (should fail)
ping -c 5 20.10.40.11
```

### Test Web Application Attacks

```bash
# Test SQL Injection (from Red Team VM)
curl 'http://20.10.50.11:9080/search?q=1%27+OR+%271%27=%271'
curl 'http://20.10.50.11:9090/vulnerabilities/sqli/?id=1%27+UNION+SELECT+NULL--'

# Check alert
sudo tail -f /var/ossec/logs/alerts/alerts.log | grep "120001\|120002"

# Test XSS
curl "http://20.10.50.11:9090/vulnerabilities/xss_r/?name=<script>alert(1)</script>"

# Check alert
sudo tail -f /var/ossec/logs/alerts/alerts.log | grep "120010"

# Test Command Injection
curl "http://20.10.50.11:9090/vulnerabilities/exec/?ip=127.0.0.1;ls+-la"
curl "http://20.10.50.11:9090/vulnerabilities/exec/?ip=127.0.0.1%26%26whoami"

# Check alert
sudo tail -f /var/ossec/logs/alerts/alerts.log | grep "120020\|120021"

# Test Brute Force (bWAPP login - repeat 5+ times)
for i in {1..10}; do
  curl -X POST -d "login=admin&password=wrong$i" "http://20.10.50.11:9080/bWAPP/login.php"
  sleep 1
done

# Check alert
sudo tail -f /var/ossec/logs/alerts/alerts.log | grep "120030"

# Test File Upload (malicious PHP)
echo '<?php system($_GET["cmd"]); ?>' > /tmp/shell.php
curl -v -F "uploaded=@/tmp/shell.php;filename=shell.php.jpg;type=image/jpeg" \
  "http://20.10.50.11:9090/vulnerabilities/upload/"

# Check alert
sudo tail -f /var/ossec/logs/alerts/alerts.log | grep "120070\|120071"

# Test XXE Attack
cat > /tmp/xxe.xml <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [
  <!ELEMENT foo ANY >
  <!ENTITY xxe SYSTEM "file:///etc/passwd" >
]>
<reset>
  <login>&xxe;</login>
  <secret>test</secret>
</reset>
EOF

curl -v -H "Content-Type: application/xml" --data-binary @/tmp/xxe.xml \
  "http://20.10.50.11:9080/bWAPP"

# Check alert
sudo tail -f /var/ossec/logs/alerts/alerts.log | grep "120080\|120081"

# Test Network Scanning
nmap -sS -p1-1024 20.10.50.11
nmap -sV 20.10.50.11

# Check alert
sudo tail -f /var/ossec/logs/alerts/alerts.log | grep "120090\|120091"
```

---

## 🔄 Maintenance

### Clear Blocked IPs

```bash
# Clear all Wazuh-added rules
sudo iptables -F

# Clear ipset
sudo ipset flush ddos_blocklist

# Restart Wazuh agent
sudo systemctl restart wazuh-agent
```

### Update Rules

```bash
# Edit rules
sudo nano /var/ossec/etc/rules/local_rules.xml

# Restart manager
sudo systemctl restart wazuh-manager

# Rules are automatically pushed to agents
```

### Backup Configuration

```bash
# Backup rules and config
sudo tar -czf wazuh-backup-$(date +%Y%m%d).tar.gz \
  /var/ossec/etc/rules/local_rules.xml \
  /var/ossec/etc/ossec.conf \
  /var/ossec/active-response/bin/ddos-mitigate.sh
```

---

## 📈 Performance Optimization

### For High Traffic Environments

```bash
# Increase Wazuh queue sizes
sudo nano /var/ossec/etc/internal_options.conf

# Add:
analysisd.queue_size=131072
remoted.recv_timeout=10
```

### Enable Fast Packet Processing

```bash
# Use nftables instead of iptables for better performance
sudo apt-get install nftables
sudo systemctl enable nftables
```

---

## 🆘 Troubleshooting

### Rules Not Triggering

```bash
# Check rule syntax
sudo /var/ossec/bin/wazuh-logtest

# Verify agent connectivity
sudo /var/ossec/bin/agent_control -l

# Check logs
sudo tail -f /var/ossec/logs/ossec.log
```

### Active Response Not Working

```bash
# Verify script permissions
ls -l /var/ossec/active-response/bin/ddos-mitigate.sh

# Test manually
sudo /var/ossec/active-response/bin/ddos-mitigate.sh add - 10.10.30.30 12345 100101

# Check execution
sudo tail -f /var/ossec/logs/active-responses.log
```

### High False Positive Rate

```bash
# Increase thresholds in rules
# Edit frequency values in ddos_defense_rules.xml

# Add whitelisting for known good IPs
sudo iptables -I INPUT -s <trusted_ip> -j ACCEPT
```

---

## 📚 Additional Resources

- [Wazuh Documentation](https://documentation.wazuh.com/)
- [Wazuh Rules Syntax](https://documentation.wazuh.com/current/user-manual/ruleset/rules-classification.html)
- [Active Response Guide](https://documentation.wazuh.com/current/user-manual/capabilities/active-response/)
- [DDoS Mitigation Best Practices](https://www.cloudflare.com/learning/ddos/ddos-mitigation/)

---

## ⚠️ Important Notes

1. **Test in Non-Production First**: Always test rules in a lab environment before production deployment.

2. **Whitelist Critical IPs**: Ensure management IPs (Green Team, White Team) are whitelisted.

3. **Monitor Performance**: High-frequency rules can impact system performance.

4. **Regular Updates**: Keep Wazuh and rules updated for latest threat detection.

5. **Coordinate with Red Team**: Ensure attack exercises are scheduled and documented.

6. **Backup Before Changes**: Always backup configuration before making changes.

---

**Version:** 1.0
**Last Updated:** December 22, 2025
**Maintainer:** Blue Team Security Operations
