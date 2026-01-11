## GitHub Copilot / AI Agent Instructions — DDoS Visualization Dashboard

### Project Overview
Full-stack DDoS attack orchestration platform for cyber range training. Executes real distributed attacks via SSH to Red Team VMs targeting Blue Team infrastructure with real-time 3D/2D visualization.

**Tech Stack:**
- Frontend: Next.js 16 + React 19 + TypeScript 5 + Tailwind 4 + Three.js/React Three Fiber
- Backend: FastAPI + Paramiko (SSH execution) + WebSocket streaming
- Port 3000 (frontend) + 8841 (backend API)

---

### Quick Start Commands

**Start both services (development):**
```bash
# Terminal 1 - Backend (from project root)
cd backend && source venv/bin/activate && python main.py

# Terminal 2 - Frontend (from project root)
npm run dev

# Or use npm script (requires concurrently):
npm run dev:all
```

**Backend only:**
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python main.py  # Serves on 0.0.0.0:8841
```

**Frontend only:**
```bash
npm install
npm run dev  # Serves on localhost:3000
```

---

### Architecture & Critical Concepts

#### Network Topology (Cyber Range Specific)
**OPNsense LAN Routing Requirement:** Attacks MUST use only Red Team VMs with OPNsense LAN IPs (192.168.60.x) to ensure traffic routes through firewall for Blue Team detection training.

**Active Red Team VMs (with OPNsense LAN access):**
- `generator`: 10.10.30.50 → LAN 192.168.60.62 (WAN 10.72.200.62)
- `botnet1`: 10.10.30.60 → LAN 192.168.60.64 (WAN 10.72.200.64)
- `botnet2`: 10.10.30.60 → LAN 192.168.60.65 (WAN 10.72.200.65)

**Primary Blue Team Targets (Blue Team 2 only):**
- `team2`: 192.168.50.11 (Web Apps: DVWA, bWAPP, Juice Shop)
- `bank`: 192.168.50.101:3000 (Vulnerable Bank - Nginx→Flask)

**Hidden VMs:** Blue Team 1 & 3, Red Team scheduler/GUI (no OPNsense LAN IPs) - commented out in `backend/main.py` and `src/lib/network-data.ts`

#### Data Flow Pattern
```
Frontend UI → POST /api/attacks/execute → AttackOrchestrator.run_distributed_attack()
  → SSH to each source VM (using internal IPs 10.10.30.x)
  → Execute attack commands targeting LAN IPs (192.168.x.x)
  → WebSocket /api/attacks/{id}/ws streams logs back to frontend
  → AttackExecution dataclass tracks state in orchestrator.active_attacks dict
```

#### Custom Target Security Validation
Frontend and backend enforce 192.168.x.x IP range validation for custom targets:
- Frontend: Regex `^192\.168\.\d{1,3}\.\d{1,3}$` + octet range check
- Backend: Python `ipaddress` module + `startswith('192.168.')` check
- Returns 400 error if IP outside allowed range

---

### Project-Specific Conventions

#### 1. Dual Network Configuration Pattern
Every VM has multiple IPs serving different purposes:
```python
# backend/main.py pattern:
RED_TEAM_VMS = {
    "generator": {
        "ip": "10.10.30.50",      # Internal IP (used for SSH connections)
        "lan_ip": "192.168.60.62", # OPNsense LAN IP (used for attacks)
        "wan_ip": "10.72.200.62",  # WAN IP (used for status checks)
        # ...
    }
}
```
```typescript
// src/lib/network-data.ts mirrors this:
export const RED_TEAM_VMS: VMNode[] = [
  {
    id: "generator",
    ip: "10.10.30.50",
    lanIp: "192.168.60.62",
    wanIp: "10.72.200.62",
    // ...
  }
]
```

#### 2. Attack Tool Command Pattern
All attack commands in `ATTACK_TOOLS` dict use string formatting with specific placeholders:
```python
"syn_flood": {
    "command": "sudo timeout {duration} hping3 -S -p {port} --flood --rand-source {target}",
    "requires_sudo": True,
}
```
Commands are formatted in `execute_attack()` with `command.format(duration=..., port=..., target=...)`.

#### 3. Port-Specific UI Logic
Bank server (`id: 'bank'`) shows ONLY port 3000 in dropdown:
```typescript
// src/app/page.tsx ~line 833
{selectedTarget === 'bank' ? (
  <SelectItem value="3000">3000 (Bank Website)</SelectItem>
) : (
  // All other ports...
)}
```
Auto-sets port 3000 when bank selected (line ~776).

#### 4. WebSocket Broadcast Pattern
Backend maintains `websocket_connections[attack_id] = [websocket1, websocket2, ...]` dict. Use `broadcast_to_attack(attack_id, message)` to send updates to all connected clients for that attack.

#### 5. SSH Execution Threading
SSH commands are blocking I/O, so backend uses `ThreadPoolExecutor` (max 10 workers):
```python
ssh_executor = ThreadPoolExecutor(max_workers=10)
# In async context:
result = await asyncio.get_event_loop().run_in_executor(
    ssh_executor, SSHExecutor.execute_command, hostname, command
)
```

---

### Key Files & Their Roles

**Backend Core:**
- `backend/main.py` (876 lines): FastAPI app, attack orchestration, SSH execution, WebSocket streaming
  - Lines 1-140: Configuration (VMs, attack tools)
  - Lines 145-195: Data models (AttackExecution, AttackRequest, IPSpoofingRequest)
  - Lines 200-270: SSHExecutor class
  - Lines 373-565: AttackOrchestrator class (core attack logic)
  - Lines 620-876: FastAPI routes & WebSocket handlers

**Frontend Core:**
- `src/app/page.tsx` (~1436 lines): Main dashboard UI with attack configuration, VM selection, logs
  - Lines 101-106: BLUE_TEAM_VMS hardcoded array (must sync with network-data.ts)
  - Lines 268-330: State management (attack config, custom target, IP spoofing)
  - Lines 496-580: `executeAttack()` function with custom target validation
  - Lines 820-925: Port selection & custom target UI components

**Data Configuration:**
- `src/lib/network-data.ts`: VM topology exports (RED_TEAM_VMS, BLUE_TEAM_VMS, ATTACK_TYPES)
- `src/lib/types.ts`: TypeScript interfaces (VMNode, AttackFlow, AttackConfig)

**Visualization Components:**
- `src/components/CyberAttackMap.tsx`: 2D flow visualization with particle effects
- `src/components/NetworkAttackMap.tsx`: Network topology graph (Cytoscape.js)
- `src/components/InteractiveNetworkTopology.tsx`: Advanced interactive topology
- `src/components/IsometricAttackMap.tsx`: 3D isometric view (Three.js)

---

### Common Development Tasks

#### Adding a New Attack Type
1. Add tool to `ATTACK_TOOLS` dict in `backend/main.py` with command template
2. Add type to `AttackType` union in `src/lib/types.ts`
3. Add entry to `ATTACK_TYPES` array in `src/lib/network-data.ts` with color/description
4. Tool must be pre-installed on Red Team VMs (e.g., `/opt/GoldenEye`)

#### Adding a New VM
1. Add to `RED_TEAM_VMS` or `BLUE_TEAM_TARGETS` in `backend/main.py`
2. Add to corresponding array in `src/lib/network-data.ts`
3. If Blue Team target, add to `BLUE_TEAM_VMS` in `src/app/page.tsx` (line ~101)
4. Ensure VM has required fields: `ip`, `lan_ip` (if OPNsense routing), `wan_ip`, `name`, `role`

#### Debugging SSH Connection Issues
```bash
# Test SSH manually from control machine:
ssh mist@10.10.30.50  # Password: Cyber#Range

