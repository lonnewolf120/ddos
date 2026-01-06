#!/bin/bash
# DDoS Detection Setup Script for Blue Team Wazuh Agent Server
# Run this on: 10.72.200.54 (Wazuh Agent)
# Also run on any additional Blue Team servers with Wazuh agents

set -e

echo "========================================="
echo "DDoS Detection Setup for Blue Team"
echo "Wazuh Agent Server: 10.72.200.54"
echo "========================================="

# Configuration
BWAPP_PORT=9080
DVWA_PORT=9090
JUICE_PORT=3000
HTTP_PORT=80
HTTPS_PORT=443

RED_TEAM_SUBNET="10.10.30.0/24"
RED_TEAM_IPS=(
    "10.72.200.61"  # Scheduler WAN
    "10.72.200.62"  # Generator WAN
    "10.72.200.63"  # GUI WAN
    "10.72.200.64"  # Botnet 1 WAN
    "10.72.200.65"  # Botnet 2 WAN
)

echo ""
echo "Step 1: Installing required packages..."
sudo apt-get update -y
sudo apt-get install -y iptables iptables-persistent rsyslog

echo ""
echo "Step 2: Configuring iptables logging rules..."

# Enable kernel logging to /var/log/kern.log
if ! grep -q "kern\.\*" /etc/rsyslog.conf; then
    echo "kern.*                          -/var/log/kern.log" | sudo tee -a /etc/rsyslog.conf
    sudo systemctl restart rsyslog
fi

# Function to add iptables logging rule
add_log_rule() {
    local proto=$1
    local port=$2
    local prefix=$3

    # Check if rule already exists
    if ! sudo iptables -C INPUT -p $proto --dport $port -j LOG --log-prefix "$prefix" --log-level 4 2>/dev/null; then
        sudo iptables -I INPUT -p $proto --dport $port -j LOG --log-prefix "$prefix" --log-level 4
        echo "✓ Added logging for $proto:$port with prefix $prefix"
    else
        echo "  Rule already exists for $proto:$port"
    fi
}

# Log traffic to monitored application ports
echo ""
echo "Configuring application port logging..."
add_log_rule "tcp" "$HTTP_PORT" "IPTABLES_HTTP: "
add_log_rule "tcp" "$HTTPS_PORT" "IPTABLES_HTTPS: "
add_log_rule "tcp" "$BWAPP_PORT" "IPTABLES_BWAPP: "
add_log_rule "tcp" "$DVWA_PORT" "IPTABLES_DVWA: "
add_log_rule "tcp" "$JUICE_PORT" "IPTABLES_JUICE: "

# Log SYN packets from Red Team
echo ""
echo "Configuring Red Team SYN packet logging..."
for ip in "${RED_TEAM_IPS[@]}"; do
    if ! sudo iptables -C INPUT -p tcp --tcp-flags SYN,ACK,FIN,RST SYN -s $ip -j LOG --log-prefix "REDTEAM_SYN: " --log-level 4 2>/dev/null; then
        sudo iptables -I INPUT -p tcp --tcp-flags SYN,ACK,FIN,RST SYN -s $ip -j LOG --log-prefix "REDTEAM_SYN: " --log-level 4
        echo "✓ Added SYN logging for $ip"
    fi
done

# Log SYN from Red Team subnet
if ! sudo iptables -C INPUT -p tcp --tcp-flags SYN,ACK,FIN,RST SYN -s $RED_TEAM_SUBNET -j LOG --log-prefix "REDTEAM_SYN: " --log-level 4 2>/dev/null; then
    sudo iptables -I INPUT -p tcp --tcp-flags SYN,ACK,FIN,RST SYN -s $RED_TEAM_SUBNET -j LOG --log-prefix "REDTEAM_SYN: " --log-level 4
    echo "✓ Added SYN logging for Red Team subnet"
fi

# Log UDP packets from Red Team
echo ""
echo "Configuring Red Team UDP packet logging..."
for ip in "${RED_TEAM_IPS[@]}"; do
    if ! sudo iptables -C INPUT -p udp -s $ip -j LOG --log-prefix "REDTEAM_UDP: " --log-level 4 2>/dev/null; then
        sudo iptables -I INPUT -p udp -s $ip -j LOG --log-prefix "REDTEAM_UDP: " --log-level 4
        echo "✓ Added UDP logging for $ip"
    fi
done

if ! sudo iptables -C INPUT -p udp -s $RED_TEAM_SUBNET -j LOG --log-prefix "REDTEAM_UDP: " --log-level 4 2>/dev/null; then
    sudo iptables -I INPUT -p udp -s $RED_TEAM_SUBNET -j LOG --log-prefix "REDTEAM_UDP: " --log-level 4
    echo "✓ Added UDP logging for Red Team subnet"
fi

# Log ICMP packets from Red Team
echo ""
echo "Configuring Red Team ICMP packet logging..."
for ip in "${RED_TEAM_IPS[@]}"; do
    if ! sudo iptables -C INPUT -p icmp -s $ip -j LOG --log-prefix "REDTEAM_ICMP: " --log-level 4 2>/dev/null; then
        sudo iptables -I INPUT -p icmp -s $ip -j LOG --log-prefix "REDTEAM_ICMP: " --log-level 4
        echo "✓ Added ICMP logging for $ip"
    fi
done

if ! sudo iptables -C INPUT -p icmp -s $RED_TEAM_SUBNET -j LOG --log-prefix "REDTEAM_ICMP: " --log-level 4 2>/dev/null; then
    sudo iptables -I INPUT -p icmp -s $RED_TEAM_SUBNET -j LOG --log-prefix "REDTEAM_ICMP: " --log-level 4
    echo "✓ Added ICMP logging for Red Team subnet"
fi

echo ""
echo "Step 3: Making iptables rules persistent..."
sudo netfilter-persistent save
echo "✓ iptables rules saved"

echo ""
echo "Step 4: Verifying iptables rules..."
echo ""
sudo iptables -L INPUT -n -v --line-numbers | grep -E "REDTEAM|IPTABLES"

echo ""
echo "========================================="
echo "✅ DDoS Detection Setup Complete!"
echo "========================================="
echo ""
echo "Log files to monitor:"
echo "  - /var/log/kern.log (iptables logs)"
echo "  - /var/log/apache2/access.log (HTTP requests)"
echo "  - /var/log/apache2/error.log (Slowloris detection)"
echo ""
echo "Test logging with:"
echo "  sudo tail -f /var/log/kern.log | grep REDTEAM"
echo ""
echo "Next steps:"
echo "  1. Deploy ddos_defense_rules.xml to Wazuh Manager"
echo "  2. Update ossec.conf with log collection settings"
echo "  3. Restart wazuh-manager service"
echo ""
