# ddos_simulation

DDoS simulation written in Python using "scapy" and "multiprocessing" libraries. Used for educational purposes

![Screenshot](https://i.imgur.com/f9yRPDP.png)

## 🆕 NEW: Stop Attack Functionality

The distributed attack executor now supports **stopping attacks early**!

- ✅ Stop individual attacks by ID
- ✅ Stop all running attacks with one command
- ✅ Emergency stop script: `python3 stop_attacks.py`
- ✅ Background execution mode for better control

📖 **[Read the full guide](STOPPING_ATTACKS.md)**

Quick emergency stop:
```bash
python3 stop_attacks.py  # Stops all attacks on all Red Team VMs
```

## Options:

There are multiple DDoS attack types supported (network floods + target-local stress):

- Flood

- Teardrop

- Black nurse

- HPING heavy packet floods (large payloads) - `hping3` with large -d to stress packet processing

- Target-local CPU stress (`target_stress_cpu`) and Memory stress (`target_stress_mem`) using `stress-ng` or a fallback helper script

**Safety**: Target-local stress runs CPU/memory load on the target host — only use on isolated lab/cyber-range VMs.

You can set different options filling the "config.py" file:

- IP address

- Number of IPs

- Number of packets per IP

- Interface

- Type of attack

- Origin of IP addresses ("ips.txt" file or random addresses)

- Threads



## Requirements

Python 2.x:

```
pip install scapy
```

Python 3.x:

```
pip3 install scapy
```

## Note

Tested both in Python2.x (2.7.15rc1) and Python 3.x (3.6.7)
