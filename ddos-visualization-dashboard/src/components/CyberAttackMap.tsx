"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, AlertTriangle, Activity } from 'lucide-react';

interface VMNode {
  id: string;
  name: string;
  ip: string;
  role: string;
  status: 'online' | 'offline' | 'attacking' | 'target';
  x: number;
  y: number;
}

interface AttackFlow {
  from: string;
  to: string;
  active: boolean;
}

interface CyberAttackMapProps {
  redTeamVMs: VMNode[];
  blueTeamVMs: VMNode[];
  selectedSources: string[];
  selectedTarget: string | null;
  isAttacking: boolean;
  attackLogs?: any[];
}

export const CyberAttackMap: React.FC<CyberAttackMapProps> = ({
  redTeamVMs,
  blueTeamVMs,
  selectedSources,
  selectedTarget,
  isAttacking,
  attackLogs = []
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [attackParticles, setAttackParticles] = useState<any[]>([]);
  const animationRef = useRef<number>(0);

  // Generate attack flows
  const attackFlows: AttackFlow[] = selectedSources.flatMap(sourceId =>
    selectedTarget ? [{ from: sourceId, to: selectedTarget, active: isAttacking }] : []
  );

  // Particle system for attack visualization with realistic packets
  useEffect(() => {
    if (!isAttacking || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const packets: any[] = [];

    // Create packet objects for each attack flow
    attackFlows.forEach(flow => {
      const source = [...redTeamVMs, ...blueTeamVMs].find(vm => vm.id === flow.from);
      const target = [...redTeamVMs, ...blueTeamVMs].find(vm => vm.id === flow.to);

      if (source && target && flow.active) {
        // Generate realistic packet stream
        for (let i = 0; i < 3; i++) {
          packets.push({
            x: source.x,
            y: source.y,
            targetX: target.x,
            targetY: target.y,
            speed: 0.015 + Math.random() * 0.02,
            progress: Math.random(),
            size: 8,
            protocol: ['TCP', 'UDP', 'HTTP'][Math.floor(Math.random() * 3)],
            // Material Design 3 colors - muted
            color: '#c5221f', // Red 600
            alpha: 0.8
          });
        }
      }
    });

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connection lines with proper arrow direction
      attackFlows.forEach(flow => {
        const source = [...redTeamVMs, ...blueTeamVMs].find(vm => vm.id === flow.from);
        const target = [...redTeamVMs, ...blueTeamVMs].find(vm => vm.id === flow.to);

        if (source && target) {
          // Draw dashed line
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = flow.active ? 'rgba(197, 34, 31, 0.2)' : 'rgba(95, 99, 104, 0.15)';
          ctx.lineWidth = flow.active ? 2 : 1;
          ctx.setLineDash(flow.active ? [] : [5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw arrow at target - properly pointing
          if (flow.active) {
            const angle = Math.atan2(target.y - source.y, target.x - source.x);
            const arrowSize = 12;

            ctx.fillStyle = 'rgba(197, 34, 31, 0.6)';
            ctx.beginPath();
            ctx.moveTo(
              target.x - arrowSize * Math.cos(angle - Math.PI / 6),
              target.y - arrowSize * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(target.x, target.y);
            ctx.lineTo(
              target.x - arrowSize * Math.cos(angle + Math.PI / 6),
              target.y - arrowSize * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
          }
        }
      });

      // Update and draw packets as network packet envelopes
      packets.forEach((packet) => {
        // Update position
        packet.progress += packet.speed;

        if (packet.progress >= 1) {
          packet.progress = 0;
          packet.alpha = 0.8;
        }

        // Interpolate position
        const currentX = packet.x + (packet.targetX - packet.x) * packet.progress;
        const currentY = packet.y + (packet.targetY - packet.y) * packet.progress;

        // Fade near target
        if (packet.progress > 0.85) {
          packet.alpha = (1 - packet.progress) * 6.67;
        }

        // Draw packet as stylized envelope with header
        const packetWidth = 24;
        const packetHeight = 16;
        const headerHeight = 5;

        ctx.globalAlpha = packet.alpha;

        // Packet shadow for depth
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(currentX - packetWidth / 2 + 2, currentY - packetHeight / 2 + 2, packetWidth, packetHeight);

        // Packet body - Material Design colors
        let packetColor = '#c5221f'; // Red 600 for TCP
        let headerColor = '#9a1b1b'; // Darker red for header

        if (packet.protocol === 'UDP') {
          packetColor = '#ea8600'; // Orange 700
          headerColor = '#c26f00';
        }
        if (packet.protocol === 'HTTP') {
          packetColor = '#188038'; // Green 700
          headerColor = '#0f5a26';
        }

        // Main packet body
        ctx.fillStyle = packetColor;
        ctx.fillRect(currentX - packetWidth / 2, currentY - packetHeight / 2, packetWidth, packetHeight);

        // Packet header (darker top section)
        ctx.fillStyle = headerColor;
        ctx.fillRect(currentX - packetWidth / 2, currentY - packetHeight / 2, packetWidth, headerHeight);

        // Packet border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(currentX - packetWidth / 2, currentY - packetHeight / 2, packetWidth, packetHeight);

        // Header separator line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(currentX - packetWidth / 2, currentY - packetHeight / 2 + headerHeight);
        ctx.lineTo(currentX + packetWidth / 2, currentY - packetHeight / 2 + headerHeight);
        ctx.stroke();

        // Protocol label in header
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(packet.protocol, currentX, currentY - packetHeight / 2 + headerHeight / 2);

        // Packet data representation (small dots)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 2; j++) {
            ctx.fillRect(
              currentX - packetWidth / 2 + 4 + i * 6,
              currentY - packetHeight / 2 + headerHeight + 3 + j * 4,
              3,
              2
            );
          }
        }

        ctx.globalAlpha = 1;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAttacking, attackFlows, redTeamVMs, blueTeamVMs]);

  // Get VM status icon and color
  const getVMIcon = (vm: VMNode) => {
    if (vm.status === 'attacking' || selectedSources.includes(vm.id)) {
      return <Zap className="w-4 h-4" />;
    }
    if (vm.status === 'target' || vm.id === selectedTarget) {
      return <AlertTriangle className="w-4 h-4" />;
    }
    if (vm.status === 'online') {
      return <Activity className="w-4 h-4" />;
    }
    return <Shield className="w-4 h-4" />;
  };

  const getVMColor = (vm: VMNode) => {
    if (selectedSources.includes(vm.id)) {
      return 'border-red-700/60 bg-red-900/20';
    }
    if (vm.id === selectedTarget) {
      return 'border-orange-700/60 bg-orange-900/20';
    }
    if (vm.status === 'online') {
      return 'border-green-700/60 bg-green-900/20';
    }
    return 'border-gray-700 bg-gray-800/50';
  };

  const getVMTextColor = (vm: VMNode) => {
    if (selectedSources.includes(vm.id)) return 'text-red-300';
    if (vm.id === selectedTarget) return 'text-orange-300';
    if (vm.status === 'online') return 'text-green-300';
    return 'text-gray-400';
  };

  return (
    <div className="relative w-full h-[600px] bg-gray-950 rounded-lg border border-gray-800 overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `
            linear-gradient(rgba(100, 100, 100, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(100, 100, 100, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Canvas for particle effects */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Network topology */}
      <div className="absolute inset-0 p-8">
        {/* Red Team Section */}
        <div className="absolute left-8 top-1/2 -translate-y-1/2 space-y-4">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-900/20 border border-red-700/40 rounded-lg">
              <Zap className="w-5 h-5 text-red-300" />
              <span className="text-red-300 font-semibold">Red Team (Attackers)</span>
            </div>
          </div>

          <div className="space-y-3">
            {redTeamVMs.map((vm, index) => (
              <motion.div
                key={vm.id}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  relative p-3 rounded-lg border-2 transition-all duration-300
                  ${getVMColor(vm)}
                  ${selectedSources.includes(vm.id) ? 'shadow-md' : ''}
                `}
                style={{ minWidth: '200px' }}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded ${selectedSources.includes(vm.id) ? 'bg-red-900/40' : 'bg-gray-700/50'}`}>
                    {getVMIcon(vm)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm ${getVMTextColor(vm)}`}>
                      {vm.name}
                    </div>
                    <div className="text-xs text-gray-500">{vm.ip}</div>
                  </div>
                  {selectedSources.includes(vm.id) && isAttacking && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="w-2 h-2 bg-red-600 rounded-full"
                    />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Center attack visualization */}
        {isAttacking && attackFlows.length > 0 && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
              className="relative"
            >
              <div className="w-32 h-32 border-4 border-red-900/30 rounded-full" />
              <div className="absolute inset-0 w-32 h-32 border-t-4 border-red-700 rounded-full" />
            </motion.div>
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Zap className="w-12 h-12 text-red-600" />
              </motion.div>
            </div>
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <div className="bg-red-900/20 border border-red-700/40 px-4 py-2 rounded-lg">
                <span className="text-red-300 font-semibold text-sm">ATTACK IN PROGRESS</span>
              </div>
            </div>
          </div>
        )}

        {/* Blue Team Section */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 space-y-4">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900/20 border border-blue-700/40 rounded-lg">
              <Shield className="w-5 h-5 text-blue-300" />
              <span className="text-blue-300 font-semibold">Blue Team (Targets)</span>
            </div>
          </div>

          <div className="space-y-3">
            {blueTeamVMs.map((vm, index) => (
              <motion.div
                key={vm.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  relative p-3 rounded-lg border-2 transition-all duration-300
                  ${getVMColor(vm)}
                  ${vm.id === selectedTarget ? 'shadow-md' : ''}
                `}
                style={{ minWidth: '200px' }}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded ${vm.id === selectedTarget ? 'bg-orange-900/40' : 'bg-gray-700/50'}`}>
                    {getVMIcon(vm)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm ${getVMTextColor(vm)}`}>
                      {vm.name}
                    </div>
                    <div className="text-xs text-gray-500">{vm.ip}</div>
                  </div>
                  {vm.id === selectedTarget && isAttacking && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                      className="w-2 h-2 bg-orange-600 rounded-full"
                    />
                  )}
                </div>
                {vm.id === selectedTarget && isAttacking && (
                  <motion.div
                    className="absolute inset-0 border-2 border-orange-700/40 rounded-lg"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Attack stats overlay */}
      {isAttacking && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg px-6 py-3"
          >
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                <span className="text-gray-400">Sources:</span>
                <span className="text-red-300 font-semibold">{selectedSources.length}</span>
              </div>
              <div className="w-px h-4 bg-gray-700" />
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse" />
                <span className="text-gray-400">Flows:</span>
                <span className="text-orange-300 font-semibold">{attackFlows.length}</span>
              </div>
              <div className="w-px h-4 bg-gray-700" />
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-300" />
                <span className="text-gray-400">Packets:</span>
                <motion.span
                  key={attackLogs.length}
                  initial={{ scale: 1.2, color: '#86efac' }}
                  animate={{ scale: 1, color: '#9ca3af' }}
                  className="font-semibold"
                >
                  {attackLogs.length * 150}+
                </motion.span>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-3">
        <div className="text-xs space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-red-700/60 bg-red-900/20 rounded" />
            <span className="text-gray-400">Attack Source</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-orange-700/60 bg-orange-900/20 rounded" />
            <span className="text-gray-400">Target</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-green-700/60 bg-green-900/20 rounded" />
            <span className="text-gray-400">Online</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-gray-700 bg-gray-800/50 rounded" />
            <span className="text-gray-400">Offline</span>
          </div>
        </div>
      </div>
    </div>
  );
};
