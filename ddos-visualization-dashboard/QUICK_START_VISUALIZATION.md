# Quick Start: Attack Visualization

## 🚀 Launch the Dashboard

### 1. Start Backend (Terminal 1)
```bash
cd /home/iftee/Documents/Projects/attackers/ddos-visualization-dashboard/backend
source venv/bin/activate
python main.py
```

✅ Backend running at: http://localhost:8841

### 2. Start Frontend (Terminal 2)
```bash
cd /home/iftee/Documents/Projects/attackers/ddos-visualization-dashboard
npm run dev
```

✅ Dashboard running at: http://localhost:3000

## 🎯 Using the Attack Visualization

### Step 1: Network Topology Tab (Setup)
1. Click on **Attack Generator** (10.72.200.62) to select as source
2. Click on **Blue Team 2** (10.72.200.54) to select as target
3. Configure attack:
   - Attack Type: **HTTP Flood (GoldenEye)**
   - Target Port: **9080**
   - Duration: **120** seconds
   - Workers: **50**
   - Sockets: **100**
4. Click **Launch Attack**

### Step 2: Attack Visualization Tab (Watch)
1. Click on **"Attack Visualization"** tab
2. You should see:
   - ✅ Red Team VMs on the left (with Attack Generator highlighted in red)
   - ✅ Blue Team VMs on the right (with Blue Team 2 highlighted in yellow)
   - ✅ **Particles flowing** from Attack Generator to Blue Team 2
   - ✅ **Rotating attack indicator** in the center
   - ✅ **Live stats bar** at the top showing:
     - 🔴 Sources: 1
     - 🟡 Flows: 1
     - 📊 Packets: (increasing count)
   - ✅ **Pulsing indicators** on active VMs
   - ✅ **Connection lines** showing attack path

### Step 3: Analytics Tab (Monitor)
1. Click on **"Analytics"** tab
2. View:
   - Attack Statistics (total attacks, sources, logs)
   - VM Status (online/offline percentages)
   - Configuration Summary
   - Recent Activity logs

## 🎨 Visual Indicators Guide

### VM Border Colors
- **🔴 Red** = Actively attacking
- **🟡 Yellow** = Being targeted
- **🟢 Green** = Online
- **⚫ Gray** = Offline

### Animation States
- **Pulsing dot** on VM = Active in attack
- **Rotating center circle** = Attack in progress
- **Flowing particles** = Attack traffic
- **Glowing borders** = Selected for attack

## 🧪 Test Scenarios

### Scenario 1: Single Source Attack
```
Source: Attack Generator (10.72.200.62)
Target: Blue Team 2 (10.72.200.54:9080)
Type: HTTP Flood
Duration: 60s
```

**Expected Visualization:**
- 1 red VM (left)
- 1 yellow VM (right)
- 5 particles flowing between them
- Stats: Sources=1, Flows=1

### Scenario 2: Multi-Source Distributed Attack
```
Sources: Attack Generator + Botnet Gen 1 + Botnet Gen 2
Target: Blue Team 2 (10.72.200.54:9080)
Type: SYN Flood
Duration: 120s
```

**Expected Visualization:**
- 3 red VMs (left)
- 1 yellow VM (right)
- 15 particles flowing (5 per source)
- Stats: Sources=3, Flows=3
- Multiple connection lines converging on target

### Scenario 3: Multiple Targets (Future)
```
Sources: All 5 Red Team VMs
Targets: All 3 Blue Team VMs
Type: UDP Flood
Duration: 180s
```

**Expected Visualization:**
- 5 red VMs (left)
- 3 yellow VMs (right)
- 75 particles total (5×3×5)
- Stats: Sources=5, Flows=15

## 💡 Tips for Best Visualization

### For Maximum Visual Impact
1. **Use HTTP Flood or SYN Flood**: These generate lots of logs → higher packet count
2. **Launch from multiple sources**: Creates more particle streams
3. **Longer duration**: Gives more time to watch animations
4. **Full screen browser**: Better view of the network map
5. **Dark room**: Enhances the neon/cyber aesthetic

### For Performance
1. **Start with 1 source**: Test connectivity first
2. **Check backend logs**: Ensure SSH connections successful
3. **Monitor system resources**: High particle count may lag
4. **Use Chrome/Edge**: Better Canvas performance than Firefox

## 🐛 Troubleshooting

### No Particles Showing
- ✅ Verify attack is running (check "Network Topology" tab)
- ✅ Check WebSocket connected (console should show "WebSocket connected")
- ✅ Ensure `isAttacking` is true (look for rotating center indicator)
- ✅ Refresh the page and re-launch attack

### VMs Show as Offline
- ✅ Check backend is running (http://localhost:8841/api/health)
- ✅ Click "Refresh Status" button in header
- ✅ Verify VMs are accessible: `ssh mist@10.72.200.62`

### Attack Won't Start
- ✅ Check backend logs for SSH errors
- ✅ Verify GoldenEye/hping3 installed on VMs
- ✅ Ensure target VM is online and port is open
- ✅ Check credentials in `backend/.env`

### Particles Stop Moving
- ✅ Attack may have completed (check duration)
- ✅ Backend may have crashed (check terminal)
- ✅ WebSocket may have disconnected (check console)
- ✅ Re-launch attack to restart visualization

## 📊 What to Look For

### During HTTP Flood
- Fast-moving particles (high speed)
- Rapid log updates
- Packet count increasing quickly
- Target VM border pulsing rapidly

### During SYN Flood
- Medium-speed particles
- Fewer logs (less verbose)
- Steady packet increase
- Connection lines very active

### During Slowloris
- Slow-moving particles
- Gradual log updates
- Lower packet count
- Particles appear to "crawl"

## 🎓 Educational Use

### For Instructors
1. Show attack flow visually during lectures
2. Screenshot different attack patterns
3. Compare single vs. distributed attacks
4. Demonstrate defense strategies

### For Students
1. Understand network attack topology
2. Visualize packet flow concepts
3. Learn VM role differentiation
4. Practice identifying attack sources

## ✅ Checklist

Before showing to others:
- [ ] Backend running on port 8841
- [ ] Frontend running on port 3000
- [ ] All Red Team VMs showing as online
- [ ] All Blue Team VMs showing as online
- [ ] Can launch attack from "Network Topology" tab
- [ ] Particles visible on "Attack Visualization" tab
- [ ] Stats bar showing at top during attack
- [ ] Logs populating in real-time
- [ ] Analytics tab showing statistics

## 🚀 Demo Script

**For a 5-minute demo:**

1. **[0:00-0:30]** Open dashboard, show three tabs
2. **[0:30-1:00]** Network Topology - explain Red/Blue teams
3. **[1:00-1:30]** Select Attack Generator + Blue Team 2
4. **[1:30-2:00]** Configure HTTP Flood attack
5. **[2:00-2:15]** Click "Launch Attack"
6. **[2:15-3:30]** Switch to "Attack Visualization" tab
7. **[3:30-4:00]** Point out particles, stats, animations
8. **[4:00-4:30]** Switch to "Analytics" tab
9. **[4:30-5:00]** Show statistics and recent logs

**Key talking points:**
- "Real SSH-based attacks, not simulated"
- "Particles represent actual network traffic"
- "All VMs are on-premise, fully controlled"
- "Used for training Blue Team defenders"

---

**Ready to launch?** Start both servers and navigate to the Attack Visualization tab! 🎯
