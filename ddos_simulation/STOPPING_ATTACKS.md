# Stopping DDoS Attacks

## Overview

The DDoS attack simulator now supports **stopping attacks early** before their duration expires. This is useful for testing, demonstrations, or emergency situations.

## What Changed

### ✅ New Features

1. **Background Execution Mode**: Attacks can now run in the background, allowing immediate return control
2. **Stop Individual Attacks**: Stop specific attacks by their attack ID
3. **Stop All Attacks**: Emergency stop for all running attacks
4. **Process Tracking**: Each attack tracks its process name for reliable termination
5. **Status Updates**: Attack status includes "running", "completed", "failed", and "stopped"

### 🔧 Updated Methods

All attack execution methods now support a `background` parameter:

```python
execute_http_flood(attacker_vm, target_ip, port, workers, sockets, duration, background=False)
execute_syn_flood(attacker_vm, target_ip, port, duration, background=False)
execute_udp_flood(attacker_vm, target_ip, port, duration, background=False)
execute_slowloris(attacker_vm, target_ip, port, sockets, duration, background=False)
execute_scapy_flood(attacker_vm, target_ip, port, attack_type, duration, background=False)
```

### 🆕 New Methods

```python
# Stop a specific attack
orchestrator.stop_attack(attack_id) -> bool

# Stop all running attacks
orchestrator.stop_all_attacks() -> Dict[str, bool]
```

## Usage Examples

### Example 1: Stop Individual Attack

```python
from distributed_ddos_executor import DDoSOrchestrator

orchestrator = DDoSOrchestrator()

# Launch attack in background
attack_ids = orchestrator.execute_distributed_attack(
    attack_type="syn_flood",
    target_team="team1",
    target_port=9080,
    duration=300,  # 5 minutes max
    background=True  # Run in background
)

# Let it run for 30 seconds
import time
time.sleep(30)

# Stop the first attack
attack_id = attack_ids[0]
if orchestrator.stop_attack(attack_id):
    print(f"✅ Stopped attack {attack_id}")
else:
    print(f"❌ Failed to stop attack {attack_id}")
```

### Example 2: Stop All Attacks

```python
# Launch multiple attacks
orchestrator.execute_distributed_attack(
    attack_type="http_flood",
    target_team="team1",
    target_port=9080,
    duration=600,
    background=True
)

# Later... stop everything
results = orchestrator.stop_all_attacks()
for attack_id, success in results.items():
    print(f"Attack {attack_id}: {'Stopped' if success else 'Failed'}")
```

### Example 3: Emergency Stop Script

For quick emergency stops, use the provided utility script:

```bash
cd /home/iftee/Documents/Projects/attackers/ddos/ddos_simulation
python3 stop_attacks.py
```

This will immediately kill all attack processes on all Red Team VMs:
- `hping3` (SYN/UDP floods)
- `slowloris`
- `goldeneye.py` (HTTP flood)
- `scapy_ddos.py`
- `hulk.py`

## How It Works

### Background vs Synchronous Execution

**Background Mode (`background=True`)**:
- Command runs with `nohup ... &` in the background
- Returns immediately with status "running"
- Can be stopped early with `stop_attack()`
- SSH connection closes immediately

**Synchronous Mode (`background=False`)**:
- Command runs in foreground
- Waits for completion (respects duration)
- Returns with status "completed" or "failed"
- SSH connection stays open until done

### Process Tracking

Each attack tracks its process name:
- `hping3` → SYN/UDP floods
- `slowloris` → Slowloris attacks
- `python3.*goldeneye` → HTTP floods (GoldenEye)
- `python3.*scapy_ddos` → Scapy-based floods

### Stop Mechanism

When you call `stop_attack()`:
1. Looks up the attack by ID
2. Gets the attacker VM and process name
3. SSHs to the VM
4. Runs: `sudo pkill -9 -f '<process_name>'`
5. Updates attack status to "stopped"
6. Sets end_time to current timestamp

## Attack Status

Check attack status at any time:

```python
status = orchestrator.get_attack_status(attack_id)
print(f"Status: {status['status']}")  # running, completed, failed, or stopped
print(f"Started: {status['start_time']}")
print(f"Ended: {status['end_time']}")  # None if still running
```

## Complete Example

```python
#!/usr/bin/env python3
from distributed_ddos_executor import DDoSOrchestrator
import time

orchestrator = DDoSOrchestrator()

# Launch attacks
print("🚀 Launching attacks...")
attack_ids = orchestrator.execute_distributed_attack(
    attack_type="scapy_syn",
    target_team="team1",
    target_port=9080,
    duration=600,  # 10 minutes
    num_attackers=2,
    background=True  # Enable background mode
)

print(f"✅ {len(attack_ids)} attacks launched")

# Let them run
print("⏳ Attacks running for 60 seconds...")
time.sleep(60)

# Check status
for attack_id in attack_ids:
    status = orchestrator.get_attack_status(attack_id)
    print(f"Attack {attack_id}: {status['status']}")

# Stop all
print("\n🛑 Stopping all attacks...")
orchestrator.stop_all_attacks()

# Verify they stopped
print("\n📊 Final status:")
for attack_id in attack_ids:
    status = orchestrator.get_attack_status(attack_id)
    print(f"  {attack_id}: {status['status']}")

# Export results
orchestrator.export_results("/tmp/attack_results.json")
print("\n💾 Results saved!")
```

## Troubleshooting

### Attack Won't Stop

If `stop_attack()` returns False:

1. **Check SSH connectivity**: Verify you can SSH to the attacker VM
2. **Verify process is running**: SSH to the VM and run `ps aux | grep <tool_name>`
3. **Check sudo permissions**: Ensure your user can run `sudo pkill -9`
4. **Manual kill**: SSH to VM and run `sudo pkill -9 -f hping3` (or other tool)

### Process Still Running After Stop

If the process continues after calling stop:

```bash
# SSH to the Red Team VM
ssh mist@10.72.200.62

# Find the process
ps aux | grep hping3

# Kill it manually
sudo pkill -9 -f hping3

# Or kill by PID
sudo kill -9 <PID>
```

### Emergency Manual Stop

To stop ALL attacks manually on a Red Team VM:

```bash
ssh mist@10.72.200.62
sudo pkill -9 -f "hping3|slowloris|goldeneye|scapy_ddos|hulk"
```

## Best Practices

1. ✅ **Always use background mode** for long-running attacks you may want to stop
2. ✅ **Track attack IDs** - save them for later stopping
3. ✅ **Monitor attack status** - check periodically during execution
4. ✅ **Use emergency stop script** - keep `stop_attacks.py` handy
5. ✅ **Export results** - call `export_results()` after stopping to save data

## Attack Lifecycle

```
[Launch] → running → [Stop] → stopped
                  ↘ [Timeout] → completed
                  ↘ [Error] → failed
```

## Notes

- Stopping an attack that's already completed/failed/stopped has no effect
- Background attacks return immediately but may take 1-2 seconds to start
- The `timeout` command will still terminate after duration, even in background mode
- Stopped attacks have `end_time` set to when `stop_attack()` was called
