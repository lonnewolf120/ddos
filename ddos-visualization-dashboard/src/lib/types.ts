// Network Infrastructure Types
export interface VMNode {
  id: string;
  name: string;
  ip: string;
  type: "attacker" | "target" | "siem" | "ids";
  role: string;
  status: "online" | "offline" | "attacking" | "under_attack";
  services?: Service[];
  position: { x: number; y: number };
}

export interface Service {
  name: string;
  port: number;
  status: "running" | "stopped" | "overloaded";
}

export interface AttackFlow {
  id: string;
  sourceId: string;
  targetId: string;
  attackType: AttackType;
  status: "active" | "completed" | "failed";
  packetsPerSecond: number;
  bytesPerSecond: number;
  startTime: string;
  duration: number;
}

export type AttackType =
  | "syn_flood"
  | "udp_flood"
  | "http_flood"
  | "slowloris"
  | "icmp_flood";

export interface AttackConfig {
  attackType: AttackType;
  sourceVMs: string[];
  targetVM: string;
  targetPort: number;
  duration: number;
  intensity: "low" | "medium" | "high";
  workers?: number;
  sockets?: number;
}

export interface AttackResult {
  attackId: string;
  attackerVm: string;
  targetIp: string;
  targetPort: number;
  tool: string;
  startTime: string;
  endTime?: string;
  status: "queued" | "running" | "completed" | "failed";
  packetsSent: number;
  bytesSent: number;
  stdout: string;
  stderr: string;
  exitCode?: number;
}

export interface AttackMetrics {
  timestamp: string;
  packetsPerSecond: number;
  bytesPerSecond: number;
  connectionsActive: number;
  cpuUsage: number;
  memoryUsage: number;
  networkUtilization: number;
}

export interface AlertEvent {
  id: string;
  timestamp: string;
  source: "wazuh" | "suricata";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  sourceIp?: string;
  targetIp?: string;
  attackType?: string;
}

// Dashboard State
export interface DashboardState {
  isAttacking: boolean;
  activeAttacks: AttackFlow[];
  metrics: AttackMetrics[];
  alerts: AlertEvent[];
  selectedAttack: AttackFlow | null;
}
