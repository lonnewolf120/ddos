"use client";

import React, { useEffect, useRef, useCallback } from 'react';
import { Monitor, Server, HardDrive } from 'lucide-react';

interface VMNode {
  id: string;
  name: string;
  ip: string;
  role: string;
  status: 'online' | 'offline' | 'attacking' | 'target';
  port?: number;
}

interface IsometricAttackMapProps {
  redTeamVMs: VMNode[];
  blueTeamVMs: VMNode[];
  selectedSources: string[];
  selectedTarget: string | null;
  targetPort: number;
  isAttacking: boolean;
  attackType: string;
  packetsPerSecond?: number;
}

interface Packet {
  id: number;
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  progress: number;
  speed: number;
  sourceIp: string;
  targetIp: string;
  targetPort: number;
  protocol: string;
  size: number;
}

interface ServerPosition {
  x: number;
  y: number;
  z: number;
  vm: VMNode;
  isRedTeam: boolean;
}

// Convert 3D isometric coordinates to 2D screen coordinates
const isoTo2D = (x: number, y: number, z: number, offsetX: number, offsetY: number): { screenX: number; screenY: number } => {
  const isoX = (x - y) * 0.866; // cos(30°)
  const isoY = (x + y) * 0.5 - z;
  return {
    screenX: isoX * 60 + offsetX,
    screenY: isoY * 60 + offsetY
  };
};

