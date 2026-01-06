#!/usr/bin/env bash
set -euo pipefail

# deploy_rules.sh
# Copies the local rules file to the Wazuh Manager and restarts the manager.
# Replace MANAGER_USER and MANAGER_HOST with your values.

MANAGER_USER="youruser"
MANAGER_HOST="10.72.200.55"
LOCAL_RULES_FILE="local_rules_attacks.xml"
REMOTE_TMP="/tmp/${LOCAL_RULES_FILE}"
REMOTE_RULES_PATH="/var/ossec/etc/rules/local_rules.xml"

if [[ ! -f "$LOCAL_RULES_FILE" ]]; then
  echo "ERROR: $LOCAL_RULES_FILE not found in the current directory."
  exit 2
fi

echo "Copying $LOCAL_RULES_FILE to ${MANAGER_HOST}:/tmp/"
scp "$LOCAL_RULES_FILE" "${MANAGER_USER}@${MANAGER_HOST}:${REMOTE_TMP}"

echo "Moving into place and restarting Wazuh Manager (requires sudo on manager)"
ssh "${MANAGER_USER}@${MANAGER_HOST}" "sudo mv '${REMOTE_TMP}' '${REMOTE_RULES_PATH}' && sudo systemctl restart wazuh-manager && echo 'Wazuh manager restarted'"

echo "Done. Check the Wazuh dashboard at https://10.72.200.55 (your manager host) to view alerts."

# To push to an agent instead (for local rule testing), you can copy to the agent's /var/ossec/etc/rules/local_rules.xml
# and restart wazuh-agent. Example (uncomment and edit AGENT_HOST and AGENT_USER):
# AGENT_USER="youruser"
# AGENT_HOST="10.72.200.54"
# scp "$LOCAL_RULES_FILE" "${AGENT_USER}@${AGENT_HOST}:/tmp/${LOCAL_RULES_FILE}"
# ssh "${AGENT_USER}@${AGENT_HOST}" "sudo mv /tmp/${LOCAL_RULES_FILE} /var/ossec/etc/rules/local_rules.xml && sudo systemctl restart wazuh-agent"

exit 0
