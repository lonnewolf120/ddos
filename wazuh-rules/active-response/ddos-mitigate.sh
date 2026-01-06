#!/bin/bash

# DDoS Mitigation Script for Wazuh Active Response
# Location: /var/ossec/active-response/bin/ddos-mitigate.sh
# Permissions: chmod 750 ddos-mitigate.sh && chown root:wazuh ddos-mitigate.sh

# ============================================================================
# Script Variables
# ============================================================================

ACTION=$1
USER=$2
IP=$3
ALERT_ID=$4
RULE_ID=$5

LOG_FILE="/var/ossec/logs/active-responses.log"
IPTABLES="/usr/sbin/iptables"
TC="/usr/sbin/tc"

# ============================================================================
# Functions
# ============================================================================

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - DDoS-Mitigate: $1" >> "$LOG_FILE"
}

# Block IP with iptables
block_ip() {
    local ip=$1

    # Check if IP is already blocked
    if ! $IPTABLES -L INPUT -v -n | grep -q "$ip"; then
        # Block all traffic from the IP
        $IPTABLES -I INPUT -s "$ip" -j DROP
        $IPTABLES -I FORWARD -s "$ip" -j DROP

        # Log connection attempts for analysis
        $IPTABLES -I INPUT -s "$ip" -j LOG --log-prefix "DDoS-BLOCKED: " --log-level 4

        log_message "Blocked IP: $ip (Rule: $RULE_ID)"

        # Add to ipset for faster lookups if available
        if command -v ipset &> /dev/null; then
            ipset -exist add ddos_blocklist "$ip"
        fi
    else
        log_message "IP already blocked: $ip"
    fi
}

# Unblock IP
unblock_ip() {
    local ip=$1

    # Remove iptables rules
    $IPTABLES -D INPUT -s "$ip" -j DROP 2>/dev/null
    $IPTABLES -D FORWARD -s "$ip" -j DROP 2>/dev/null
    $IPTABLES -D INPUT -s "$ip" -j LOG --log-prefix "DDoS-BLOCKED: " --log-level 4 2>/dev/null

    log_message "Unblocked IP: $ip"

    # Remove from ipset
    if command -v ipset &> /dev/null; then
        ipset del ddos_blocklist "$ip" 2>/dev/null
    fi
}

# Enable SYN Cookies (protection against SYN floods)
enable_syn_protection() {
    echo 1 > /proc/sys/net/ipv4/tcp_syncookies
    log_message "Enabled SYN cookies protection"
}

# Increase SYN backlog
increase_syn_backlog() {
    sysctl -w net.ipv4.tcp_max_syn_backlog=4096
    sysctl -w net.core.netdev_max_backlog=2000
    log_message "Increased SYN backlog limits"
}

# Rate limit ICMP
rate_limit_icmp() {
    # Limit ICMP echo requests to 1/second with burst of 5
    $IPTABLES -A INPUT -p icmp --icmp-type echo-request -m limit --limit 1/s --limit-burst 5 -j ACCEPT
    $IPTABLES -A INPUT -p icmp --icmp-type echo-request -j DROP
    log_message "Applied ICMP rate limiting"
}

# Rate limit new TCP connections
rate_limit_tcp() {
    local port=$1

    # Limit new connections to 20/minute per IP
    $IPTABLES -A INPUT -p tcp --dport "$port" -m state --state NEW -m recent --set
    $IPTABLES -A INPUT -p tcp --dport "$port" -m state --state NEW -m recent --update --seconds 60 --hitcount 20 -j DROP

    log_message "Applied TCP rate limiting on port $port"
}

# Apply traffic shaping for specific ports
apply_traffic_shaping() {
    local interface="eth0"  # Adjust to your interface

    # Clear existing rules
    $TC qdisc del dev "$interface" root 2>/dev/null

    # Add traffic control
    $TC qdisc add dev "$interface" root handle 1: htb default 10
    $TC class add dev "$interface" parent 1: classid 1:1 htb rate 100mbit
    $TC class add dev "$interface" parent 1:1 classid 1:10 htb rate 80mbit ceil 100mbit

    log_message "Applied traffic shaping on $interface"
}

