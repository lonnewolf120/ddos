# Cyber Attack Visualization Features

## 🎨 Interactive Cyber Attack Map

The DDoS Visualization Dashboard now includes an advanced **Cyber Attack Map** that provides real-time visual representation of network attacks in progress.

## ✨ Key Features

### 1. **Network Topology Layout**
```
Red Team (Attackers)          Blue Team (Targets)
┌─────────────────┐          ┌─────────────────┐
│ 10.72.200.61-65 │  ──────> │ 10.72.200.51-57 │
│                 │          │                 │
│ • Scheduler     │          │ • Team 1        │
│ • Generator ⭐  │          │ • Team 2        │
│ • GUI           │          │ • Team 3        │
│ • Botnet 1      │          │                 │
│ • Botnet 2      │          │                 │
└─────────────────┘          └─────────────────┘
```

### 2. **Real-time Particle System**
- **Attack particles** flow from source VMs to target VMs
- Multiple particles per attack flow (5 particles/flow)
- Randomized speeds and sizes for realistic effect
- Color-coded by attack intensity (red-orange hues)
- Fade effects as particles reach target
- Continuous regeneration during active attacks

### 3. **Visual Indicators**

#### VM Status Colors
| Color | Status | Description |
|-------|--------|-------------|
| 🔴 Red | Attacking | VM is actively sending attack traffic |
| 🟡 Yellow | Under Attack | VM is being targeted |
| 🟢 Green | Online | VM is online and available |
| ⚫ Gray | Offline | VM is offline or unreachable |

#### VM Icons
| Icon | Meaning |
|------|---------|
| ⚡ Zap | Active attacker |
| ⚠️ Alert | Current target |
| 📊 Activity | Online and ready |
| 🛡️ Shield | Defensive/idle state |

### 4. **Animation Effects**

#### Attack in Progress
- **Central rotating indicator**: Shows attack is active
- **Pulsing source VMs**: Heartbeat effect on attackers (1s cycle)
- **Target glow**: Pulsing border on target VM (0.5s cycle)
- **Connection lines**: Animated particles traveling along attack paths
- **Stats overlay**: Real-time counters with scale animations

#### Idle State
- **Static VM cards**: No animations when idle
- **Gray connection lines**: Potential attack paths (low opacity)
- **Smooth transitions**: Fade in/out as VMs are selected

### 5. **Interactive Elements**

#### Top Stats Bar (During Attack)
```
┌─────────────────────────────────────────────────────┐
│  🔴 Sources: 2  │  🟡 Flows: 2  │  📊 Packets: 450+  │
└─────────────────────────────────────────────────────┘
```
- Shows number of attack sources
- Displays total attack flows
- Live packet counter (updates with each log)

#### VM Cards
- **Hover effect**: Slight scale increase
- **Click to select**: Toggle source/target selection
- **Status badge**: Displays VM role and IP
- **Pulse indicator**: Active dot when attacking/targeted

### 6. **Legend & Context**

Bottom-right legend shows:
- 🔴 Attack Source
- 🟡 Target
- 🟢 Online
- ⚫ Offline

### 7. **Background Design**
- **Gradient**: Dark gradient from gray-900 to black
- **Grid overlay**: 50x50px grid with 20% opacity for depth
- **Blur effects**: Backdrop blur on stat overlays
- **Smooth canvas**: HTML5 Canvas for particle rendering

## 🎯 Attack Flow Visualization

### Connection Lines
```
Red Team VM ━━━━━━━━━━━━━━> Blue Team VM
            (particle stream)
```

- **Active attacks**: Bright red lines (2px width, 30% opacity)
- **Idle connections**: Gray lines (1px width, 20% opacity)
- **Particle trails**: Animated dots following the line path

### Particle Behavior
1. **Spawn**: At source VM coordinates
2. **Travel**: Linear interpolation to target VM
3. **Fade**: Alpha decreases as particle reaches target (after 80% progress)
4. **Respawn**: Reset to source when reaching 100% progress
5. **Speed variation**: 0.02 - 0.05 progress units per frame

