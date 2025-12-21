import { VMNode, AttackType } from "./types";

// Cyber Range Network Infrastructure
export const RED_TEAM_VMS: VMNode[] = [
  {
    id: "scheduler",
    name: "Attack Scheduler",
    ip: "10.72.200.61",
    type: "attacker",
    role: "Coordination",
    status: "online",
    position: { x: 100, y: 100 },
  },
  {
    id: "generator",
    name: "Attack Generator",
    ip: "10.72.200.62",
    type: "attacker",
    role: "Primary Attacker",
    status: "online",
    position: { x: 100, y: 200 },
  },
  {
    id: "gui",
    name: "Red Team GUI",
    ip: "10.72.200.63",
    type: "attacker",
    role: "C2 Interface",
    status: "online",
    position: { x: 100, y: 300 },
  },
  {
    id: "botnet1",
    name: "Botnet Generator 1",
    ip: "10.72.200.64",
    type: "attacker",
    role: "Distributed Attack",
    status: "online",
    position: { x: 100, y: 400 },
  },
  {
    id: "botnet2",
    name: "Botnet Generator 2",
    ip: "10.72.200.65",
    type: "attacker",
    role: "Distributed Attack",
    status: "online",
    position: { x: 100, y: 500 },
  },
];

export const BLUE_TEAM_VMS: VMNode[] = [
  {
    id: "team1",
    name: "Blue Team 1",
    ip: "10.72.200.51",
    type: "target",
    role: "Vulnerable Apps",
    status: "online",
    services: [
      { name: "DVWA", port: 9080, status: "running" },
      { name: "bWAPP", port: 9090, status: "running" },
      { name: "Juice Shop", port: 3000, status: "running" },
    ],
    position: { x: 700, y: 150 },
  },
  {
    id: "team1-siem",
    name: "Team 1 SIEM",
    ip: "10.72.200.52",
    type: "siem",
    role: "Wazuh",
    status: "online",
    services: [{ name: "Wazuh", port: 443, status: "running" }],
    position: { x: 850, y: 100 },
  },
  {
    id: "team1-ids",
    name: "Team 1 IDS",
    ip: "10.72.200.53",
    type: "ids",
    role: "Suricata/Evebox",
    status: "online",
    services: [{ name: "Evebox", port: 5636, status: "running" }],
    position: { x: 850, y: 200 },
  },
  {
    id: "team2",
    name: "Blue Team 2",
    ip: "10.72.200.54",
    type: "target",
    role: "Primary Target",
    status: "online",
    services: [
      { name: "DVWA", port: 9080, status: "running" },
      { name: "bWAPP", port: 9090, status: "running" },
      { name: "Juice Shop", port: 3000, status: "running" },
    ],
    position: { x: 700, y: 350 },
  },
  {
    id: "team2-siem",
    name: "Team 2 SIEM",
    ip: "10.72.200.55",
    type: "siem",
    role: "Wazuh",
    status: "online",
    services: [{ name: "Wazuh", port: 443, status: "running" }],
    position: { x: 850, y: 300 },
  },
  {
    id: "team2-ids",
    name: "Team 2 IDS",
    ip: "10.72.200.56",
    type: "ids",
    role: "Suricata/Evebox",
    status: "online",
    services: [{ name: "Evebox", port: 5636, status: "running" }],
    position: { x: 850, y: 400 },
  },
  {
    id: "team3",
    name: "Blue Team 3",
    ip: "10.72.200.57",
    type: "target",
    role: "Vulnerable Apps",
    status: "online",
    services: [
      { name: "DVWA", port: 9080, status: "running" },
      { name: "bWAPP", port: 9090, status: "running" },
      { name: "Juice Shop", port: 3000, status: "running" },
    ],
    position: { x: 700, y: 550 },
  },
  {
    id: "team3-siem",
    name: "Team 3 SIEM",
    ip: "10.72.200.58",
    type: "siem",
    role: "Wazuh",
    status: "online",
    services: [{ name: "Wazuh", port: 443, status: "running" }],
    position: { x: 850, y: 500 },
  },
  {
    id: "team3-ids",
    name: "Team 3 IDS",
    ip: "10.72.200.59",
    type: "ids",
    role: "Suricata/Evebox",
    status: "online",
    services: [{ name: "Evebox", port: 5636, status: "running" }],
    position: { x: 850, y: 600 },
  },
];

export const ALL_VMS = [...RED_TEAM_VMS, ...BLUE_TEAM_VMS];

export const ATTACK_TYPES: {
  type: AttackType;
  name: string;
  description: string;
  icon: string;
  color: string;
}[] = [
  {
    type: "syn_flood",
    name: "SYN Flood",
    description: "TCP SYN packet flood to exhaust connection resources",
    icon: "🌊",
    color: "#ef4444",
  },
  {
    type: "udp_flood",
    name: "UDP Flood",
    description: "UDP packet flood to saturate bandwidth",
    icon: "🌪️",
    color: "#f97316",
  },
  {
    type: "http_flood",
    name: "HTTP Flood",
    description: "Application-layer HTTP request flood (GoldenEye)",
    icon: "💥",
    color: "#eab308",
  },
  {
    type: "slowloris",
    name: "Slowloris",
    description: "Slow HTTP attack to exhaust connection pool",
    icon: "🐌",
    color: "#22c55e",
  },
  {
    type: "icmp_flood",
    name: "ICMP Flood",
    description: "ICMP Echo Request flood (Ping flood)",
    icon: "📡",
    color: "#3b82f6",
  },
];

export function getVMById(id: string): VMNode | undefined {
  return ALL_VMS.find((vm) => vm.id === id);
}

export function getAttackTypeInfo(type: AttackType) {
  return ATTACK_TYPES.find((at) => at.type === type);
}