# Block specific Red Team subnet
block_red_team_subnet() {
    local subnet="10.10.30.0/24"

    if ! $IPTABLES -L INPUT -v -n | grep -q "$subnet"; then
        $IPTABLES -I INPUT -s "$subnet" -j DROP
        $IPTABLES -I FORWARD -s "$subnet" -j DROP
        log_message "Blocked Red Team subnet: $subnet"
    fi
}

# Protect specific Blue Team ports
protect_blue_team_ports() {
    local ports=(9080 9090 3000 80 443)

    for port in "${ports[@]}"; do
        # Limit SYN packets
        $IPTABLES -A INPUT -p tcp --syn --dport "$port" -m connlimit --connlimit-above 50 -j REJECT --reject-with tcp-reset

        # Limit overall connections per IP
        $IPTABLES -A INPUT -p tcp --dport "$port" -m connlimit --connlimit-above 100 --connlimit-mask 32 -j REJECT

        log_message "Applied connection limits on port $port"
    done
}

# Drop invalid packets
drop_invalid_packets() {
    $IPTABLES -A INPUT -m state --state INVALID -j DROP
    $IPTABLES -A FORWARD -m state --state INVALID -j DROP
    $IPTABLES -A OUTPUT -m state --state INVALID -j DROP
    log_message "Enabled invalid packet dropping"
}

# Mitigate IP spoofing attacks
mitigate_ip_spoofing() {
    # Enable reverse path filtering
    echo 1 > /proc/sys/net/ipv4/conf/all/rp_filter
    echo 1 > /proc/sys/net/ipv4/conf/default/rp_filter

    # Drop packets with private source IPs from WAN
    $IPTABLES -A INPUT -i eth0 -s 192.168.0.0/16 -j DROP
    $IPTABLES -A INPUT -i eth0 -s 172.16.0.0/12 -j DROP
    $IPTABLES -A INPUT -i eth0 -s 10.0.0.0/8 ! -s 10.10.0.0/16 ! -s 20.10.0.0/16 -j DROP

    log_message "Applied IP spoofing mitigation"
}

# Initialize ipset for blocklist
initialize_ipset() {
    if command -v ipset &> /dev/null; then
        # Create ipset if it doesn't exist
        ipset create ddos_blocklist hash:ip timeout 3600 2>/dev/null || true

        # Block traffic from ipset
        if ! $IPTABLES -L INPUT -v -n | grep -q "ddos_blocklist"; then
            $IPTABLES -I INPUT -m set --match-set ddos_blocklist src -j DROP
        fi

        log_message "Initialized ipset blocklist"
    fi
}

# ============================================================================
# Main Execution
# ============================================================================

case "$ACTION" in
    add)
        log_message "DDoS Attack Detected - Rule ID: $RULE_ID, Source IP: $IP"

        # Initialize protection mechanisms
        initialize_ipset
        enable_syn_protection
        increase_syn_backlog
        drop_invalid_packets
        mitigate_ip_spoofing

        # Block the attacking IP
        if [ -n "$IP" ] && [ "$IP" != "-" ]; then
            block_ip "$IP"
        fi

        # Apply port-specific protections
        protect_blue_team_ports

        # Rule-specific actions
        case "$RULE_ID" in
            100101|100102|100103|100104|100105|100106|100800)
                # SYN Flood
                rate_limit_tcp 9080
                rate_limit_tcp 9090
                rate_limit_tcp 3000
                rate_limit_tcp 80
                rate_limit_tcp 443
                ;;
            100301|100302|100303|100304|100305)
                # ICMP Flood
                rate_limit_icmp
                ;;
            100700|100701)
                # Distributed attack - block entire Red Team subnet
                block_red_team_subnet
                ;;
            100604)
                # IP Spoofing
                mitigate_ip_spoofing
                ;;
        esac

        ;;

    delete)
        log_message "Unblocking IP after timeout: $IP"

        if [ -n "$IP" ] && [ "$IP" != "-" ]; then
            unblock_ip "$IP"
        fi
        ;;

    *)
        log_message "Invalid action: $ACTION"
        exit 1
        ;;
esac

exit 0
