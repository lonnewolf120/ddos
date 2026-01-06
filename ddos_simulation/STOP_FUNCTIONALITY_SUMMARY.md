# ✅ DDoS Attack Simulator - Stop Functionality Fixed!

## Problem

The DDoS attack simulator had **no way to stop attacks early**. Once launched, attacks would run for their full duration (e.g., 5-10 minutes) even if you wanted to stop them sooner.

## Root Cause

1. ❌ Attacks ran synchronously - SSH connection waited for completion
2. ❌ No process tracking - didn't know which processes to kill
3. ❌ No stop methods - no API to terminate running attacks
4. ❌ No background mode - attacks blocked until timeout

## Solution Implemented

### 1️⃣ Added Background Execution Mode

All attack methods now support `background=True`:
```python
orchestrator.execute_http_flood(
    attacker_vm="10.72.200.62",
    target_ip="10.72.200.54",
    port=9080,
    duration=600,
    background=True  # ✅ NEW! Returns immediately
)
```

**How it works:**
- Background mode: Uses `nohup ... > log 2>&1 &` to run in background
- Synchronous mode: Uses `timeout ... 2>&1 | tee log` (old behavior)

### 2️⃣ Added Process Tracking

Each attack now tracks its process name:
```python
@dataclass
class AttackResult:
    # ... existing fields ...
    process_name: Optional[str] = None  # ✅ NEW!
```

Process mappings:
- `hping3` → SYN/UDP floods
- `slowloris` → Slow HTTP attacks
- `python3.*goldeneye` → HTTP floods
- `python3.*scapy_ddos` → Scapy-based attacks

### 3️⃣ Added Stop Methods

**Stop Individual Attack:**
```python
orchestrator.stop_attack(attack_id)
# Returns: True/False
```

**Stop All Attacks:**
```python
orchestrator.stop_all_attacks()
# Returns: {"attack_id_1": True, "attack_id_2": True, ...}
```

**How stop works:**
1. Looks up attack by ID
2. Gets attacker VM IP and process name
3. SSHs to VM: `sudo pkill -9 -f '<process_name>'`
4. Updates status to "stopped"
5. Sets end_time to current timestamp

### 4️⃣ Added Emergency Stop Script

**File:** `stop_attacks.py`

```bash
python3 stop_attacks.py
```

Kills all attack processes on all Red Team VMs:
- Connects to 10.72.200.62, 10.72.200.64, 10.72.200.65
- Runs `sudo pkill -9 -f hping3`
- Runs `sudo pkill -9 -f slowloris`
- Runs `sudo pkill -9 -f goldeneye`
- Runs `sudo pkill -9 -f scapy_ddos`

### 5️⃣ Updated Attack Status

New status values:
- `running` - Attack is executing ✅ NEW
- `completed` - Finished normally (timeout)
- `failed` - Error occurred
- `stopped` - Terminated early ✅ NEW

## Usage Examples

### Example 1: Launch and Stop

```python
from distributed_ddos_executor import DDoSOrchestrator
import time

orchestrator = DDoSOrchestrator()

# Launch attack
attack_ids = orchestrator.execute_distributed_attack(
    attack_type="syn_flood",
    target_team="team1",
    target_port=9080,
    duration=600,  # 10 minutes
    background=True  # ✅ Required for early stopping
)

# Run for 1 minute
time.sleep(60)

# Stop it
orchestrator.stop_all_attacks()
```

### Example 2: Emergency Stop

```bash
# From command line
cd /home/iftee/Documents/Projects/attackers/ddos/ddos_simulation
python3 stop_attacks.py
```

Output:
```
============================================================
🛑 EMERGENCY STOP - All DDoS Attacks
============================================================

🛑 Stopping attacks on 10.72.200.62...
   ✅ Stopped: sudo pkill -9 -f hping3
   ℹ️  No process: sudo pkill -9 -f slowloris
   ✅ Stopped: sudo pkill -9 -f goldeneye
✅ Completed on 10.72.200.62

🛑 Stopping attacks on 10.72.200.64...
   ℹ️  No process: sudo pkill -9 -f hping3
...
============================================================
✅ All attack processes stopped!
============================================================
```

## Files Modified

1. **distributed_ddos_executor.py**
   - Added `process_name` to `AttackResult` dataclass
   - Added `background` parameter to all execute methods
   - Added `stop_attack()` method
   - Added `stop_all_attacks()` method
   - Updated status tracking

2. **Created: stop_attacks.py**
   - Standalone emergency stop utility
   - Kills all attack processes on all Red Team VMs

3. **Created: STOPPING_ATTACKS.md**
   - Complete guide to stop functionality
   - Examples and troubleshooting

4. **Created: QUICK_API_REFERENCE.md**
   - API reference for all stop methods
   - Process name mappings
   - Code examples

5. **Updated: README.md**
   - Added stop functionality announcement
   - Link to full guide

## Testing

### Test 1: Background Launch and Stop

```python
# Launch
attack_ids = orchestrator.execute_distributed_attack(
    attack_type="http_flood",
    target_team="team1",
    target_port=9080,
    duration=300,
    background=True
)

# Check it's running
status = orchestrator.get_attack_status(attack_ids[0])
assert status['status'] == 'running'

# Stop it
success = orchestrator.stop_attack(attack_ids[0])
assert success == True

# Verify stopped
status = orchestrator.get_attack_status(attack_ids[0])
assert status['status'] == 'stopped'
assert status['end_time'] is not None
```

### Test 2: Emergency Stop Script

```bash
# Launch attack manually
ssh mist@10.72.200.62
sudo hping3 -S -p 9080 --flood --rand-source 10.72.200.54 &

# From workstation
python3 stop_attacks.py
# Should kill the hping3 process

# Verify
ssh mist@10.72.200.62
ps aux | grep hping3
# Should return nothing
```

## Backward Compatibility

✅ **100% Backward Compatible**

- `background` parameter defaults to `False` (old behavior)
- All existing code continues to work
- Synchronous mode unchanged
- Only new feature: add `background=True` to enable stopping

Example:
```python
# OLD CODE - Still works exactly the same
attack_id = orchestrator.execute_syn_flood(
    "10.72.200.62",
    "10.72.200.54",
    port=9080,
    duration=60
)
# Blocks for 60 seconds, returns when complete

# NEW CODE - Can be stopped early
attack_id = orchestrator.execute_syn_flood(
    "10.72.200.62",
    "10.72.200.54",
    port=9080,
    duration=600,
    background=True  # ✅ NEW!
)
# Returns immediately, can call stop_attack(attack_id)
```

## Key Benefits

✅ **Control** - Stop attacks anytime
✅ **Testing** - Quick test cycles without waiting
✅ **Safety** - Emergency kill switch
✅ **Flexibility** - Choose sync or async execution
✅ **Visibility** - Track "running" vs "stopped" vs "completed"

## Next Steps

1. ✅ Test stop functionality with live attacks
2. ✅ Verify all attack types can be stopped
3. ✅ Test emergency stop script on all VMs
4. ✅ Add stop button to visualization dashboard (future)

## Documentation

- **Full Guide:** [STOPPING_ATTACKS.md](STOPPING_ATTACKS.md)
- **API Reference:** [QUICK_API_REFERENCE.md](QUICK_API_REFERENCE.md)
- **Emergency Script:** [stop_attacks.py](stop_attacks.py)

---

**The DDoS attack simulator now has full start/stop control! 🎮**