## 📊 Analytics Integration

### Attack Statistics Card
- Total attacks launched
- Active source count
- Total log entries
- Current attack status

### VM Status Card
- Red Team online percentage (with progress bar)
- Blue Team online percentage (with progress bar)
- Real-time status updates

### Configuration Summary Card
- Attack type name
- Target port
- Duration setting
- Worker count
- Socket count

## 🚀 Usage Tips

### For Best Results
1. **Launch attack first**: Start attack from "Network Topology" tab
2. **Switch to Visualization**: Click "Attack Visualization" tab
3. **Watch the magic**: See particles flow in real-time
4. **Monitor stats**: Top bar shows live metrics
5. **Check logs**: Scroll down for detailed log viewer

### Performance Notes
- Canvas redraws at 60 FPS during attacks
- Particle count: ~25 particles total (5 per flow, up to 5 flows)
- Low CPU usage: Optimized requestAnimationFrame loop
- Smooth animations: GPU-accelerated transforms

## 🎨 Color Palette

| Element | Color | CSS Variable |
|---------|-------|--------------|
| Attack Source | Red | #ef4444 (red-500) |
| Target | Yellow | #eab308 (yellow-500) |
| Online | Green | #22c55e (green-500) |
| Offline | Gray | #4b5563 (gray-600) |
| Background | Dark Gray | #030712 (gray-950) |
| Cards | Dark Gray | #111827 (gray-900) |
| Borders | Gray | #1f2937 (gray-800) |

## 💡 Technical Implementation

### Technologies Used
- **React**: Component rendering
- **Framer Motion**: UI animations (scale, pulse, rotation)
- **HTML5 Canvas**: Particle system rendering
- **Tailwind CSS**: Styling and responsive design
- **TypeScript**: Type safety

### Component Structure
```typescript
CyberAttackMap.tsx
├── Canvas Ref (particle rendering)
├── Particle System (attack effects)
├── Red Team Section (left side)
├── Blue Team Section (right side)
├── Center Attack Indicator (rotation)
├── Stats Overlay (top center)
└── Legend (bottom right)
```

### State Management
- Props-driven: `redTeamVMs`, `blueTeamVMs`, `selectedSources`, `selectedTarget`
- Attack state: `isAttacking` triggers all animations
- Logs integration: `attackLogs` drives packet counter

## 🔮 Future Enhancements

Planned features:
- [ ] Network traffic graphs
- [ ] Bandwidth usage visualization
- [ ] Attack heatmaps
- [ ] 3D network topology
- [ ] Attack replay functionality
- [ ] Export attack visualization as video
- [ ] Custom particle themes
- [ ] Sound effects for attacks
- [ ] Multiple simultaneous attack visualization
- [ ] Historical attack timeline

## 📸 Screenshots

### Idle State
- Clean network layout
- VMs positioned on left/right
- Gray connection lines
- All VMs offline/gray

### Attack Active
- Red source VMs (left)
- Yellow target VM (right)
- Particles flowing across screen
- Central rotating attack indicator
- Stats bar at top
- Logs scrolling below

### Multi-Source Attack
- Multiple red VMs attacking
- Converging particle streams
- Multiple connection lines
- High packet counter
- All sources pulsing

## 🎯 Training Use Cases

1. **Network Awareness**: Visualize attack patterns
2. **Threat Detection**: Identify attack sources visually
3. **Defense Planning**: Understand attack flow topology
4. **Incident Response**: Watch attacks unfold in real-time
5. **Report Generation**: Screenshot attack scenarios
6. **Student Engagement**: Make security training more visual
7. **Demo Purposes**: Impress stakeholders with live attacks

## 🛡️ Educational Value

- **Spatial Understanding**: See where attacks come from
- **Pattern Recognition**: Learn attack flow characteristics
- **Temporal Awareness**: Understand attack duration and intensity
- **Tool Familiarity**: Know which VMs have which tools
- **Network Topology**: Grasp the Cyber Range network layout

---

**Created**: December 21, 2025
**Version**: 1.0
**Status**: ✅ Fully Implemented