# Check backend logs for connection errors:
cd backend && python main.py
# Look for "⚡ Executing on..." log lines

# Verify VM has attack tools:
ssh mist@10.10.30.50 'which hping3 && which slowloris'
```

#### Testing Attack Execution Without UI
```bash
# Start backend
cd backend && source venv/bin/activate && python main.py

# Use API docs at http://localhost:8841/docs to test POST /api/attacks/execute
# Or curl:
curl -X POST http://localhost:8841/api/attacks/execute \
  -H "Content-Type: application/json" \
  -d '{
    "attack_type": "http_flood",
    "source_vms": ["generator"],
    "target_id": "bank",
    "target_port": 3000,
    "duration": 60
  }'
```

---

### Integration Points & Dependencies

**SSH Credentials:** Hardcoded as `SSH_USERNAME=mist`, `SSH_PASSWORD=Cyber#Range` (can override via .env)

**Attack Tools on Red Team VMs:**
- `/opt/GoldenEye/goldeneye.py` (HTTP flood)
- `/opt/hulk/hulk.py` (HULK HTTP flood)
- `hping3` (SYN/UDP/ICMP floods - requires sudo)
- `slowloris` (Slowloris attack)

**API Endpoints:**
- `GET /api/health` - Backend health check
- `GET /api/vms/red-team` - Red Team VM list
- `GET /api/vms/blue-team` - Blue Team target list
- `POST /api/attacks/execute` - Launch attack
- `POST /api/attacks/{id}/stop` - Stop attack
- `WS /api/attacks/{id}/ws` - Real-time attack logs
- `POST /api/ip-spoofing/generate` - Generate spoofed IPs

**Frontend-Backend Communication:**
- REST API for attack control (fetch to `http://localhost:8841`)
- WebSocket for real-time logs (connects after attack launch)
- No authentication/CORS configured (cyber range isolated network)

---

### Important Constraints & Gotchas

1. **Never remove OPNsense LAN IP filtering** - attacks must route through firewall for Blue Team SIEM/IDS detection
2. **Bank port restriction** - bank server MUST show only port 3000 (not 9080/9090)
3. **Custom target validation** - enforce 192.168.x.x range in both frontend and backend
4. **SSH timeout handling** - commands use `timeout` wrapper, exit code 124 is success (attack completed)
5. **VM status checks** - backend pings WAN IPs (10.72.200.x) but attacks use LAN IPs (192.168.x.x)
6. **State synchronization** - `BLUE_TEAM_VMS` hardcoded in page.tsx must match network-data.ts exports
7. **Attack duration limits** - UI enforces 10-600 seconds, backend has no hard limit

---

### Helpful Documentation Files
- `README.md` - Setup & usage guide
- `SYSTEM_ARCHITECTURE.md` - Detailed architecture diagrams
- `OPNSENSE_LAN_ONLY.md` - Network routing requirements
- `IMPLEMENTATION_GUIDE.md` - Feature implementation details
- `NETWORK_MAP_GUIDE.md` - Visualization component docs

For questions about network topology, VM IPs, or OPNsense routing requirements, always reference `OPNSENSE_LAN_ONLY.md` and `backend/main.py` configuration sections.
