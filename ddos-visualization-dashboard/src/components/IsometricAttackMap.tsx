"use client";

import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, RoundedBox, Float } from '@react-three/drei';
import * as THREE from 'three';
import { Activity, Zap, Target, Server } from 'lucide-react';

interface VMNode {
  id: string;
  name: string;
  ip: string;
  role: string;
  status: 'online' | 'offline' | 'attacking' | 'target';
  port?: number;
}

export interface PacketStats {
  sent: number;
  received: number;
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
  initialStats?: PacketStats;
  onStatsUpdate?: (stats: PacketStats) => void;
}

// Modern color palette with RED theme
const COLORS = {
  // Backgrounds
  bg: '#0a0a0f',
  bgCard: '#12121a',
  bgHover: '#1a1a24',

  // Red theme for attackers
  attackerPrimary: '#dc2626',
  attackerSecondary: '#ef4444',
  attackerGlow: '#f87171',
  attackerDark: '#7f1d1d',

  // Blue theme for targets
  targetPrimary: '#2563eb',
  targetSecondary: '#3b82f6',
  targetGlow: '#60a5fa',
  targetDark: '#1e3a8a',

  // Neutral
  inactive: '#374151',
  inactiveLight: '#4b5563',

  // Text
  textPrimary: '#f9fafb',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',

  // Accents
  success: '#22c55e',
  warning: '#f59e0b',

  // Packet
  packet: '#ef4444',
  packetTrail: '#dc2626',
};

// Packet component for 3D visualization
interface PacketProps {
  startPos: [number, number, number];
  endPos: [number, number, number];
  speed: number;
  onComplete: () => void;
  seqNum: number;
}

const Packet: React.FC<PacketProps> = ({ startPos, endPos, speed, onComplete, seqNum }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);
  const trailRef = useRef<THREE.Points>(null);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    progressRef.current += delta * speed;

    if (progressRef.current >= 1) {
      onComplete();
      return;
    }

    const t = progressRef.current;
    const x = startPos[0] + (endPos[0] - startPos[0]) * t;
    const y = startPos[1] + (endPos[1] - startPos[1]) * t + Math.sin(t * Math.PI) * 0.3;
    const z = startPos[2] + (endPos[2] - startPos[2]) * t;

    meshRef.current.position.set(x, y, z);
  });

  return (
    <group>
      <mesh ref={meshRef} position={startPos}>
        <boxGeometry args={[0.15, 0.08, 0.08]} />
        <meshStandardMaterial
          color={COLORS.packet}
          emissive={COLORS.packet}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
};

// 3D Computer/Server component
interface ComputerProps {
  position: [number, number, number];
  vm: VMNode;
  isActive: boolean;
  isTarget: boolean;
  isRedTeam: boolean;
}

const Computer: React.FC<ComputerProps> = ({ position, vm, isActive, isTarget, isRedTeam }) => {
  const groupRef = useRef<THREE.Group>(null);

  const color = useMemo(() => {
    if (!isActive) return COLORS.inactive;
    return isTarget ? COLORS.targetPrimary : COLORS.attackerPrimary;
  }, [isActive, isTarget]);

  const glowColor = useMemo(() => {
    if (!isActive) return COLORS.inactiveLight;
    return isTarget ? COLORS.targetGlow : COLORS.attackerGlow;
  }, [isActive, isTarget]);

  useFrame((state) => {
    if (groupRef.current && isActive) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Computer Tower */}
      <RoundedBox args={[0.6, 0.9, 0.4]} radius={0.05} smoothness={4} position={[0, 0.45, 0]}>
        <meshStandardMaterial
          color={color}
          metalness={0.3}
          roughness={0.7}
        />
      </RoundedBox>

      {/* Screen/Monitor */}
      <RoundedBox args={[0.7, 0.5, 0.05]} radius={0.02} smoothness={4} position={[0, 1.15, 0.2]}>
        <meshStandardMaterial
          color="#1a1a24"
          metalness={0.5}
          roughness={0.5}
        />
      </RoundedBox>

      {/* Screen display */}
      <mesh position={[0, 1.15, 0.23]}>
        <planeGeometry args={[0.6, 0.4]} />
        <meshStandardMaterial
          color={isActive ? glowColor : '#1f2937'}
          emissive={isActive ? glowColor : '#000000'}
          emissiveIntensity={isActive ? 0.3 : 0}
        />
      </mesh>

      {/* Power LED */}
      <mesh position={[0.2, 0.2, 0.21]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial
          color={isActive ? COLORS.success : '#374151'}
          emissive={isActive ? COLORS.success : '#000000'}
          emissiveIntensity={isActive ? 1 : 0}
        />
      </mesh>

      {/* Glow ring for active */}
      {isActive && (
        <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.55, 32]} />
          <meshBasicMaterial
            color={glowColor}
            transparent
            opacity={0.4}
          />
        </mesh>
      )}

      {/* IP Label */}
      <Text
        position={[0, -0.2, 0.3]}
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
        position={[0, -0.35, 0.3]}
        fontSize={0.08}
        color={isActive ? glowColor : COLORS.textMuted}
        anchorX="center"
        anchorY="middle"
      >
        {vm.name.substring(0, 12)}
      </Text>
    </group>
  );
};

