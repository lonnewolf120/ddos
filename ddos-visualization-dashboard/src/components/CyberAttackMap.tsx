"use client";

import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, RoundedBox, Line } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Zap,
  Shield,
  Server,
  Cpu,
  MonitorSmartphone,
  Network
} from 'lucide-react';

interface VMNode {
  id: string;
  name: string;
  ip: string;
  role: string;
  status: 'online' | 'offline' | 'attacking' | 'target';
  x: number;
  y: number;
}

interface CyberAttackMapProps {
  redTeamVMs: VMNode[];
  blueTeamVMs: VMNode[];
  selectedSources: string[];
  selectedTarget: string | null;
  isAttacking: boolean;
  attackLogs?: { message: string }[];
}

// Modern color palette with RED theme
const COLORS = {
  // Backgrounds
  bg: '#0a0a0f',
  bgCard: 'rgba(18, 18, 26, 0.95)',
  bgCardHover: 'rgba(26, 26, 36, 0.95)',

  // Red theme for attackers
  attackerPrimary: '#dc2626',
  attackerSecondary: '#ef4444',
  attackerGlow: '#f87171',
  attackerBg: 'rgba(220, 38, 38, 0.15)',
  attackerBorder: 'rgba(239, 68, 68, 0.3)',

  // Blue theme for targets
  targetPrimary: '#2563eb',
  targetSecondary: '#3b82f6',
  targetGlow: '#60a5fa',
  targetBg: 'rgba(37, 99, 235, 0.15)',
  targetBorder: 'rgba(59, 130, 246, 0.3)',

  // Neutral
  inactive: '#374151',
  inactiveLight: '#4b5563',
  inactiveBg: 'rgba(55, 65, 81, 0.3)',
  inactiveBorder: 'rgba(75, 85, 99, 0.3)',

  // Text
  textPrimary: '#f9fafb',
  textSecondary: '#d1d5db',
  textMuted: '#9ca3af',

  // Accents
  success: '#22c55e',
  warning: '#f59e0b',

  // Glass effect
  glass: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
};

// 3D Server rack component
interface ServerRackProps {
  position: [number, number, number];
  vm: VMNode;
  isActive: boolean;
  isTarget: boolean;
}

