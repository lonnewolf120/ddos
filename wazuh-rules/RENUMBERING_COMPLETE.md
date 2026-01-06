# Wazuh Rules Renumbering - Complete

## Summary
All DDoS detection rules have been renumbered from the **100xxx range** to **200xxx range** to avoid conflicts with existing Wazuh installation.

## Rule ID Mapping

### Baseline Rules (200001-200024)
- 100001 → **200001** (TCP Connection)
- 100002 → **200002** (UDP Packet)
- 100003 → **200003** (ICMP Packet)
- 100004 → **200004** (HTTP Request - decoder fixed)
- 100010-100019 → **200010-200019** (Red Team Source Detection)
- 100020-100024 → **200020-200024** (Blue Team Port Monitoring)

### SYN Flood Detection (200100-200106)
- 100100 → **200100** (SYN from Red Team)
- 100101 → **200101** (SYN Flood - 50+ packets/10s)
- 100102 → **200102** (SYN to bWAPP port 9080)
- 100103 → **200103** (SYN to DVWA port 9090)
- 100104 → **200104** (SYN to Juice Shop port 3000)
- 100105 → **200105** (SYN to HTTP port 80)
- 100106 → **200106** (SYN to HTTPS port 443)

### UDP Flood Detection (200200-200204)
- 100200 → **200200** (UDP from Red Team)
- 100201 → **200201** (UDP Flood - 100+ packets/10s)
- 100202-100204 → **200202-200204** (UDP to specific ports)

### ICMP Flood Detection (200300-200305)
- 100300 → **200300** (ICMP from Red Team)
- 100301 → **200301** (ICMP Flood - 50+ packets/10s)
- 100302-100305 → **200302-200305** (ICMP to specific ports)

### HTTP Flood Detection (200400-200407)
- 100400 → **200400** (HTTP from Red Team)
- 100401 → **200401** (HTTP Flood - 50+ requests/10s)
- 100402-100407 → **200402-200407** (HTTP to specific ports/services)

### Slowloris Detection (200500-200504)
- 100500 → **200500** (Slow HTTP connections)
- 100501 → **200501** (Slowloris - 20+ connections/60s)
- 100502-100504 → **200502-200504** (Slowloris to specific services)

### IP Spoofing Detection (200600-200604)
- 100600 → **200600** (Invalid source IP)
- 100601 → **200601** (Private IP from external)
- 100602 → **200602** (Localhost spoofing)
- 100603 → **200603** (IP spoofing frequency)
- 100604 → **200604** (Critical IP spoofing)

### Distributed DDoS Detection (200700-200702)
- 100700 → **200700** (Multiple Red Team sources)
- 100701 → **200701** (Multiple source IPs - 3+ sources/5s)
- 100702 → **200702** (Coordinated attack pattern)

### Connection State Monitoring (200800-200802)
- 100800 → **200800** (High connection rate)
- 100801 → **200801** (Connection exhaustion)
- 100802 → **200802** (SYN_RECEIVED state flood)

### Traffic Anomaly Detection (200900-200902)
- 100900 → **200900** (High packet rate - 500+ packets/10s)
- 100901 → **200901** (Extreme traffic - 1000+ packets/10s)
- 100902 → **200902** (Unusual protocol patterns)

### Active Response Triggers (201000-201002)
- 101000 → **201000** (Critical DDoS - triggers all attacks)
- 101001 → **201001** (Distributed attack trigger)
- 101002 → **201002** (HTTP flood trigger)

### Web Attack Rules (120001-120091) - NO CHANGES
These rules remain in the 120xxx range as they had no conflicts.

## Files Updated

### 1. ddos_defense_rules.xml
- All rule IDs renumbered from 100xxx → 200xxx
- All `if_sid` references updated to 200xxx
- All `if_matched_sid` references updated to 200xxx
- Invalid `web-log` decoder removed from rule 200004
- Rule 200004 now uses simple HTTP method matching
- Rule 120030 frequency/timeframe moved to attributes (fixed XML syntax)

### 2. ossec.conf
- All `<rules_id>` entries updated to 200xxx in active-response sections
- 16 DDoS active responses updated
- 7 web attack active responses unchanged (120xxx)

## Deployment Instructions

### Step 1: Deploy Rules File
```bash
scp ddos_defense_rules.xml mist@10.72.200.55:/tmp/
ssh mist@10.72.200.55
sudo mv /tmp/ddos_defense_rules.xml /var/ossec/etc/rules/local_rules.xml
sudo chown wazuh:wazuh /var/ossec/etc/rules/local_rules.xml
sudo chmod 640 /var/ossec/etc/rules/local_rules.xml
```

### Step 2: Deploy Configuration File
```bash
scp ossec.conf mist@10.72.200.55:/tmp/
ssh mist@10.72.200.55
sudo cp /var/ossec/etc/ossec.conf /var/ossec/etc/ossec.conf.backup
sudo mv /tmp/ossec.conf /var/ossec/etc/ossec.conf
sudo chown root:wazuh /var/ossec/etc/ossec.conf
sudo chmod 640 /var/ossec/etc/ossec.conf
```

### Step 3: Validate Configuration
```bash
sudo /var/ossec/bin/wazuh-logtest-legacy -t
```

Expected result: No CRITICAL errors, only possible warnings about missing lists.

### Step 4: Restart Wazuh Manager
```bash
sudo systemctl restart wazuh-manager
sudo systemctl status wazuh-manager
```

## Resolved Issues

✅ **Duplicate Rule IDs**: All conflicts with existing Wazuh rules resolved
- 101101 (was conflicting) → now 200xxx range
- 100510, 100511 (were conflicting) → now 200xxx range
- 100502, 100503, 100504 (were conflicting) → now 200xxx range
- 100600-100604 (were conflicting) → now 200xxx range
- 100700-100702 (were conflicting) → now 200xxx range
- 100800-100802 (were conflicting) → now 200xxx range
- 100900-100902 (were conflicting) → now 200xxx range

✅ **Invalid Decoder**: Removed `web-log` decoder from rule 200004

✅ **Invalid if_matched_sid**: All references now point to valid 200xxx rule IDs

✅ **Frequency XML Syntax**: Rule 120030 fixed (frequency/timeframe as attributes)

## Testing Checklist

After deployment:
- [ ] Configuration validation passes (wazuh-logtest-legacy -t)
- [ ] Wazuh manager restarts successfully
- [ ] Active responses are loaded and visible in Wazuh dashboard
- [ ] Test DDoS attack generates alerts with new rule IDs (200xxx)
- [ ] Firewall-drop active response triggers on critical attacks
- [ ] Email alerts sent for severity level 10+

## Server Information

**Wazuh Manager**: 10.72.200.55 (blue-05)
**Credentials**: mist / Cyber#Range

**Blue Team Targets**:
- 20.10.40.11 (Blue Team 1)
- 20.10.50.11 (Blue Team 2)
- 20.10.60.11 (Blue Team 3)

**Red Team Sources**:
- 10.10.30.30 (Scheduler)
- 10.10.30.50 (Generator)
- 10.10.30.60 (Botnet)