// Connection line between computers
interface ConnectionLineProps {
  start: [number, number, number];
  end: [number, number, number];
  isActive: boolean;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ start, end, isActive }) => {
  const line = useMemo(() => {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...start),
      new THREE.Vector3((start[0] + end[0]) / 2, Math.max(start[1], end[1]) + 0.5, (start[2] + end[2]) / 2),
      new THREE.Vector3(...end)
    );
    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: isActive ? COLORS.attackerSecondary : COLORS.inactive,
      transparent: true,
      opacity: isActive ? 0.8 : 0.3
    });
    return new THREE.Line(geometry, material);
  }, [start, end, isActive]);

  return <primitive object={line} />;
};

// Packets Manager component
interface PacketsManagerProps {
  sources: { id: string; position: [number, number, number] }[];
  target: { id: string; position: [number, number, number] } | null;
  isAttacking: boolean;
  onPacketComplete: () => void;
  packetsPerSecond: number;
}

const PacketsManager: React.FC<PacketsManagerProps> = ({
  sources,
  target,
  isAttacking,
  onPacketComplete,
  packetsPerSecond
}) => {
  const [packets, setPackets] = useState<{ id: number; sourcePos: [number, number, number]; seqNum: number }[]>([]);
  const packetIdRef = useRef(0);
  const lastSpawnRef = useRef(0);

  useFrame((state) => {
    if (!isAttacking || !target || sources.length === 0) return;

    const now = state.clock.elapsedTime * 1000;
    const spawnInterval = 1000 / packetsPerSecond;

    if (now - lastSpawnRef.current > spawnInterval) {
      const newPackets = sources.map(source => ({
        id: packetIdRef.current++,
        sourcePos: source.position,
        seqNum: packetIdRef.current % 9999
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
          speed={0.8 + Math.random() * 0.4}
          onComplete={() => handlePacketComplete(packet.id)}
          seqNum={packet.seqNum}
        />
      ))}
    </>
  );
};

// Main 3D Scene
interface SceneProps {
  redTeamVMs: VMNode[];
  blueTeamVMs: VMNode[];
  selectedSources: string[];
  selectedTarget: string | null;
  isAttacking: boolean;
  onPacketReceived: () => void;
  packetsPerSecond: number;
}

const Scene: React.FC<SceneProps> = ({
  redTeamVMs,
  blueTeamVMs,
  selectedSources,
  selectedTarget,
  isAttacking,
  onPacketReceived,
  packetsPerSecond
}) => {
  const redTeamPositions = useMemo(() => {
    return redTeamVMs.map((vm, index) => ({
      vm,
      position: [-3, 0, (index - (redTeamVMs.length - 1) / 2) * 2] as [number, number, number]
    }));
  }, [redTeamVMs]);

  const blueTeamPositions = useMemo(() => {
    return blueTeamVMs.map((vm, index) => ({
      vm,
      position: [3, 0, (index - (blueTeamVMs.length - 1) / 2) * 2.5] as [number, number, number]
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
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#3b82f6" />
      <pointLight position={[0, -5, 0]} intensity={0.3} color="#ef4444" />

      {/* Grid floor */}
      <gridHelper args={[20, 20, COLORS.inactive, COLORS.inactive]} position={[0, -0.5, 0]} />

      {/* Red Team Computers */}
      {redTeamPositions.map(({ vm, position }) => (
        <Computer
          key={vm.id}
          position={position}
          vm={vm}
          isActive={selectedSources.includes(vm.id)}
          isTarget={false}
          isRedTeam={true}
        />
      ))}

      {/* Blue Team Computers */}
      {blueTeamPositions.map(({ vm, position }) => (
        <Computer
          key={vm.id}
          position={position}
          vm={vm}
          isActive={vm.id === selectedTarget}
          isTarget={vm.id === selectedTarget}
          isRedTeam={false}
        />
      ))}

      {/* Connection Lines */}
      {sourcesWithPositions.map(source => (
        targetWithPosition && (
          <ConnectionLine
            key={`line-${source.id}`}
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
        packetsPerSecond={packetsPerSecond}
      />

      {/* Camera controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={20}
        target={[0, 0.5, 0]}
      />
    </>
  );
};

// Main exported component
export const IsometricAttackMap: React.FC<IsometricAttackMapProps> = ({
  redTeamVMs,
  blueTeamVMs,
  selectedSources,
  selectedTarget,
  targetPort,
  isAttacking,
  attackType,
  packetsPerSecond = 15,
  initialStats,
  onStatsUpdate
}) => {
  // Use ref to persist packet count across re-renders
  const statsRef = useRef(initialStats || { sent: 0, received: 0 });
  const [displayStats, setDisplayStats] = useState(initialStats || { sent: 0, received: 0 });

  // Sync with initialStats when component mounts or initialStats changes
  useEffect(() => {
    if (initialStats) {
      statsRef.current = { ...initialStats };
      setDisplayStats({ ...initialStats });
    }
  }, [initialStats]);

  // Only reset when attack starts fresh, not on every render
  const attackStartedRef = useRef(false);

  useEffect(() => {
    if (isAttacking && !attackStartedRef.current) {
      attackStartedRef.current = true;
      // Don't reset - keep counting
    } else if (!isAttacking) {
      attackStartedRef.current = false;
    }
  }, [isAttacking]);

  const handlePacketReceived = () => {
    statsRef.current.sent += 1;
    statsRef.current.received += 1;
    const newStats = { ...statsRef.current };
    setDisplayStats(newStats);
    // Notify parent of stats update
    if (onStatsUpdate) {
      onStatsUpdate(newStats);
    }
  };

  const getProtocol = (type: string): string => {
    switch (type) {
      case 'syn_flood': return 'TCP SYN';
      case 'udp_flood': return 'UDP';
      case 'http_flood': return 'HTTP';
      case 'slowloris': return 'HTTP';
      case 'icmp_flood': return 'ICMP';
      case 'hulk': return 'HULK';
      default: return 'TCP';
    }
  };

  return (
    <div className="relative w-full h-[700px] rounded-2xl overflow-hidden" style={{ backgroundColor: COLORS.bg }}>
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [8, 6, 8], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: COLORS.bg }}
      >
        <Scene
          redTeamVMs={redTeamVMs}
          blueTeamVMs={blueTeamVMs}
          selectedSources={selectedSources}
          selectedTarget={selectedTarget}
          isAttacking={isAttacking}
          onPacketReceived={handlePacketReceived}
          packetsPerSecond={packetsPerSecond}
        />
      </Canvas>

      {/* Modern UI Overlay - Stats Card */}
      <div className="absolute top-4 left-4 p-4 rounded-xl backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(18, 18, 26, 0.9)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4" style={{ color: COLORS.attackerSecondary }} />
          <span className="text-sm font-semibold" style={{ color: COLORS.textPrimary }}>
            Attack Statistics
          </span>
          {isAttacking && (
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full opacity-75"
                style={{ backgroundColor: COLORS.success }} />
              <span className="relative inline-flex rounded-full h-2 w-2"
                style={{ backgroundColor: COLORS.success }} />
            </span>
          )}
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between gap-8">
            <span style={{ color: COLORS.textSecondary }}>Protocol</span>
            <span className="font-mono font-medium" style={{ color: COLORS.textPrimary }}>
              {getProtocol(attackType)}
            </span>
          </div>
          <div className="flex justify-between gap-8">
            <span style={{ color: COLORS.textSecondary }}>Target</span>
            <span className="font-mono font-medium" style={{ color: COLORS.textPrimary }}>
              {selectedTarget ? blueTeamVMs.find(v => v.id === selectedTarget)?.ip : 'None'}:{targetPort}
            </span>
          </div>
          <div className="flex justify-between gap-8">
            <span style={{ color: COLORS.textSecondary }}>Packets Sent</span>
            <span className="font-mono font-bold" style={{ color: COLORS.attackerSecondary }}>
              {displayStats.sent.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between gap-8">
            <span style={{ color: COLORS.textSecondary }}>Sources Active</span>
            <span className="font-mono font-medium" style={{ color: COLORS.textPrimary }}>
              {selectedSources.length}
            </span>
          </div>
        </div>
      </div>

      {/* Legend Card */}
      <div className="absolute top-4 right-4 p-4 rounded-xl backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(18, 18, 26, 0.9)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
        <span className="text-xs font-semibold mb-3 block" style={{ color: COLORS.textPrimary }}>
          Legend
        </span>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.attackerPrimary }} />
            <span style={{ color: COLORS.textSecondary }}>Attacker</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.targetPrimary }} />
            <span style={{ color: COLORS.textSecondary }}>Target</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: COLORS.packet }} />
            <span style={{ color: COLORS.textSecondary }}>Packet</span>
          </div>
        </div>
      </div>

      {/* Attack Status Banner */}
      {isAttacking && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full backdrop-blur-md flex items-center gap-3"
          style={{
            backgroundColor: 'rgba(220, 38, 38, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
          <Zap className="w-4 h-4" style={{ color: COLORS.attackerSecondary }} />
          <span className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>
            {getProtocol(attackType)} Flood Active
          </span>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: COLORS.attackerSecondary }} />
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 px-3 py-2 rounded-lg text-xs"
        style={{
          backgroundColor: 'rgba(18, 18, 26, 0.7)',
          color: COLORS.textMuted
        }}>
        Drag to rotate • Scroll to zoom
      </div>
    </div>
  );
};

export default IsometricAttackMap;