const ServerRack: React.FC<ServerRackProps> = ({ position, vm, isActive, isTarget }) => {
  const groupRef = useRef<THREE.Group>(null);

  const mainColor = useMemo(() => {
    if (!isActive) return COLORS.inactive;
    return isTarget ? COLORS.targetPrimary : COLORS.attackerPrimary;
  }, [isActive, isTarget]);

  const glowColor = useMemo(() => {
    if (!isActive) return COLORS.inactiveLight;
    return isTarget ? COLORS.targetGlow : COLORS.attackerGlow;
  }, [isActive, isTarget]);

  useFrame((state) => {
    if (groupRef.current && isActive) {
      // Subtle floating animation
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.02;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Main server body */}
      <RoundedBox args={[0.8, 1.2, 0.5]} radius={0.08} smoothness={4}>
        <meshStandardMaterial
          color={mainColor}
          metalness={0.6}
          roughness={0.4}
        />
      </RoundedBox>

      {/* Server slots */}
      {[0.35, 0.1, -0.15, -0.4].map((yPos, i) => (
        <RoundedBox key={i} args={[0.65, 0.18, 0.02]} radius={0.02} smoothness={2} position={[0, yPos, 0.26]}>
          <meshStandardMaterial
            color="#1a1a24"
            metalness={0.8}
            roughness={0.3}
          />
        </RoundedBox>
      ))}

      {/* LED indicators */}
      {[0.35, 0.1, -0.15, -0.4].map((yPos, i) => (
        <mesh key={`led-${i}`} position={[0.28, yPos, 0.27]}>
          <sphereGeometry args={[0.02, 16, 16]} />
          <meshStandardMaterial
            color={isActive ? (i === 0 ? COLORS.success : glowColor) : '#333'}
            emissive={isActive ? (i === 0 ? COLORS.success : glowColor) : '#000'}
            emissiveIntensity={isActive ? 0.8 : 0}
          />
        </mesh>
      ))}

      {/* Base platform */}
      <RoundedBox args={[0.9, 0.08, 0.6]} radius={0.02} smoothness={2} position={[0, -0.64, 0]}>
        <meshStandardMaterial
          color="#1f2937"
          metalness={0.4}
          roughness={0.6}
        />
      </RoundedBox>

      {/* IP Label */}
      <Text
        position={[0, -0.85, 0.3]}
        fontSize={0.1}
        color={COLORS.textPrimary}
        anchorX="center"
        anchorY="middle"
        font="/fonts/roboto-mono.woff"
      >
        {vm.ip}
      </Text>

      {/* Name Label */}
      <Text
        position={[0, -1, 0.3]}
        fontSize={0.08}
        color={isActive ? glowColor : COLORS.textMuted}
        anchorX="center"
        anchorY="middle"
      >
        {vm.name.substring(0, 14)}
      </Text>

      {/* Glow effect for active servers */}
      {isActive && (
        <pointLight
          position={[0, 0, 0.5]}
          color={glowColor}
          intensity={0.5}
          distance={2}
        />
      )}
    </group>
  );
};

// Packet visualization
interface PacketProps {
  startPos: [number, number, number];
  endPos: [number, number, number];
  speed: number;
  onComplete: () => void;
}

const Packet: React.FC<PacketProps> = ({ startPos, endPos, speed, onComplete }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    progressRef.current += delta * speed;

    if (progressRef.current >= 1) {
      onComplete();
      return;
    }

    const t = progressRef.current;
    // Curved path
    const midY = Math.max(startPos[1], endPos[1]) + 1;
    const x = startPos[0] + (endPos[0] - startPos[0]) * t;
    const y = startPos[1] + (midY - startPos[1]) * Math.sin(t * Math.PI);
    const z = startPos[2] + (endPos[2] - startPos[2]) * t;

    meshRef.current.position.set(x, y, z);
    meshRef.current.rotation.z += delta * 5;
  });

  return (
    <mesh ref={meshRef} position={startPos}>
      <boxGeometry args={[0.12, 0.06, 0.06]} />
      <meshStandardMaterial
        color={COLORS.attackerSecondary}
        emissive={COLORS.attackerPrimary}
        emissiveIntensity={0.6}
      />
    </mesh>
  );
};

// Connection beam
interface ConnectionBeamProps {
  start: [number, number, number];
  end: [number, number, number];
  isActive: boolean;
}

const ConnectionBeam: React.FC<ConnectionBeamProps> = ({ start, end, isActive }) => {
  const points = useMemo(() => {
    const midY = Math.max(start[1], end[1]) + 0.8;
    const mid: [number, number, number] = [(start[0] + end[0]) / 2, midY, (start[2] + end[2]) / 2];
    return [start, mid, end];
  }, [start, end]);

  return (
    <Line
      points={points}
      color={isActive ? COLORS.attackerSecondary : COLORS.inactive}
      lineWidth={isActive ? 2 : 1}
      transparent
      opacity={isActive ? 0.6 : 0.2}
      dashed={!isActive}
      dashSize={0.2}
      gapSize={0.1}
    />
  );
};

// Packets manager
interface PacketsManagerProps {
  sources: { id: string; position: [number, number, number] }[];
  target: { id: string; position: [number, number, number] } | null;
  isAttacking: boolean;
  onPacketComplete: () => void;
}

const PacketsManager: React.FC<PacketsManagerProps> = ({ sources, target, isAttacking, onPacketComplete }) => {
  const [packets, setPackets] = useState<{ id: number; sourcePos: [number, number, number] }[]>([]);
  const packetIdRef = useRef(0);
  const lastSpawnRef = useRef(0);

  useFrame((state) => {
    if (!isAttacking || !target || sources.length === 0) return;

    const now = state.clock.elapsedTime * 1000;
    if (now - lastSpawnRef.current > 120) {
      const newPackets = sources.map(source => ({
        id: packetIdRef.current++,
        sourcePos: source.position
      }));
      setPackets(prev => [...prev, ...newPackets]);
      lastSpawnRef.current = now;
    }
  });

  const handlePacketComplete = (id: number) => {
    setPackets(prev => prev.filter(p => p.id !== id));
    onPacketComplete();
  };

  if (!target) return null;

  return (
    <>
      {packets.map(packet => (
        <Packet
          key={packet.id}
          startPos={packet.sourcePos}
          endPos={target.position}
          speed={0.6 + Math.random() * 0.3}
          onComplete={() => handlePacketComplete(packet.id)}
        />
      ))}
    </>
  );
};