export const IsometricAttackMap: React.FC<IsometricAttackMapProps> = ({
  redTeamVMs,
  blueTeamVMs,
  selectedSources,
  selectedTarget,
  targetPort,
  isAttacking,
  attackType,
  packetsPerSecond = 50
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const packetsRef = useRef<Packet[]>([]);
  const packetIdRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const statsRef = useRef({ sent: 0, received: 0, dropped: 0 });

  // Get protocol based on attack type
  const getProtocol = (type: string): string => {
    switch (type) {
      case 'syn_flood': return 'TCP SYN';
      case 'udp_flood': return 'UDP';
      case 'http_flood': return 'HTTP';
      case 'slowloris': return 'HTTP';
      case 'icmp_flood': return 'ICMP';
      case 'hulk': return 'HTTP';
      default: return 'TCP';
    }
  };

  // Draw realistic isometric desktop computer with monitor
  const drawIsometricServer = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    z: number,
    offsetX: number,
    offsetY: number,
    color: string,
    isActive: boolean,
    isTarget: boolean,
    vm: VMNode
  ) => {
    const { screenX, screenY } = isoTo2D(x, y, z, offsetX, offsetY);

    const scale = 1;
    const computerWidth = 50 * scale;
    const computerHeight = 60 * scale;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + 8, 45 * scale, 20 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // === MONITOR ===
    const monitorWidth = 42 * scale;
    const monitorHeight = 28 * scale;
    const monitorDepth = 4 * scale;
    const monitorY = screenY - computerHeight + 12 * scale;

    // Monitor stand base
    ctx.fillStyle = '#3c4043';
    ctx.beginPath();
    ctx.moveTo(screenX - 10 * scale, screenY - 8 * scale);
    ctx.lineTo(screenX - 8 * scale, screenY - 8 * scale - 2 * scale);
    ctx.lineTo(screenX + 8 * scale, screenY - 8 * scale - 2 * scale);
    ctx.lineTo(screenX + 10 * scale, screenY - 8 * scale);
    ctx.closePath();
    ctx.fill();

    // Monitor stand
    ctx.fillStyle = '#5f6368';
    ctx.fillRect(screenX - 2 * scale, monitorY + monitorHeight, 4 * scale, 18 * scale);

    // Monitor back (left face)
    ctx.fillStyle = '#202124';
    ctx.beginPath();
    ctx.moveTo(screenX - monitorWidth * 0.433, monitorY - monitorDepth * 0.25);
    ctx.lineTo(screenX - monitorWidth * 0.433, monitorY + monitorHeight - monitorDepth * 0.25);
    ctx.lineTo(screenX, monitorY + monitorHeight);
    ctx.lineTo(screenX, monitorY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Monitor frame (right face)
    ctx.fillStyle = '#3c4043';
    ctx.beginPath();
    ctx.moveTo(screenX, monitorY);
    ctx.lineTo(screenX + monitorWidth * 0.433, monitorY - monitorDepth * 0.25);
    ctx.lineTo(screenX + monitorWidth * 0.433, monitorY + monitorHeight - monitorDepth * 0.25);
    ctx.lineTo(screenX, monitorY + monitorHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Monitor screen
    const screenPadding = 3 * scale;
    const screenGradient = ctx.createLinearGradient(
      screenX - 10,
      monitorY,
      screenX + 10,
      monitorY + monitorHeight
    );

    if (isActive) {
      if (isTarget) {
        screenGradient.addColorStop(0, '#1e3a8a');
        screenGradient.addColorStop(1, '#1e40af');
      } else {
        screenGradient.addColorStop(0, '#7c2d12');
        screenGradient.addColorStop(1, '#991b1b');
      }
    } else {
      screenGradient.addColorStop(0, '#1e293b');
      screenGradient.addColorStop(1, '#0f172a');
    }

    ctx.fillStyle = screenGradient;
    ctx.beginPath();
    ctx.moveTo(screenX - screenPadding, monitorY + screenPadding);
    ctx.lineTo(
      screenX - monitorWidth * 0.433 + screenPadding,
      monitorY - monitorDepth * 0.25 + screenPadding
    );
    ctx.lineTo(
      screenX - monitorWidth * 0.433 + screenPadding,
      monitorY + monitorHeight - monitorDepth * 0.25 - screenPadding
    );
    ctx.lineTo(screenX - screenPadding, monitorY + monitorHeight - screenPadding);
    ctx.closePath();
    ctx.fill();

    // Screen content - terminal/code lines
    if (isActive) {
      ctx.strokeStyle = isTarget ? '#3b82f6' : '#dc2626';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < 4; i++) {
        const lineY = monitorY + 8 * scale + i * 5 * scale;
        ctx.beginPath();
        ctx.moveTo(screenX - 15 * scale, lineY);
        ctx.lineTo(screenX - 5 * scale, lineY);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // === COMPUTER CASE/TOWER ===
    const caseWidth = 18 * scale;
    const caseHeight = 30 * scale;
    const caseDepth = 22 * scale;
    const caseY = screenY - caseHeight - 8 * scale;
    const caseX = screenX + 25 * scale;

    // Case left face
    ctx.fillStyle = isActive
      ? (isTarget ? '#4b5563' : '#374151')
      : '#1f2937';
    ctx.beginPath();
    ctx.moveTo(caseX - caseWidth * 0.433, caseY - caseDepth * 0.125);
    ctx.lineTo(caseX - caseWidth * 0.433, caseY + caseHeight - caseDepth * 0.125);
    ctx.lineTo(caseX, caseY + caseHeight);
    ctx.lineTo(caseX, caseY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Case right face
    ctx.fillStyle = isActive
      ? (isTarget ? '#6b7280' : '#4b5563')
      : '#374151';
    ctx.beginPath();
    ctx.moveTo(caseX, caseY);
    ctx.lineTo(caseX + caseWidth * 0.433, caseY - caseDepth * 0.125);
    ctx.lineTo(caseX + caseWidth * 0.433, caseY + caseHeight - caseDepth * 0.125);
    ctx.lineTo(caseX, caseY + caseHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Case top face
    ctx.fillStyle = isActive
      ? (isTarget ? '#9ca3af' : '#6b7280')
      : '#4b5563';
    ctx.beginPath();
    ctx.moveTo(caseX, caseY);
    ctx.lineTo(caseX - caseWidth * 0.433, caseY - caseDepth * 0.125);
    ctx.lineTo(caseX, caseY - caseDepth * 0.25);
    ctx.lineTo(caseX + caseWidth * 0.433, caseY - caseDepth * 0.125);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Power button LED
    if (isActive) {
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(caseX + 5 * scale, caseY + 5 * scale, 2 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Drive bays
    ctx.fillStyle = '#000000';
    ctx.fillRect(caseX - 2 * scale, caseY + 10 * scale, 8 * scale, 2 * scale);
    ctx.fillRect(caseX - 2 * scale, caseY + 14 * scale, 8 * scale, 2 * scale);

    // USB ports
    ctx.fillStyle = '#1f2937';
    for (let i = 0; i < 2; i++) {
      ctx.fillRect(caseX - 2 * scale + i * 3 * scale, caseY + 20 * scale, 2 * scale, 1 * scale);
    }

    // Activity ring for attacking/target
    if (isActive && isAttacking) {
      ctx.strokeStyle = isTarget ? 'rgba(59, 130, 246, 0.4)' : 'rgba(220, 38, 38, 0.4)';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(screenX, screenY - computerHeight / 2, 50 * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Labels
    ctx.fillStyle = isActive ? '#ffffff' : '#9ca3af';
    ctx.font = `bold ${11 * scale}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(vm.ip, screenX, screenY + 18 * scale);

    ctx.fillStyle = isActive
      ? (isTarget ? '#3b82f6' : '#dc2626')
      : '#6b7280';
    ctx.font = `${9 * scale}px monospace`;
    ctx.fillText(vm.name.substring(0, 15), screenX, screenY + 30 * scale);

    if (isTarget && targetPort) {
      ctx.fillStyle = '#3b82f6';
      ctx.font = `bold ${9 * scale}px monospace`;
      ctx.fillText(`:${targetPort}`, screenX, screenY + 42 * scale);
    }

    return { screenX, screenY: screenY - computerHeight / 2 };
  }, [isAttacking, targetPort]);

  // Draw packet as a realistic network packet envelope
  const drawPacket = useCallback((
    ctx: CanvasRenderingContext2D,
    packet: Packet,
    offsetX: number,
    offsetY: number
  ) => {
    const { screenX, screenY } = isoTo2D(packet.x, packet.y, packet.z, offsetX, offsetY);

    const width = 12;
    const height = 8;
    const depth = 6;

    // Muted colors based on protocol - Material Design 3 palette
    let baseColor = '#5f6368'; // Default gray
    let borderColor = '#3c4043';
    switch (packet.protocol) {
      case 'TCP SYN':
        baseColor = '#c5221f'; // Red 600
        borderColor = '#9a1917';
        break;
      case 'UDP':
        baseColor = '#ea8600'; // Orange 700
        borderColor = '#b86a00';
        break;
      case 'HTTP':
        baseColor = '#188038'; // Green 700
        borderColor = '#0d652d';
        break;
      case 'ICMP':
        baseColor = '#1967d2'; // Blue 600
        borderColor = '#1558b0';
        break;
    }

    // Draw packet as isometric envelope/box
    // Top face
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY - height);
    ctx.lineTo(screenX - width * 0.5, screenY - height - depth * 0.25);
    ctx.lineTo(screenX, screenY - height - depth * 0.5);
    ctx.lineTo(screenX + width * 0.5, screenY - height - depth * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Left face (darker)
    const adjustBrightness = (color: string, percent: number): string => {
      const num = parseInt(color.replace('#', ''), 16);
      const amt = Math.round(2.55 * percent);
      const R = (num >> 16) + amt;
      const G = (num >> 8 & 0x00FF) + amt;
      const B = (num & 0x0000FF) + amt;
      return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    };

    ctx.fillStyle = adjustBrightness(baseColor, -20);
    ctx.beginPath();
    ctx.moveTo(screenX - width * 0.5, screenY - depth * 0.25);
    ctx.lineTo(screenX - width * 0.5, screenY - height - depth * 0.25);
    ctx.lineTo(screenX, screenY - height);
    ctx.lineTo(screenX, screenY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right face
    ctx.fillStyle = adjustBrightness(baseColor, -10);
    ctx.beginPath();
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(screenX, screenY - height);
    ctx.lineTo(screenX + width * 0.5, screenY - height - depth * 0.25);
    ctx.lineTo(screenX + width * 0.5, screenY - depth * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Add protocol label on packet
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(packet.protocol.split(' ')[0].substring(0, 3), screenX, screenY - height + 3);
  }, []);

  // Draw connection line between machines - Material Design 3 style
  const drawConnectionLine = useCallback((
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    isActive: boolean
  ) => {
    if (!isActive) {
      ctx.strokeStyle = 'rgba(95, 99, 104, 0.15)'; // Material Gray
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
    } else {
      // Solid line for active connection - subtle red
      ctx.strokeStyle = 'rgba(197, 34, 31, 0.4)'; // Material Red 600 with low opacity
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Dashed overlay for active
    if (isActive) {
      ctx.setLineDash([8, 4]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, []);

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get device pixel ratio for high DPI displays
    const dpr = window.devicePixelRatio || 1;

    // Set display size (css pixels)
    const displayWidth = 1200;
    const displayHeight = 700;

    // Set actual size in memory (scaled to account for extra pixel density)
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;

    // Set display size (css pixels)
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    // Scale all drawing operations by the dpr
    ctx.scale(dpr, dpr);

    const centerX = displayWidth / 2;
    const centerY = displayHeight / 2 + 50;

    // Calculate server positions
    const serverPositions: ServerPosition[] = [];

    // Red team positions (left side)
    redTeamVMs.forEach((vm, index) => {
      const spacing = 2.5;
      const startZ = -(redTeamVMs.length - 1) * spacing / 2;
      serverPositions.push({
        x: -4,
        y: 0,
        z: startZ + index * spacing,
        vm,
        isRedTeam: true
      });
    });

    // Blue team positions (right side)
    blueTeamVMs.forEach((vm, index) => {
      const spacing = 3;
      const startZ = -(blueTeamVMs.length - 1) * spacing / 2;
      serverPositions.push({
        x: 4,
        y: 0,
        z: startZ + index * spacing,
        vm,
        isRedTeam: false
      });
    });

    const protocol = getProtocol(attackType);
    const spawnInterval = 1000 / packetsPerSecond;

    const animate = (timestamp: number) => {
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      // Draw floor grid
      ctx.strokeStyle = 'rgba(139, 0, 0, 0.15)';
      ctx.lineWidth = 1;
      for (let i = -10; i <= 10; i++) {
        const start1 = isoTo2D(i, -10, 0, centerX, centerY);
        const end1 = isoTo2D(i, 10, 0, centerX, centerY);
        ctx.beginPath();
        ctx.moveTo(start1.screenX, start1.screenY);
        ctx.lineTo(end1.screenX, end1.screenY);
        ctx.stroke();

        const start2 = isoTo2D(-10, i, 0, centerX, centerY);
        const end2 = isoTo2D(10, i, 0, centerX, centerY);
        ctx.beginPath();
        ctx.moveTo(start2.screenX, start2.screenY);
        ctx.lineTo(end2.screenX, end2.screenY);
        ctx.stroke();
      }

      // Store screen positions for drawing connections and packets
      const screenPositions: Map<string, { x: number; y: number }> = new Map();

      // Draw servers (sorted by depth for proper overlap)
      const sortedServers = [...serverPositions].sort((a, b) => (a.x + a.z) - (b.x + b.z));

      sortedServers.forEach(server => {
        const isSource = selectedSources.includes(server.vm.id);
        const isTarget = server.vm.id === selectedTarget;
        const isActive = isSource || isTarget;

        const pos = drawIsometricServer(
          ctx,
          server.x,
          server.y,
          server.z,
          centerX,
          centerY,
          server.isRedTeam ? '#dc2626' : '#3b82f6',
          isActive,
          isTarget,
          server.vm
        );

        screenPositions.set(server.vm.id, { x: pos.screenX, y: pos.screenY });
      });

      // Draw connection lines
      if (selectedTarget) {
        const targetPos = screenPositions.get(selectedTarget);
        if (targetPos) {
          selectedSources.forEach(sourceId => {
            const sourcePos = screenPositions.get(sourceId);
            if (sourcePos) {
              drawConnectionLine(ctx, sourcePos.x, sourcePos.y, targetPos.x, targetPos.y, isAttacking);
            }
          });
        }
      }

      // Spawn new packets during attack
      if (isAttacking && selectedTarget && timestamp - lastSpawnRef.current > spawnInterval) {
        const targetServer = serverPositions.find(s => s.vm.id === selectedTarget);

        if (targetServer) {
          selectedSources.forEach(sourceId => {
            const sourceServer = serverPositions.find(s => s.vm.id === sourceId);
            if (sourceServer) {
              packetsRef.current.push({
                id: packetIdRef.current++,
                x: sourceServer.x,
                y: sourceServer.y,
                z: sourceServer.z,
                targetX: targetServer.x,
                targetY: targetServer.y,
                targetZ: targetServer.z,
                progress: 0,
                speed: 0.015 + Math.random() * 0.01,
                sourceIp: sourceServer.vm.ip,
                targetIp: targetServer.vm.ip,
                targetPort: targetPort,
                protocol: protocol,
                size: 2 + Math.random() * 3
              });
              statsRef.current.sent++;
            }
          });
        }
        lastSpawnRef.current = timestamp;
      }

      // Update and draw packets
      packetsRef.current = packetsRef.current.filter(packet => {
        packet.progress += packet.speed;

        if (packet.progress >= 1) {
          statsRef.current.received++;
          return false;
        }

        // Interpolate position
        packet.x = packet.x + (packet.targetX - packet.x) * packet.speed * 2;
        packet.y = packet.y + (packet.targetY - packet.y) * packet.speed * 2;
        packet.z = packet.z + (packet.targetZ - packet.z) * packet.speed * 2;

        // Add slight wave motion
        packet.y += Math.sin(packet.progress * Math.PI * 4) * 0.02;

        drawPacket(ctx, packet, centerX, centerY);
        return true;
      });

      // Draw stats panel
      ctx.fillStyle = 'rgba(20, 0, 0, 0.9)';
      ctx.fillRect(10, 10, 280, 130);
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, 280, 130);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('ATTACK STATISTICS', 25, 35);

      ctx.fillStyle = '#888888';
      ctx.font = '12px monospace';
      ctx.fillText(`Protocol: ${protocol}`, 25, 55);
      ctx.fillText(`Target: ${selectedTarget ? blueTeamVMs.find(v => v.id === selectedTarget)?.ip : 'None'}:${targetPort}`, 25, 72);
      ctx.fillText(`Packets Sent: ${statsRef.current.sent.toLocaleString()}`, 25, 89);
      ctx.fillText(`Packets In-Flight: ${packetsRef.current.length}`, 25, 106);
      ctx.fillText(`Active Sources: ${selectedSources.length}`, 25, 123);

      // Status indicator
      if (isAttacking) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(265, 28, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ef4444';
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Legend
      ctx.fillStyle = 'rgba(20, 0, 0, 0.9)';
      ctx.fillRect(displayWidth - 200, 10, 190, 100);
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.5)';
      ctx.strokeRect(displayWidth - 200, 10, 190, 100);

      ctx.fillStyle = '#888888';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('LEGEND', displayWidth - 185, 30);

      ctx.font = '11px monospace';
      // Red team indicator
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(displayWidth - 185, 42, 12, 12);
      ctx.fillStyle = '#888888';
      ctx.fillText('Red Team (Attacker)', displayWidth - 168, 52);

      // Blue team indicator
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(displayWidth - 185, 60, 12, 12);
      ctx.fillStyle = '#888888';
      ctx.fillText('Blue Team (Target)', displayWidth - 168, 70);

      // Packet indicator
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(canvas.width - 179, 86, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#888888';
      ctx.fillText('Attack Packet', canvas.width - 168, 90);

      animationRef.current = requestAnimationFrame(animate);
    };

    // Reset stats when attack starts/stops
    if (isAttacking) {
      statsRef.current = { sent: 0, received: 0, dropped: 0 };
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    redTeamVMs,
    blueTeamVMs,
    selectedSources,
    selectedTarget,
    targetPort,
    isAttacking,
    attackType,
    packetsPerSecond,
    drawIsometricServer,
    drawPacket,
    drawConnectionLine
  ]);

  return (
    <div className="relative w-full bg-gray-950 rounded-lg border border-red-900/30 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-auto"
        style={{
          maxHeight: '700px',
          imageRendering: 'auto'
        }}
      />

      {/* Attack status overlay */}
      {isAttacking && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-900/90 backdrop-blur-sm border border-red-500/50 rounded px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 font-mono text-sm font-bold">
              ATTACK IN PROGRESS - {getProtocol(attackType)} FLOOD
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default IsometricAttackMap;
