# DDoS Visualization Dashboard

A standalone, self-contained DDoS attack simulation and visualization dashboard for Cyber Range training environments. This project is completely separate and isolated from the main Cyber Range backend.

## 📋 Overview

This dashboard provides:
- **Network Topology Visualization**: Visual representation of Red Team (attackers) and Blue Team (targets) VMs
- **Network Attack Map** ⭐ NEW: Real-time packet flow visualization with animated attack paths from source to target machines
- **Cyber Attack Map**: Interactive real-time attack visualization with particle effects and network flow animations
- **Real Attack Execution**: Executes actual DDoS attacks via SSH to Red Team VMs
- **Real-time Monitoring**: WebSocket-based live attack logs and status updates
- **Multiple Attack Types**: SYN Flood, UDP Flood, HTTP Flood (GoldenEye), Slowloris, ICMP Flood, HULK
- **Distributed Attacks**: Launch attacks from multiple source VMs simultaneously
- **Analytics Dashboard**: Attack statistics, VM status monitoring, and configuration summaries

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DDoS Visualization Dashboard                  │
└─────────────────────────────────────────────────────────────────┘

Frontend (Next.js 15 + React 19)     Backend (FastAPI + Paramiko)
├── Port: 3000                        ├── Port: 8841
├── Network Topology Visualization    ├── SSH Execution Engine
├── Attack Configuration UI           ├── Attack Orchestration
├── Real-time Log Viewer              ├── WebSocket Streaming
└── Attack Status Dashboard           └── VM Connectivity Checks
         │                                      │
         └──────────────────────────────────────┘
                         │
                    SSH over Port 22
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
   Red Team VMs                    Blue Team VMs
   (Attack Sources)                (Attack Targets)
   10.72.200.61-65                 10.72.200.51,54,57
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ for frontend
- Python 3.10+ for backend
- SSH access to Red Team VMs (credentials: mist / Cyber#Range)
- Attack tools installed on Red Team VMs (hping3, GoldenEye, Slowloris)

### 1. Start the Backend API

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment (optional - defaults work for Cyber Range)
cp .env.example .env
# Edit .env if needed

# Start the server
python main.py
# Or with uvicorn directly:
# uvicorn main:app --host 0.0.0.0 --port 8841 --reload
```

The API will be available at: `http://localhost:8841`
API Docs (Swagger): `http://localhost:8841/docs`

### 2. Start the Frontend

```bash
# In the project root directory
npm install
npm run dev
```

The dashboard will be available at: `http://localhost:3000`

### 3. Both at Once (Development)

```bash
# Terminal 1 - Backend
cd backend && source venv/bin/activate && python main.py

# Terminal 2 - Frontend
npm run dev
```

## 🔧 Configuration

### Backend Environment Variables (`.env`)

```bash
# SSH Configuration
SSH_USERNAME=mist
SSH_PASSWORD=Cyber#Range
SSH_PORT=22
SSH_KEY_PATH=  # Optional: path to SSH private key

# API Configuration
API_HOST=0.0.0.0
API_PORT=8841
```

### Frontend Environment Variables (`.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8841
```

## 🎯 Network Configuration

### Red Team VMs (Attack Sources)

| VM ID | Name | IP | Role |
|-------|------|-----|------|
| scheduler | Attack Scheduler | 10.72.200.61 | Coordination |
| generator | Attack Generator | 10.72.200.62 | Primary Attacker |
| gui | Red Team GUI | 10.72.200.63 | C2 Interface |
| botnet1 | Botnet Generator 1 | 10.72.200.64 | Distributed Attack |
| botnet2 | Botnet Generator 2 | 10.72.200.65 | Distributed Attack |

### Blue Team VMs (Attack Targets)

| Team ID | Name | IP | Services |
|---------|------|-----|----------|
| team1 | Blue Team 1 | 10.72.200.51 | DVWA:9080, bWAPP:9090, Juice:3000 |
| team2 | Blue Team 2 | 10.72.200.54 | DVWA:9080, bWAPP:9090, Juice:3000 |
| team3 | Blue Team 3 | 10.72.200.57 | DVWA:9080, bWAPP:9090, Juice:3000 |

## ⚔️ Attack Types

| Attack | Tool | Description | Requires Sudo |
|--------|------|-------------|---------------|
| SYN Flood | hping3 | TCP SYN flood with random source IPs | Yes |
| UDP Flood | hping3 | UDP packet flood with random sources | Yes |
| HTTP Flood | GoldenEye | HTTP GET/POST flood with keep-alive | No |
| Slowloris | slowloris | Slow HTTP headers to exhaust connections | No |
| ICMP Flood | hping3 | ICMP echo request flood | Yes |
| HULK | HULK | HTTP Unbearable Load King flood | No |

## 📡 API Endpoints

### Health & Status
- `GET /` - Service info
- `GET /api/health` - Health check

### VMs
- `GET /api/vms/red-team` - List Red Team VMs with status
- `GET /api/vms/blue-team` - List Blue Team targets
- `GET /api/vm/{vm_id}/check` - Check VM connectivity

### Attacks
- `GET /api/attack-types` - List available attack types
- `POST /api/attacks/execute` - Execute attack
- `GET /api/attacks` - List active attacks
- `GET /api/attacks/{attack_id}` - Get attack status
- `POST /api/attacks/{attack_id}/stop` - Stop attack
- `WS /api/attacks/{attack_id}/ws` - WebSocket for real-time updates

### Tools
- `POST /api/tools/install/{vm_id}` - Install attack tools on VM

## 🛠️ Installing Attack Tools on VMs

The dashboard can automatically install required attack tools on Red Team VMs:

```bash
# Via API
curl -X POST http://localhost:8841/api/tools/install/generator

# Or manually on VM
ssh mist@10.72.200.62
sudo apt-get update -y
sudo apt-get install -y hping3 python3-pip git
pip3 install slowloris requests

cd /opt
sudo git clone https://github.com/jseidl/GoldenEye.git
sudo git clone https://github.com/grafov/hulk.git
```

## 📊 Usage Example

### Network Topology Tab
1. **Select Source VMs**: Click on Red Team VMs to select attack sources
2. **Select Target**: Click on a Blue Team VM as the target
3. **Configure Attack**:
   - Choose attack type (SYN Flood, HTTP Flood, etc.)
   - Set target port (9080 for DVWA, 9090 for bWAPP, etc.)
   - Configure duration, workers, sockets
4. **Launch Attack**: Click "Launch Attack" button
5. **Monitor**: Watch real-time logs and attack progress
6. **Stop**: Click "Stop Attack" to terminate early

### Attack Visualization Tab
- **Cyber Attack Map**: Interactive network visualization showing:
  - Red Team VMs (left side) - Attack sources with animated indicators
  - Blue Team VMs (right side) - Target systems with threat indicators
  - Real-time particle effects flowing from attackers to targets
  - Animated attack flows with color-coded packet streams
  - Central attack status indicator with rotation animation
  - Live statistics overlay (sources, flows, packet count)
  - Connection lines showing attack paths
  - Pulsing indicators on active VMs
  - Background grid for depth perception
- **Live Attack Logs**: Real-time log viewer below the map
- **Visual Indicators**:
  - 🔴 Red border/glow = Active attacker
  - 🟡 Yellow border/glow = Under attack
  - 🟢 Green = Online
  - ⚫ Gray = Offline
  - ⚡ Lightning icon = Attacking
  - ⚠️ Alert icon = Target
  - 🛡️ Shield icon = Idle defender

### Analytics Tab
- **Attack Statistics**: Total attacks, active sources, log entries, status
- **VM Status Summary**: Red Team and Blue Team online/offline counts with progress bars
- **Configuration Summary**: Current attack type, port, duration, workers, sockets
- **Recent Activity**: Last 10 log entries for quick review

## 🔐 Security Notes

- This tool is for authorized security testing only
- All attacks are logged and traceable
- SSH credentials should be rotated in production
- Network is isolated (10.72.200.0/24 subnet)
- Never use against unauthorized targets

## 📁 Project Structure

```
ddos-visualization-dashboard/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment template
│   └── .env                  # Local configuration (gitignored)
├── src/
│   ├── app/
│   │   ├── page.tsx         # Main dashboard component
│   │   ├── layout.tsx       # App layout
│   │   └── globals.css      # Global styles
│   ├── components/
│   │   └── ui/              # shadcn/ui components
│   └── lib/
│       ├── types.ts         # TypeScript interfaces
│       ├── network-data.ts  # VM configurations
│       └── utils.ts         # Utility functions
├── .env.local               # Frontend environment
├── package.json             # Node dependencies
├── tailwind.config.ts       # Tailwind configuration
└── README.md                # This file
```

## 🧪 Development

```bash
# Frontend development (with hot reload)
npm run dev

# Backend development (with auto reload)
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8841

# Build for production
npm run build
npm start
```

## 📝 License

This project is for educational and authorized security testing purposes only.

---

**Network**: 10.72.200.0/24 | **Frontend**: Port 3000 | **Backend**: Port 8841
