#!/bin/bash
# DDoS Detection Validation Script
# Run on Wazuh Manager (10.72.200.55) after deployment

echo "========================================="
echo "DDoS Detection Validation"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        ((FAILED++))
    fi
}

echo "Test 1: Checking Wazuh Manager status..."
sudo systemctl is-active wazuh-manager > /dev/null 2>&1
test_result $? "Wazuh Manager service running"

echo ""
echo "Test 2: Checking custom rules file..."
if [ -f "/var/ossec/etc/rules/local_rules.xml" ]; then
    grep -q "200100" /var/ossec/etc/rules/local_rules.xml
    test_result $? "DDoS detection rules (200xxx) exist"
else
    test_result 1 "local_rules.xml not found"
fi

echo ""
echo "Test 3: Validating rule syntax..."
sudo /var/ossec/bin/wazuh-logtest-legacy -t 2>&1 | grep -q "CRITICAL"
if [ $? -eq 1 ]; then
    test_result 0 "No CRITICAL errors in rules"
else
    test_result 1 "CRITICAL errors found in rules"
fi

echo ""
echo "Test 4: Checking active response configuration..."
grep -q "firewall-drop" /var/ossec/etc/ossec.conf
test_result $? "Active response configured"

grep -q "200101\|200201\|200301" /var/ossec/etc/ossec.conf
test_result $? "DDoS rules linked to active response"

echo ""
echo "Test 5: Checking agent connectivity..."
ACTIVE_AGENTS=$(sudo /var/ossec/bin/agent_control -l | grep -c "Active")
if [ $ACTIVE_AGENTS -gt 0 ]; then
    test_result 0 "$ACTIVE_AGENTS Blue Team agent(s) connected"
else
    test_result 1 "No active agents found"
fi

echo ""
echo "Test 6: Testing log pattern matching..."
echo 'Dec 22 10:30:15 blue-team kernel: REDTEAM_SYN: IN=ens3 OUT= SRC=10.72.200.62 DST=10.72.200.51 PROTO=TCP DPT=9080' | sudo /var/ossec/bin/wazuh-logtest 2>&1 | grep -q "200100"
test_result $? "SYN flood pattern detection (Rule 200100)"

echo 'Dec 22 10:30:15 blue-team kernel: REDTEAM_UDP: IN=ens3 OUT= SRC=10.72.200.62 DST=10.72.200.51 PROTO=UDP DPT=53' | sudo /var/ossec/bin/wazuh-logtest 2>&1 | grep -q "200200"
test_result $? "UDP flood pattern detection (Rule 200200)"

echo 'Dec 22 10:30:15 blue-team kernel: REDTEAM_ICMP: IN=ens3 OUT= SRC=10.72.200.62 DST=10.72.200.51 PROTO=ICMP TYPE=8' | sudo /var/ossec/bin/wazuh-logtest 2>&1 | grep -q "200300"
test_result $? "ICMP flood pattern detection (Rule 200300)"

echo ""
echo "Test 7: Checking log collection..."
grep -q "kern.log\|syslog" /var/ossec/etc/ossec.conf
test_result $? "Kernel/syslog collection configured"

grep -q "apache2/access.log\|httpd/access" /var/ossec/etc/ossec.conf
test_result $? "Apache access log collection configured"

grep -q "apache2/error.log\|httpd/error" /var/ossec/etc/ossec.conf
test_result $? "Apache error log collection configured (Slowloris)"

echo ""
echo "========================================="
echo "Validation Summary"
echo "========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! DDoS detection is ready.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run setup_ddos_logging.sh on Blue Team servers"
    echo "  2. Launch test attack from Red Team VM"
    echo "  3. Monitor: sudo tail -f /var/ossec/logs/alerts/alerts.log"
    exit 0
else
    echo -e "${YELLOW}⚠ Some tests failed. Review configuration.${NC}"
    echo ""
    echo "Common fixes:"
    echo "  - Deploy ddos_defense_rules.xml to /var/ossec/etc/rules/local_rules.xml"
    echo "  - Update ossec.conf with log collection settings"
    echo "  - Restart: sudo systemctl restart wazuh-manager"
    exit 1
fi
