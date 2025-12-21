"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, AlertTriangle, Activity, Server, Radio, Wifi } from 'lucide-react';

interface VMNode {
  id: string;
  name: string;
  ip: string;
  role: string;
  status: 'online' | 'offline' | 'attacking' | 'target';
  x: number;
  y: number;
}

interface AttackPacket {
  id: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  speed: number;
  size: number;
  color: string;
  trail: { x: number; y: number }[];
}

interface NetworkAttackMapProps {
  redTeamVMs: VMNode[];
  blueTeamVMs: VMNode[];
  selectedSources: string[];
  selectedTarget: string | null;
  isAttacking: boolean;
  attackLogs?: any[];
}

export const NetworkAttackMap: React.FC<NetworkAttackMapProps> = ({
  redTeamVMs,
  blueTeamVMs,
  selectedSources,
  selectedTarget,
  isAttacking,
  attackLogs = []
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [packets, setPackets] = useState<AttackPacket[]>([]);
  const packetIdRef = useRef(0);

  // Calculate positions for network map layout
  const getNodePosition = (index: number, total: number, isRedTeam: boolean): { x: number; y: number } => {
    const canvasWidth = 1000;
    const canvasHeight = 600;
    const padding = 150;

    if (isRedTeam) {
      // Red team on left side, vertical distribution
      const spacing = (canvasHeight - 2 * padding) / (total - 1 || 1);
      return {
        x: padding,
        y: padding + (index * spacing)
      };
    } else {
      // Blue team on right side, vertical distribution
      const spacing = (canvasHeight - 2 * padding) / (total - 1 || 1);
      return {
        x: canvasWidth - padding,
        y: padding + (index * spacing)
      };
    }
  };

  // Enhanced particle system with trails and multiple packet types
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1000;
    canvas.height = 600;

    let localPackets: AttackPacket[] = [];
    let lastSpawnTime = 0;
    const spawnInterval = isAttacking ? 100 : 0; // Spawn packet every 100ms during attack

    const animate = (currentTime: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background network grid
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      // Draw connection lines between selected sources and target
      if (selectedTarget) {
        selectedSources.forEach(sourceId => {
          const source = redTeamVMs.find(vm => vm.id === sourceId);
          const target = blueTeamVMs.find(vm => vm.id === selectedTarget);

          if (source && target) {
            const srcPos = getNodePosition(redTeamVMs.indexOf(source), redTeamVMs.length, true);
            const tgtPos = getNodePosition(blueTeamVMs.indexOf(target), blueTeamVMs.length, false);

            // Draw gradient line
            const gradient = ctx.createLinearGradient(srcPos.x, srcPos.y, tgtPos.x, tgtPos.y);
            gradient.addColorStop(0, isAttacking ? 'rgba(239, 68, 68, 0.5)' : 'rgba(100, 100, 100, 0.2)');
            gradient.addColorStop(0.5, isAttacking ? 'rgba(251, 146, 60, 0.3)' : 'rgba(100, 100, 100, 0.1)');
            gradient.addColorStop(1, isAttacking ? 'rgba(234, 179, 8, 0.5)' : 'rgba(100, 100, 100, 0.2)');

            ctx.beginPath();
            ctx.moveTo(srcPos.x, srcPos.y);
            ctx.lineTo(tgtPos.x, tgtPos.y);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = isAttacking ? 3 : 1;
            ctx.stroke();

            // Draw dashed center line during attack
            if (isAttacking) {
              ctx.setLineDash([10, 5]);
              ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(srcPos.x, srcPos.y);
              ctx.lineTo(tgtPos.x, tgtPos.y);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }
        });
      }

      // Spawn new packets during attack
      if (isAttacking && currentTime - lastSpawnTime > spawnInterval && selectedTarget) {
        selectedSources.forEach(sourceId => {
          const source = redTeamVMs.find(vm => vm.id === sourceId);
          const target = blueTeamVMs.find(vm => vm.id === selectedTarget);

          if (source && target) {
            const srcPos = getNodePosition(redTeamVMs.indexOf(source), redTeamVMs.length, true);
            const tgtPos = getNodePosition(blueTeamVMs.indexOf(target), blueTeamVMs.length, false);

            // Create multiple packets per spawn for visual density
            for (let i = 0; i < 3; i++) {
              localPackets.push({
                id: packetIdRef.current++,
                fromX: srcPos.x,
                fromY: srcPos.y,
                toX: tgtPos.x,
                toY: tgtPos.y,
                progress: Math.random() * 0.1, // Slight random offset
                speed: 0.008 + Math.random() * 0.012, // Variable speed
                size: 3 + Math.random() * 4,
                color: `hsl(${Math.random() * 40}, 100%, ${50 + Math.random() * 20}%)`,
                trail: []
              });
            }
          }
        });
        lastSpawnTime = currentTime;
      }

      // Update and draw packets with trails
      localPackets = localPackets.filter(packet => {
        packet.progress += packet.speed;

        if (packet.progress >= 1) {
          return false; // Remove packet when it reaches target
        }

        // Calculate current position
        const currentX = packet.fromX + (packet.toX - packet.fromX) * packet.progress;
        const currentY = packet.fromY + (packet.toY - packet.fromY) * packet.progress;

        // Update trail
        packet.trail.push({ x: currentX, y: currentY });
        if (packet.trail.length > 10) {
          packet.trail.shift();
        }

        // Draw trail with fading effect
        packet.trail.forEach((point, index) => {
          const alpha = (index / packet.trail.length) * 0.5;
          const size = packet.size * (index / packet.trail.length);

          ctx.beginPath();
          ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
          ctx.fillStyle = packet.color.replace(')', `, ${alpha})`).replace('hsl', 'hsla');
          ctx.fill();
        });

        // Draw main packet with glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = packet.color;
        ctx.beginPath();
        ctx.arc(currentX, currentY, packet.size, 0, Math.PI * 2);
        ctx.fillStyle = packet.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw inner bright core
        ctx.beginPath();
        ctx.arc(currentX, currentY, packet.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        return true;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAttacking, selectedSources, selectedTarget, redTeamVMs, blueTeamVMs]);

  return (
    <div className="relative w-full h-[650px] bg-gray-950 rounded-lg border border-gray-800 overflow-hidden">
      {/* Title Bar */}
      <div className="absolute top-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-500/20 rounded">
              <Radio className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Network Attack Map</h3>
              <p className="text-xs text-gray-400">Real-time DDoS traffic visualization</p>
            </div>
          </div>

          {isAttacking && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-lg"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-2 h-2 bg-red-500 rounded-full"
              />
              <span className="text-red-400 text-sm font-semibold">ATTACK ACTIVE</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="absolute inset-0 pt-[68px]">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black">
          {isAttacking && (
            <motion.div
              className="absolute inset-0 bg-red-500/5"
              animate={{ opacity: [0.05, 0.1, 0.05] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          )}
        </div>

        {/* Canvas for packet visualization */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ imageRendering: 'crisp-edges' }}
        />

        {/* VM Nodes Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Red Team VMs */}
          <div className="absolute left-8 top-1/2 -translate-y-1/2 space-y-6">
            {redTeamVMs.map((vm, index) => {
              const isSource = selectedSources.includes(vm.id);
              const pos = getNodePosition(index, redTeamVMs.length, true);

              return (
                <motion.div
                  key={vm.id}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`
                    relative pointer-events-auto cursor-pointer
                    transition-all duration-300
                  `}
                  style={{
                    marginTop: index === 0 ? 0 : '24px'
                  }}
                >
                  <div className={`
                    p-3 rounded-lg border-2 backdrop-blur-sm
                    ${isSource
                      ? 'border-red-500 bg-red-500/20 shadow-lg shadow-red-500/50'
                      : 'border-gray-700 bg-gray-900/80 hover:border-gray-600'
                    }
                  `}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded ${isSource ? 'bg-red-500/30' : 'bg-gray-800'}`}>
                        {isSource && isAttacking ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                          >
                            <Zap className="w-5 h-5 text-red-400" />
                          </motion.div>
                        ) : (
                          <Server className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className={`font-semibold text-sm ${isSource ? 'text-red-400' : 'text-gray-300'}`}>
                          {vm.name}
                        </div>
                        <div className="text-xs text-gray-500">{vm.ip}</div>
                      </div>
                      {isSource && isAttacking && (
                        <motion.div
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ repeat: Infinity, duration: 0.8 }}
                          className="ml-2"
                        >
                          <Wifi className="w-4 h-4 text-red-400" />
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Pulse ring for active attackers */}
                  {isSource && isAttacking && (
                    <motion.div
                      className="absolute inset-0 border-2 border-red-500 rounded-lg"
                      animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.5, 0, 0.5]
                      }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Blue Team VMs */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 space-y-6">
            {blueTeamVMs.map((vm, index) => {
              const isTarget = vm.id === selectedTarget;
              const pos = getNodePosition(index, blueTeamVMs.length, false);

              return (
                <motion.div
                  key={vm.id}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative pointer-events-auto cursor-pointer"
                  style={{
                    marginTop: index === 0 ? 0 : '24px'
                  }}
                >
                  <div className={`
                    p-3 rounded-lg border-2 backdrop-blur-sm
                    ${isTarget
                      ? 'border-yellow-500 bg-yellow-500/20 shadow-lg shadow-yellow-500/50'
                      : 'border-gray-700 bg-gray-900/80 hover:border-gray-600'
                    }
                  `}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded ${isTarget ? 'bg-yellow-500/30' : 'bg-gray-800'}`}>
                        {isTarget && isAttacking ? (
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 0.5 }}
                          >
                            <AlertTriangle className="w-5 h-5 text-yellow-400" />
                          </motion.div>
                        ) : (
                          <Shield className="w-5 h-5 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <div className={`font-semibold text-sm ${isTarget ? 'text-yellow-400' : 'text-gray-300'}`}>
                          {vm.name}
                        </div>
                        <div className="text-xs text-gray-500">{vm.ip}</div>
                      </div>
                    </div>
                  </div>

                  {/* Impact effect for target under attack */}
                  {isTarget && isAttacking && (
                    <>
                      <motion.div
                        className="absolute inset-0 border-2 border-yellow-500 rounded-lg"
                        animate={{
                          scale: [1, 1.15, 1],
                          opacity: [0.8, 0, 0.8]
                        }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      />
                      <motion.div
                        className="absolute inset-0 bg-yellow-500/20 rounded-lg"
                        animate={{ opacity: [0.2, 0.4, 0.2] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      />
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Center Info Display */}
        {isAttacking && selectedTarget && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900/95 backdrop-blur-sm border border-red-500/50 rounded-lg px-6 py-4 shadow-2xl"
            >
              <div className="text-center space-y-2">
                <div className="flex items-center gap-2 justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  >
                    <Zap className="w-6 h-6 text-red-500" />
                  </motion.div>
                  <span className="text-white font-semibold">DDoS Attack in Progress</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">Sources:</span>
                    <span className="text-red-400 font-bold">{selectedSources.length}</span>
                  </div>
                  <div className="w-px h-4 bg-gray-700" />
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">Packets:</span>
                    <motion.span
                      key={attackLogs.length}
                      initial={{ scale: 1.2, color: '#fbbf24' }}
                      animate={{ scale: 1, color: '#9ca3af' }}
                      className="font-bold"
                    >
                      {packets.length}
                    </motion.span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-lg p-3 z-10">
        <div className="text-xs space-y-2">
          <div className="font-semibold text-gray-300 mb-2">Legend</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full shadow-lg shadow-red-500/50" />
            <span className="text-gray-400">Attack Packet</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-red-500 rounded" />
            <span className="text-gray-400">Attack Source</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-yellow-500 rounded" />
            <span className="text-gray-400">Target System</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500" />
            <span className="text-gray-400">Attack Path</span>
          </div>
        </div>
      </div>
    </div>
  );
};
