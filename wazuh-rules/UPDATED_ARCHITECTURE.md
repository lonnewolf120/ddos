# Wazuh Architecture Summary

## Correct Server IPs

### Wazuh Infrastructure
- **Wazuh Manager:** 10.72.200.55 (+ Indexer + Dashboard)
- **Wazuh Agent:** 10.72.200.54 (Blue Team Server - Primary Target)

### Attack Sources (Red Team)
- **Attack Generator:** 10.72.200.62 (Primary attack source)
- **Botnet Gen 1:** 10.72.200.64
- **Botnet Gen 2:** 10.72.200.65
- **Scheduler:** 10.72.200.61
- **GUI:** 10.72.200.63

---

## Updated Deployment Steps

### 1. Setup Blue Team Server (10.72.200.54)

```bash
# Copy setup script
scp setup_ddos_logging.sh mist@10.72.200.54:/tmp/

# Run on Blue Team server
ssh mist@10.72.200.54
sudo /tmp/setup_ddos_logging.sh

# Verify Wazuh agent is running
sudo systemctl status wazuh-agent

# Check connection to manager
sudo grep "Connected to" /var/ossec/logs/ossec.log
# Should show: Connected to 10.72.200.55
```

### 2. Deploy Rules to Wazuh Manager (10.72.200.55)

```bash
# Copy rules
scp ddos_defense_rules.xml mist@10.72.200.55:/tmp/

# Install on manager
ssh mist@10.72.200.55
sudo mv /tmp/ddos_defense_rules.xml /var/ossec/etc/rules/local_rules.xml
sudo chown wazuh:wazuh /var/ossec/etc/rules/local_rules.xml
sudo chmod 640 /var/ossec/etc/rules/local_rules.xml

# Validate
sudo /var/ossec/bin/wazuh-logtest-legacy -t

# Restart manager
sudo systemctl restart wazuh-manager

# Verify agent connection
sudo /var/ossec/bin/agent_control -l
```

### 3. Test Detection

```bash
# From Red Team (10.72.200.62)
sudo hping3 -S -p 9080 --flood --rand-source 10.72.200.54 &
sleep 5
sudo pkill hping3
```

### 4. Verify Results

**On Agent (10.72.200.54):**
```bash
# Check logs are being generated
sudo tail -f /var/log/kern.log | grep REDTEAM

# Check active response blocked the IP
sudo iptables -L -n -v | grep 10.72.200.62
```

**On Manager (10.72.200.55):**
```bash
# Check alerts
sudo tail -f /var/ossec/logs/alerts/alerts.log | grep ddos_attack

# Or use dashboard:
# https://10.72.200.55:443
```

---

## Key Changes Made

1. **distributed_ddos_executor.py** - Updated `blue_team_targets["team1"]` to `10.72.200.54`
2. **setup_ddos_logging.sh** - Updated header comments to reflect agent server
3. **QUICK_DEPLOY.md** - Updated all IPs to target 10.72.200.54
4. **ARCHITECTURE.md** - Created with complete topology diagram

---

## All Files Ready to Deploy

✅ **ddos_defense_rules.xml** - Detection rules tuned to your attack tools
✅ **setup_ddos_logging.sh** - iptables logging setup for 10.72.200.54
✅ **validate_ddos_detection.sh** - Test script for manager (10.72.200.55)
✅ **distributed_ddos_executor.py** - Updated to target 10.72.200.54
✅ **QUICK_DEPLOY.md** - Step-by-step deployment guide
✅ **ARCHITECTURE.md** - Complete network topology and data flow

**Everything is now correctly configured for your Wazuh setup!** 🎯
