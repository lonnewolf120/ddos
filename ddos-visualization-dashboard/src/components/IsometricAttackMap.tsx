"use client";

import React, { useEffect, useRef, useCallback } from 'react';

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

  // Draw isometric computer/server block (like draw.io style)
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

    // Computer block dimensions
    const width = 45;
    const height = 55;
    const depth = 35;

    // Base colors
    const baseColor = isTarget ? '#fbbf24' : (isActive ? '#ef4444' : '#4b5563');

    // Draw shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + 5, 40, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // === MONITOR (Top part) ===
    const monitorHeight = height * 0.6;
    const monitorWidth = width * 0.9;
    const monitorDepth = depth * 0.2;

    // Monitor back face
    ctx.fillStyle = isActive ? '#1f2937' : '#111827';
    ctx.beginPath();
    ctx.moveTo(screenX - monitorWidth * 0.866, screenY - height - monitorDepth * 0.25);
    ctx.lineTo(screenX - monitorWidth * 0.866, screenY - height + monitorHeight - monitorDepth * 0.25);
    ctx.lineTo(screenX, screenY - height + monitorHeight - monitorDepth * 0.5);
    ctx.lineTo(screenX, screenY - height - monitorDepth * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Monitor front face (screen)
    ctx.fillStyle = isActive ? '#1e293b' : '#0f172a';
    ctx.beginPath();
    ctx.moveTo(screenX, screenY - height);
    ctx.lineTo(screenX - monitorWidth * 0.866, screenY - height - monitorDepth * 0.25);
    ctx.lineTo(screenX - monitorWidth * 0.866, screenY - height + monitorHeight - monitorDepth * 0.25);
    ctx.lineTo(screenX, screenY - height + monitorHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Screen display area
    const screenPadding = 6;
    ctx.fillStyle = isActive ? '#0ea5e9' : '#1e3a8a';
    ctx.beginPath();
    ctx.moveTo(screenX - screenPadding, screenY - height + screenPadding);
    ctx.lineTo(screenX - monitorWidth * 0.866 + screenPadding, screenY - height - monitorDepth * 0.25 + screenPadding);
    ctx.lineTo(screenX - monitorWidth * 0.866 + screenPadding, screenY - height + monitorHeight - monitorDepth * 0.25 - screenPadding);
    ctx.lineTo(screenX - screenPadding, screenY - height + monitorHeight - screenPadding);
    ctx.closePath();
    ctx.fill();

    // Screen glow effect for active
    if (isActive) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = isTarget ? '#fbbf24' : '#0ea5e9';
      ctx.fillStyle = isTarget ? 'rgba(251, 191, 36, 0.3)' : 'rgba(14, 165, 233, 0.3)';
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Monitor side face
    ctx.fillStyle = isActive ? '#334155' : '#1e293b';
    ctx.beginPath();
    ctx.moveTo(screenX, screenY - height);
    ctx.lineTo(screenX + monitorWidth * 0.866, screenY - height - monitorDepth * 0.25);
    ctx.lineTo(screenX + monitorWidth * 0.866, screenY - height + monitorHeight - monitorDepth * 0.25);
    ctx.lineTo(screenX, screenY - height + monitorHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // === COMPUTER BASE/TOWER ===
    const baseHeight = height * 0.35;
    const baseY = screenY - baseHeight;

    // Left face
    ctx.fillStyle = isActive
      ? (isTarget ? 'hsl(45, 60%, 35%)' : 'hsl(0, 60%, 35%)')
      : '#374151';
    ctx.beginPath();
    ctx.moveTo(screenX - width * 0.866, baseY - depth * 0.25);
    ctx.lineTo(screenX - width * 0.866, baseY + baseHeight - depth * 0.25);
    ctx.lineTo(screenX, baseY + baseHeight);
    ctx.lineTo(screenX, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Right face
    ctx.fillStyle = isActive
      ? (isTarget ? 'hsl(45, 60%, 45%)' : 'hsl(0, 60%, 45%)')
      : '#4b5563';
    ctx.beginPath();
    ctx.moveTo(screenX, baseY);
    ctx.lineTo(screenX + width * 0.866, baseY - depth * 0.25);
    ctx.lineTo(screenX + width * 0.866, baseY + baseHeight - depth * 0.25);
    ctx.lineTo(screenX, baseY + baseHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Top face
    ctx.fillStyle = isActive
      ? (isTarget ? 'hsl(45, 60%, 55%)' : 'hsl(0, 60%, 55%)')
      : '#6b7280';
    ctx.beginPath();
    ctx.moveTo(screenX, baseY);
    ctx.lineTo(screenX - width * 0.866, baseY - depth * 0.25);
    ctx.lineTo(screenX, baseY - depth * 0.5);
    ctx.lineTo(screenX + width * 0.866, baseY - depth * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Computer details - Power LED
    ctx.fillStyle = isActive ? '#22c55e' : '#374151';
    ctx.beginPath();
    ctx.arc(screenX + 15, baseY + 10, 4, 0, Math.PI * 2);
    ctx.fill();
    if (isActive) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#22c55e';
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Drive bay lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(screenX + 8, baseY + 18);
    ctx.lineTo(screenX + 22, baseY + 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(screenX + 8, baseY + 24);
    ctx.lineTo(screenX + 22, baseY + 24);
    ctx.stroke();

    // Activity pulse for attacking/target
    if (isActive && isAttacking) {
      ctx.shadowBlur = 25;
      ctx.shadowColor = isTarget ? '#fbbf24' : '#ef4444';
      ctx.strokeStyle = isTarget ? '#fbbf24' : '#ef4444';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(screenX, screenY - height / 2, 45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    // IP Label
    ctx.fillStyle = isActive ? '#ffffff' : '#9ca3af';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(vm.ip, screenX, screenY + 20);

    // Name label
    ctx.fillStyle = isActive
      ? (isTarget ? '#fbbf24' : '#ef4444')
      : '#6b7280';
    ctx.font = '9px monospace';
    ctx.fillText(vm.name.substring(0, 15), screenX, screenY + 33);

    // Port indicator for target
    if (isTarget && targetPort) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`:${targetPort}`, screenX, screenY + 45);
    }

    return { screenX, screenY: screenY - height / 2 };
  }, [isAttacking, targetPort]);

  // Draw packet as a small data cube
  const drawPacket = useCallback((
    ctx: CanvasRenderingContext2D,
    packet: Packet,
    offsetX: number,
    offsetY: number
  ) => {
    const { screenX, screenY } = isoTo2D(packet.x, packet.y, packet.z, offsetX, offsetY);

    const size = 4 + packet.size * 0.5;

    // Packet color based on protocol
    let color = '#ef4444';
    switch (packet.protocol) {
      case 'TCP SYN': color = '#ef4444'; break;
      case 'UDP': color = '#f97316'; break;
      case 'HTTP': color = '#eab308'; break;
      case 'ICMP': color = '#22c55e'; break;
    }

    // Draw packet as small isometric cube
    ctx.fillStyle = color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;

    // Simple diamond shape for speed
    ctx.beginPath();
    ctx.moveTo(screenX, screenY - size);
    ctx.lineTo(screenX + size, screenY);
    ctx.lineTo(screenX, screenY + size * 0.5);
    ctx.lineTo(screenX - size, screenY);
    ctx.closePath();
    ctx.fill();

    // Bright center
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(screenX, screenY, size * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }, []);

  // Draw connection line between machines
  const drawConnectionLine = useCallback((
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    isActive: boolean
  ) => {
    if (!isActive) {
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.1)';
      ctx.lineWidth = 1;
    } else {
      // Gradient line for active connection
      const gradient = ctx.createLinearGradient(fromX, fromY, toX, toY);
      gradient.addColorStop(0, 'rgba(220, 38, 38, 0.6)');
      gradient.addColorStop(0.5, 'rgba(251, 146, 60, 0.4)');
      gradient.addColorStop(1, 'rgba(234, 179, 8, 0.6)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
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

    // Set canvas size
    canvas.width = 1200;
    canvas.height = 700;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 + 50;

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
      ctx.clearRect(0, 0, canvas.width, canvas.height);

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
      ctx.fillRect(canvas.width - 200, 10, 190, 100);
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.5)';
      ctx.strokeRect(canvas.width - 200, 10, 190, 100);

      ctx.fillStyle = '#888888';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('LEGEND', canvas.width - 185, 30);

      ctx.font = '11px monospace';
      // Red team indicator
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(canvas.width - 185, 42, 12, 12);
      ctx.fillStyle = '#888888';
      ctx.fillText('Red Team (Attacker)', canvas.width - 168, 52);

      // Blue team indicator
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(canvas.width - 185, 60, 12, 12);
      ctx.fillStyle = '#888888';
      ctx.fillText('Blue Team (Target)', canvas.width - 168, 70);

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
          imageRendering: 'crisp-edges'
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