// 3D Scene
interface SceneProps {
  redTeamVMs: VMNode[];
  blueTeamVMs: VMNode[];
  selectedSources: string[];
  selectedTarget: string | null;
  isAttacking: boolean;
  onPacketReceived: () => void;
}

const Scene: React.FC<SceneProps> = ({
  redTeamVMs,
  blueTeamVMs,
  selectedSources,
  selectedTarget,
  isAttacking,
  onPacketReceived
}) => {
  const redTeamPositions = useMemo(() => {
    return redTeamVMs.map((vm, index) => ({
      vm,
      position: [-4, 0, (index - (redTeamVMs.length - 1) / 2) * 2.2] as [number, number, number]
    }));
  }, [redTeamVMs]);

  const blueTeamPositions = useMemo(() => {
    return blueTeamVMs.map((vm, index) => ({
      vm,
      position: [4, 0, (index - (blueTeamVMs.length - 1) / 2) * 2.8] as [number, number, number]
    }));
  }, [blueTeamVMs]);

  const sourcesWithPositions = useMemo(() => {
    return redTeamPositions
      .filter(item => selectedSources.includes(item.vm.id))
      .map(item => ({ id: item.vm.id, position: item.position }));
  }, [redTeamPositions, selectedSources]);

  const targetWithPosition = useMemo(() => {
    const target = blueTeamPositions.find(item => item.vm.id === selectedTarget);
    return target ? { id: target.vm.id, position: target.position } : null;
  }, [blueTeamPositions, selectedTarget]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} color="#ffffff" />
      <pointLight position={[-5, 5, -5]} intensity={0.4} color="#3b82f6" />
      <pointLight position={[5, 5, 5]} intensity={0.4} color="#ef4444" />

      {/* Floor grid */}
      <gridHelper args={[24, 24, '#1f2937', '#111827']} position={[0, -0.7, 0]} />

      {/* Red Team */}
      {redTeamPositions.map(({ vm, position }) => (
        <ServerRack
          key={vm.id}
          position={position}
          vm={vm}
          isActive={selectedSources.includes(vm.id)}
          isTarget={false}
        />
      ))}

      {/* Blue Team */}
      {blueTeamPositions.map(({ vm, position }) => (
        <ServerRack
          key={vm.id}
          position={position}
          vm={vm}
          isActive={vm.id === selectedTarget}
          isTarget={vm.id === selectedTarget}
        />
      ))}

      {/* Connection beams */}
      {sourcesWithPositions.map(source => (
        targetWithPosition && (
          <ConnectionBeam
            key={`beam-${source.id}`}
            start={source.position}
            end={targetWithPosition.position}
            isActive={isAttacking}
          />
        )
      ))}

      {/* Packets */}
      <PacketsManager
        sources={sourcesWithPositions}
        target={targetWithPosition}
        isAttacking={isAttacking}
        onPacketComplete={onPacketReceived}
      />

      {/* Camera controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={6}
        maxDistance={25}
        target={[0, 0, 0]}
        autoRotate={!isAttacking}
        autoRotateSpeed={0.5}
      />
    </>
  );
};

// Main component
export const CyberAttackMap: React.FC<CyberAttackMapProps> = ({
  redTeamVMs,
  blueTeamVMs,
  selectedSources,
  selectedTarget,
  isAttacking,
  attackLogs = []
}) => {
  const statsRef = useRef({ packets: 0 });
  const [displayPackets, setDisplayPackets] = useState(0);

  const handlePacketReceived = useCallback(() => {
    statsRef.current.packets += 1;
    setDisplayPackets(statsRef.current.packets);
  }, []);

  return (
    <div className="relative w-full h-[650px] rounded-2xl overflow-hidden" style={{ backgroundColor: COLORS.bg }}>
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [10, 8, 10], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: `linear-gradient(180deg, ${COLORS.bg} 0%, #0f0f18 100%)` }}
      >
        <Scene
          redTeamVMs={redTeamVMs}
          blueTeamVMs={blueTeamVMs}
          selectedSources={selectedSources}
          selectedTarget={selectedTarget}
          isAttacking={isAttacking}
          onPacketReceived={handlePacketReceived}
        />
      </Canvas>

      {/* Team Labels */}
      <div className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-md"
        style={{ backgroundColor: COLORS.attackerBg, border: `1px solid ${COLORS.attackerBorder}` }}>
        <Cpu className="w-4 h-4" style={{ color: COLORS.attackerSecondary }} />
        <span className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>Attackers</span>
        <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: COLORS.attackerPrimary, color: '#fff' }}>
          {selectedSources.length} active
        </span>
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-md"
        style={{ backgroundColor: COLORS.targetBg, border: `1px solid ${COLORS.targetBorder}` }}>
        <Shield className="w-4 h-4" style={{ color: COLORS.targetSecondary }} />
        <span className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>Targets</span>
        <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: COLORS.targetPrimary, color: '#fff' }}>
          {selectedTarget ? '1' : '0'} selected
        </span>
      </div>

      {/* Stats Panel */}
      <motion.div
        className="absolute bottom-4 left-4 p-4 rounded-xl backdrop-blur-md"
        style={{ backgroundColor: COLORS.bgCard, border: `1px solid ${COLORS.glassBorder}` }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-3">
          <Activity className="w-4 h-4" style={{ color: COLORS.attackerSecondary }} />
          <span className="text-sm font-semibold" style={{ color: COLORS.textPrimary }}>Live Stats</span>
          {isAttacking && (
            <span className="flex h-2 w-2 ml-auto">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full opacity-75"
                style={{ backgroundColor: COLORS.success }} />
              <span className="relative inline-flex rounded-full h-2 w-2"
                style={{ backgroundColor: COLORS.success }} />
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="block mb-1" style={{ color: COLORS.textMuted }}>Packets Sent</span>
            <span className="text-lg font-bold font-mono" style={{ color: COLORS.attackerSecondary }}>
              {displayPackets.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="block mb-1" style={{ color: COLORS.textMuted }}>Active Flows</span>
            <span className="text-lg font-bold font-mono" style={{ color: COLORS.textPrimary }}>
              {selectedSources.length}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Attack Status */}
      <AnimatePresence>
        {isAttacking && (
          <motion.div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full backdrop-blur-md flex items-center gap-3"
            style={{ backgroundColor: COLORS.attackerBg, border: `1px solid ${COLORS.attackerBorder}` }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <Zap className="w-4 h-4" style={{ color: COLORS.attackerSecondary }} />
            <span className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>Attack Active</span>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: COLORS.attackerSecondary }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 px-3 py-2 rounded-lg text-xs backdrop-blur-sm"
        style={{ backgroundColor: COLORS.glass, color: COLORS.textMuted, border: `1px solid ${COLORS.glassBorder}` }}>
        Drag to rotate • Scroll to zoom • Auto-rotates when idle
      </div>

      {/* Legend */}
      <div className="absolute top-1/2 right-4 -translate-y-1/2 p-3 rounded-xl backdrop-blur-md"
        style={{ backgroundColor: COLORS.bgCard, border: `1px solid ${COLORS.glassBorder}` }}>
        <span className="text-xs font-medium mb-3 block" style={{ color: COLORS.textSecondary }}>Legend</span>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.attackerPrimary }} />
            <span style={{ color: COLORS.textMuted }}>Attacker</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.targetPrimary }} />
            <span style={{ color: COLORS.textMuted }}>Target</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.inactive }} />
            <span style={{ color: COLORS.textMuted }}>Inactive</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CyberAttackMap;
