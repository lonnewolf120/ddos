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

  // Particle system for attack visualization
  useEffect(() => {
    if (!isAttacking || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles: any[] = [];

    // Create particles for each attack flow
    attackFlows.forEach(flow => {
      const source = [...redTeamVMs, ...blueTeamVMs].find(vm => vm.id === flow.from);
      const target = [...redTeamVMs, ...blueTeamVMs].find(vm => vm.id === flow.to);

      if (source && target && flow.active) {
        // Generate multiple particles per flow
        for (let i = 0; i < 5; i++) {
          particles.push({
            x: source.x,
            y: source.y,
            targetX: target.x,
            targetY: target.y,
            speed: 0.02 + Math.random() * 0.03,
            progress: Math.random(),
            size: 2 + Math.random() * 3,
            color: `hsl(${Math.random() * 60 + 0}, 100%, 50%)`, // Red-orange hues
            alpha: 0.8
          });
        }
      }
    });

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connection lines
      attackFlows.forEach(flow => {
        const source = [...redTeamVMs, ...blueTeamVMs].find(vm => vm.id === flow.from);
        const target = [...redTeamVMs, ...blueTeamVMs].find(vm => vm.id === flow.to);

        if (source && target) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = flow.active ? 'rgba(239, 68, 68, 0.3)' : 'rgba(100, 100, 100, 0.2)';
          ctx.lineWidth = flow.active ? 2 : 1;
          ctx.stroke();
        }
      });

      // Update and draw particles
      particles.forEach((particle, index) => {
        // Update position
        particle.progress += particle.speed;

        if (particle.progress >= 1) {
          particle.progress = 0;
          particle.alpha = 0.8;
        }

        // Interpolate position
        particle.x = particle.x + (particle.targetX - particle.x) * particle.progress;
        particle.y = particle.y + (particle.targetY - particle.y) * particle.progress;

        // Fade near target
        if (particle.progress > 0.8) {
          particle.alpha = (1 - particle.progress) * 4;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color.replace('50%', `50%, ${particle.alpha}`);
        ctx.shadowBlur = 10;
        ctx.shadowColor = particle.color;
        ctx.fill();
        ctx.shadowBlur = 0;
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
      return 'border-red-500 bg-red-500/20';
    }
    if (vm.id === selectedTarget) {
      return 'border-yellow-500 bg-yellow-500/20';
    }
    if (vm.status === 'online') {
      return 'border-green-500 bg-green-500/20';
    }
    return 'border-gray-600 bg-gray-800/50';
  };

  const getVMTextColor = (vm: VMNode) => {
    if (selectedSources.includes(vm.id)) return 'text-red-400';
    if (vm.id === selectedTarget) return 'text-yellow-400';
    if (vm.status === 'online') return 'text-green-400';
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
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg">
              <Zap className="w-5 h-5 text-red-400" />
              <span className="text-red-400 font-semibold">Red Team (Attackers)</span>
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
                  ${selectedSources.includes(vm.id) ? 'shadow-lg shadow-red-500/50' : ''}
                `}
                style={{ minWidth: '200px' }}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded ${selectedSources.includes(vm.id) ? 'bg-red-500/30' : 'bg-gray-700/50'}`}>
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
                      className="w-2 h-2 bg-red-500 rounded-full"
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
              <div className="w-32 h-32 border-4 border-red-500/30 rounded-full" />
              <div className="absolute inset-0 w-32 h-32 border-t-4 border-red-500 rounded-full" />
            </motion.div>
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Zap className="w-12 h-12 text-red-500" />
              </motion.div>
            </div>
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <div className="bg-red-500/20 border border-red-500/50 px-4 py-2 rounded-lg">
                <span className="text-red-400 font-semibold text-sm">ATTACK IN PROGRESS</span>
              </div>
            </div>
          </div>
        )}

        {/* Blue Team Section */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 space-y-4">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/50 rounded-lg">
              <Shield className="w-5 h-5 text-blue-400" />
              <span className="text-blue-400 font-semibold">Blue Team (Targets)</span>
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
                  ${vm.id === selectedTarget ? 'shadow-lg shadow-yellow-500/50' : ''}
                `}
                style={{ minWidth: '200px' }}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded ${vm.id === selectedTarget ? 'bg-yellow-500/30' : 'bg-gray-700/50'}`}>
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
                      className="w-2 h-2 bg-yellow-500 rounded-full"
                    />
                  )}
                </div>
                {vm.id === selectedTarget && isAttacking && (
                  <motion.div
                    className="absolute inset-0 border-2 border-yellow-500 rounded-lg"
                    animate={{ opacity: [0.5, 1, 0.5] }}
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
            className="bg-gray-900/90 backdrop-blur-sm border border-red-500/50 rounded-lg px-6 py-3"
          >
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-gray-400">Sources:</span>
                <span className="text-red-400 font-semibold">{selectedSources.length}</span>
              </div>
              <div className="w-px h-4 bg-gray-700" />
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                <span className="text-gray-400">Flows:</span>
                <span className="text-yellow-400 font-semibold">{attackFlows.length}</span>
              </div>
              <div className="w-px h-4 bg-gray-700" />
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-400" />
                <span className="text-gray-400">Packets:</span>
                <motion.span
                  key={attackLogs.length}
                  initial={{ scale: 1.2, color: '#4ade80' }}
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
            <div className="w-3 h-3 border-2 border-red-500 bg-red-500/20 rounded" />
            <span className="text-gray-400">Attack Source</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-yellow-500 bg-yellow-500/20 rounded" />
            <span className="text-gray-400">Target</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-green-500 bg-green-500/20 rounded" />
            <span className="text-gray-400">Online</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-gray-600 bg-gray-800/50 rounded" />
            <span className="text-gray-400">Offline</span>
          </div>
        </div>
      </div>
    </div>
  );
};
