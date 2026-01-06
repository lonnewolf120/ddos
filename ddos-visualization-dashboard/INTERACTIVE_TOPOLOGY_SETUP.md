# Interactive Network Topology Setup Guide

## Overview
The DDoS Attack Simulator now includes an **Interactive Network Topology** view powered by Cytoscape.js, similar to the Cyber Range Green Team portal. This provides a fully editable, zoomable, and interactive graph visualization of the attack infrastructure.

## Features Added

### ✨ Interactive Capabilities
- **Click to Select**: Click on Red Team nodes to select attackers, Blue Team nodes to select targets
- **Drag to Reposition**: Drag nodes to rearrange the network layout
- **Zoom & Pan**: Use mouse wheel to zoom, drag background to pan
- **Search & Filter**: Search nodes by name/IP, filter by team (Red/Blue)
- **Node Details Modal**: Click any node to view detailed information including credentials
- **Export**: Export the network topology as a PNG image
- **Real-time Updates**: Network visualizes active attacks with animated connections

### 🎨 Visual Enhancements
- **Color-coded Teams**: Red team (attackers) in red gradient, Blue team (targets) in blue gradient
- **Attack Visualization**: Active attacks shown with solid red arrows, potential attacks with dashed gray lines
- **Status Indicators**: Online/Offline/Attacking/Target states with appropriate icons
- **Selection Highlighting**: Selected nodes highlighted with yellow borders
- **Hover Effects**: Nodes enlarge on hover for better interaction

### 🔧 Controls Available
- **Zoom In/Out**: Use toolbar buttons or mouse wheel
- **Reset View**: Restore default zoom and centering
- **Toggle Sidebar**: Show/hide the VM list sidebar
- **Download**: Export network graph as PNG image

## Installation Steps

### 1. Install Dependencies
```bash
cd /home/iftee/Documents/Projects/attackers/ddos/ddos-visualization-dashboard
npm install
```

This will automatically install the new `cytoscape@^3.30.4` dependency added to `package.json`.

### 2. Start the Application
```bash
# Start both frontend and backend
npm run dev:all

# Or separately:
# Terminal 1 - Backend
npm run backend

# Terminal 2 - Frontend
npm run dev
```

### 3. Access the Interactive Topology
1. Open browser: `http://localhost:3000`
2. Navigate to the **"Interactive Map"** tab (second tab)
3. The interactive network topology will load with all Red and Blue team VMs

## Usage Guide

### Selecting Attackers and Targets

**Method 1: Click on Graph**
- Click any Red Team node (red) to toggle selection as attacker
- Click any Blue Team node (blue) to select as target
- Multiple Red Team nodes can be selected simultaneously

**Method 2: Use Sidebar**
- Click nodes in the sidebar list to select and center them
- Sidebar shows all VMs with filtering options

### Viewing Node Details
1. Click any node to open the details modal
2. View system information (IP, status, role)
3. Toggle credential visibility with Show/Hide button
4. Copy IP, username, or password to clipboard
5. Open node URL in new tab
6. Click "Select Node" to add to attack configuration

### Navigating the Graph
- **Pan**: Click and drag on the background
- **Zoom In**: Click zoom in button or scroll up
- **Zoom Out**: Click zoom out button or scroll down
- **Reset**: Click reset button to restore default view
- **Center on Node**: Click node in sidebar to center it

### Filtering and Search
1. Use search box to filter by name, IP, or role
2. Click "Red" or "Blue" filter buttons to show only that team
3. Click "All" to show all nodes

### Exporting
- Click the **Download** button to export current graph as PNG
- Useful for documentation and presentations

## File Structure

```
ddos-visualization-dashboard/
├── src/
│   ├── components/
│   │   └── InteractiveNetworkTopology.tsx   # NEW: Interactive graph component
│   └── app/
│       └── page.tsx                          # UPDATED: Added interactive tab
├── package.json                              # UPDATED: Added cytoscape dependency
└── INTERACTIVE_TOPOLOGY_SETUP.md             # This file
```

## Component Architecture

### InteractiveNetworkTopology Component
**Location**: `/src/components/InteractiveNetworkTopology.tsx`

**Props**:
```typescript
interface InteractiveNetworkTopologyProps {
  redTeamVMs: VMNode[];           // Red team attack VMs
  blueTeamVMs: VMNode[];          // Blue team target VMs
  selectedSources: string[];       // Currently selected attacker IDs
  selectedTarget: string;          // Currently selected target ID
  onSourceSelect: (vmId: string) => void;  // Callback when attacker selected
  onTargetSelect: (vmId: string) => void;  // Callback when target selected
  isAttackActive?: boolean;        // Whether attack is running
  attackType?: string;             // Type of attack (for visualization)
}
```

**Features**:
- Dynamic node generation from VM lists
- Real-time edge generation based on selections
- Cytoscape.js integration with Material Design 3 styling
- Sidebar with search, filter, and VM list
- Modal for node details with credential management
- Toolbar with zoom, reset, and export controls

### Integration in Main Dashboard
The component is integrated into the main dashboard (`src/app/page.tsx`) as a new tab:

```tsx
<TabsTrigger value="interactive">Interactive Map</TabsTrigger>

<TabsContent value="interactive">
  <InteractiveNetworkTopology
    redTeamVMs={redTeamVMs}
    blueTeamVMs={blueTeamVMs}
    selectedSources={selectedSources}
    selectedTarget={selectedTarget}
    onSourceSelect={toggleSourceVM}
    onTargetSelect={(id) => setSelectedTarget(id)}
    isAttackActive={activeAttack?.status === 'running'}
    attackType={attackConfig.attackType}
  />
</TabsContent>
```

## Customization

### Changing Node Colors
Edit `InteractiveNetworkTopology.tsx` around line 120-150 in the Cytoscape style definition:

```typescript
"background-color": (ele: any) => {
  const team = ele.data("team")
  if (team === "red") {
    return "#ef4444" // Change red team color
  }
  if (team === "blue") {
    return "#3b82f6" // Change blue team color
  }
}
```

### Changing Node Positions
Default positions are calculated dynamically based on index:
- Red Team: `{ x: 150, y: 100 + index * 100 }`
- Blue Team: `{ x: 650, y: 150 + index * 150 }`

To customize, edit the `networkData` generation in `InteractiveNetworkTopology.tsx` around line 60-80.

### Adding Custom Node Properties
Extend the `VMNode` interface to include additional properties:

```typescript
interface VMNode {
  id: string;
  name: string;
  ip: string;
  role: string;
  status: 'online' | 'offline' | 'attacking' | 'target';
  customProperty?: string; // Add custom properties
}
```

Then display them in the node details modal.

## Troubleshooting

### Graph Not Rendering
**Issue**: Blank space where graph should be
**Solution**:
1. Check browser console for errors
2. Ensure `cytoscape` npm package is installed: `npm install`
3. Verify component import in `page.tsx`
4. Check that VMs have valid data (name, ip, id)

### Nodes Not Clickable
**Issue**: Clicking nodes doesn't select them
**Solution**:
1. Ensure `onSourceSelect` and `onTargetSelect` callbacks are passed correctly
2. Check that node IDs match between `redTeamVMs`/`blueTeamVMs` and `selectedSources`/`selectedTarget`
3. Verify Cytoscape event handlers are registered (line 220-250)

### Layout Issues
**Issue**: Nodes overlapping or off-screen
**Solution**:
1. Click **Reset View** button to recenter
2. Adjust initial positions in `networkData` generation
3. Use Cytoscape layout algorithms (currently using 'preset' layout)
4. Increase padding in layout config (line 270)

### Sidebar Not Showing
**Issue**: Sidebar is hidden
**Solution**:
1. Click the **Menu** button to toggle sidebar visibility
2. Check `isSidebarOpen` state is initialized to `true`
3. Verify Tailwind classes for responsive behavior

## Performance Optimization

### Large Networks (10+ Nodes)
For networks with many nodes:
1. Disable animations on edges for smoother performance
2. Use simplified node shapes (circle instead of round-rectangle)
3. Limit sidebar VM list to visible items only
4. Debounce search input for better responsiveness

### Memory Usage
The component automatically cleans up Cytoscape instances on unmount to prevent memory leaks (line 290).

## Comparison with Green Team Network Topology

| Feature | Green Team | DDoS Interactive |
|---------|-----------|------------------|
| Graph Library | Cytoscape.js | Cytoscape.js |
| Node Selection | View only | Editable (select attackers/targets) |
| Credential Display | Yes | Yes |
| Export PNG | Yes | Yes |
| Search/Filter | Yes | Yes |
| Team Filtering | 4 teams (White/Green/Red/Blue) | 2 teams (Red/Blue) |
| Compound Nodes | Yes (team grouping) | No (flat structure) |
| Edge Types | 6 types (management, internal, attack, etc.) | 2 types (active/potential attack) |
| Modal Details | Full system info | VM info + credentials |
| Sidebar | VM list with subgroups | VM list with team filter |

## Future Enhancements

### Planned Features
- [ ] Drag-to-connect: Draw edges between nodes to configure attacks
- [ ] Right-click context menu for quick actions
- [ ] Node grouping for multiple blue team infrastructure
- [ ] Attack path visualization (multi-hop attacks)
- [ ] Time-based replay of attack sequences
- [ ] Network traffic flow animation
- [ ] Integration with SIEM alerts (show detected attacks)
- [ ] Export to JSON/XML for documentation

### Advanced Customization Ideas
- Custom layouts (hierarchical, circular, grid)
- Physics-based animations for dynamic repositioning
- Dark/light theme toggle
- Minimap for large networks
- Collaborative editing (multi-user selection)

## Related Documentation
- **Material Design 3 Theme**: `/MD3_CYBERRANGE_THEME_UPDATE.md`
- **API Documentation**: `/backend/README.md`
- **Green Team Network Topology**: `/Cyber-Range-Green/src/components/green-main/NetworkTopology.tsx`
- **Cytoscape.js Docs**: https://js.cytoscape.org/

## Support
For issues or questions:
1. Check browser console for errors
2. Review Cytoscape.js documentation
3. Verify VM data structure matches expected format
4. Test with minimal data first (2-3 VMs per team)

---

**Last Updated**: December 22, 2025
**Version**: 1.0.0
**Status**: ✅ Production Ready
