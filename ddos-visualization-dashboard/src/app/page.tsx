"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server,
  Shield,
  Zap,
  Activity,
  Play,
  Square,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  Cpu,
  Network,
  ArrowRight,
  Settings,
  BarChart3,
  Terminal,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CyberAttackMap } from '@/components/CyberAttackMap';
import { NetworkAttackMap } from '@/components/NetworkAttackMap';
import InteractiveNetworkTopology from '@/components/InteractiveNetworkTopology';

// ============================================================================
// Types
// ============================================================================

interface VMNode {
  id: string;
  name: string;
  ip: string;
  role: string;
  status: 'online' | 'offline' | 'attacking' | 'target';
  x: number;
  y: number;
}

interface AttackConfig {
  attackType: string;
  sourceVMs: string[];
  targetId: string;
  targetPort: number;
  duration: number;
  workers: number;
  sockets: number;
  enableIpSpoofing?: boolean;
  spoofedIps?: string[];
}

interface AttackLog {
  timestamp: string;
  source: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface ActiveAttack {
  attack_id: string;
  attack_type: string;
  source_vms: string[];
  target_ip: string;
  target_port: number;
  duration: number;
  status: string;
  start_time: string;
  end_time?: string;
}

// ============================================================================
// Constants
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://10.72.200.22:8841';

const RED_TEAM_VMS: VMNode[] = [
  { id: 'scheduler', name: 'Attack Scheduler', ip: '10.72.200.61', role: 'Coordination', status: 'offline', x: 100, y: 100 },
  { id: 'generator', name: 'Attack Generator', ip: '10.72.200.62', role: 'Primary Attacker', status: 'offline', x: 100, y: 200 },
  { id: 'gui', name: 'Red Team GUI', ip: '10.72.200.63', role: 'C2 Interface', status: 'offline', x: 100, y: 300 },
  { id: 'botnet1', name: 'Botnet Gen 1', ip: '10.72.200.64', role: 'Distributed Attack', status: 'offline', x: 100, y: 400 },
  { id: 'botnet2', name: 'Botnet Gen 2', ip: '10.72.200.65', role: 'Distributed Attack', status: 'offline', x: 100, y: 500 },
];

const BLUE_TEAM_VMS: VMNode[] = [
  // { id: 'team1', name: 'Blue Team 1', ip: '20.10.40.11', role: 'Target Infrastructure', status: 'offline', x: 700, y: 200 },  // Hidden - not using OPNsense LAN routing
  { id: 'team2', name: 'Blue Team 2', ip: '192.168.50.11', role: 'Target Infrastructure', status: 'offline', x: 700, y: 200 },
  // { id: 'team3', name: 'Blue Team 3', ip: '20.10.60.11', role: 'Target Infrastructure', status: 'offline', x: 700, y: 500 },  // Hidden - not using OPNsense LAN routing
  { id: 'bank', name: 'Vulnerable Bank Website', ip: '192.168.50.101', role: 'Primary DDoS Target', status: 'offline', x: 700, y: 350 },
];

const ATTACK_TYPES = [
  { id: 'syn_flood', name: 'SYN Flood', description: 'TCP SYN flood attack', color: '#ef4444' },
  { id: 'udp_flood', name: 'UDP Flood', description: 'UDP packet flood', color: '#f97316' },
  { id: 'http_flood', name: 'HTTP Flood', description: 'GoldenEye HTTP flood', color: '#eab308' },
  { id: 'slowloris', name: 'Slowloris', description: 'Slow HTTP attack', color: '#22c55e' },
  { id: 'icmp_flood', name: 'ICMP Flood', description: 'Ping flood attack', color: '#3b82f6' },
  { id: 'hulk', name: 'HULK', description: 'HTTP Unbearable Load King', color: '#8b5cf6' },
];

// ============================================================================
// Components
// ============================================================================

// VM Node Component
const VMNodeCard: React.FC<{
  vm: VMNode;
  isSelected: boolean;
  isTarget?: boolean;
  isAttacking?: boolean;
  onClick?: () => void;
}> = ({ vm, isSelected, isTarget, isAttacking, onClick }) => {
  const getStatusColor = () => {
    if (isAttacking) return 'bg-red-500';
    if (isTarget) return 'bg-orange-500';
    if (vm.status === 'online') return 'bg-green-500';
    return 'bg-gray-500';
  };

  const getStatusIcon = () => {
    if (isAttacking) return <Zap className="w-4 h-4 animate-pulse" />;
    if (isTarget) return <Target className="w-4 h-4" />;
    if (vm.status === 'online') return <CheckCircle2 className="w-4 h-4" />;
    return <WifiOff className="w-4 h-4" />;
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200
        ${isSelected ? 'border-blue-500 bg-blue-500/10 shadow-lg' : 'border-gray-700 bg-gray-800/60 shadow-md'}
        ${isAttacking ? 'border-red-500 bg-red-500/20 shadow-lg shadow-red-500/20 animate-pulse' : ''}
        ${isTarget ? 'border-orange-500 bg-orange-500/20 shadow-lg shadow-orange-500/20' : ''}
        hover:shadow-xl
      `}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${getStatusColor()} shadow-md`}>
          {getStatusIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-white truncate">{vm.name}</p>
          <p className="text-xs text-gray-400 font-mono">{vm.ip}</p>
        </div>
        {isSelected && (
          <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
        )}
      </div>
      <Badge variant="outline" className="mt-3 text-xs font-medium">
        {vm.role}
      </Badge>
    </motion.div>
  );
};

// Attack Flow Animation Component
const AttackFlowAnimation: React.FC<{
  isActive: boolean;
  sourceVMs: string[];
  targetId: string;
  attackType: string;
}> = ({ isActive, sourceVMs, targetId, attackType }) => {
  if (!isActive || sourceVMs.length === 0 || !targetId) return null;

  const attackColor = ATTACK_TYPES.find(a => a.id === attackType)?.color || '#ef4444';

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {sourceVMs.map((vmId, index) => {
        const sourceVM = RED_TEAM_VMS.find(vm => vm.id === vmId);
        const targetVM = BLUE_TEAM_VMS.find(vm => vm.id === targetId);
        if (!sourceVM || !targetVM) return null;

        return (
          <motion.div
            key={`flow-${vmId}-${index}`}
            className="absolute"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <svg className="w-full h-full absolute inset-0">
              <motion.line
                x1="200"
                y1={100 + index * 80}
                x2="600"
                y2={200 + (BLUE_TEAM_VMS.findIndex(v => v.id === targetId) * 100)}
                stroke={attackColor}
                strokeWidth="3"
                strokeDasharray="10,5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1, strokeDashoffset: [0, -30] }}
                transition={{
                  pathLength: { duration: 1 },
                  strokeDashoffset: { duration: 0.5, repeat: Infinity, ease: "linear" }
                }}
              />
            </svg>
          </motion.div>
        );
      })}
    </div>
  );
};

// Log Viewer Component
const LogViewer: React.FC<{ logs: AttackLog[] }> = ({ logs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogStyle = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-gray-300';
    }
  };

  return (
    <div
      ref={logContainerRef}
      className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-4 h-64 overflow-y-auto font-mono text-xs border border-gray-800 shadow-inner"
    >
      {logs.length === 0 ? (
        <p className="text-gray-500 text-center py-8 text-sm">No attack logs yet...</p>
      ) : (
        logs.map((log, index) => (
          <div key={index} className={`mb-2 ${getLogStyle(log.type)} leading-relaxed`}>
            <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
            {log.source && <span className="text-blue-400"> [{log.source}]</span>}
            <span> {log.message}</span>
          </div>
        ))
      )}
    </div>
  );
};

// ============================================================================
// Main Dashboard Component
// ============================================================================

export default function DDoSDashboard() {
  // State
  const [redTeamVMs, setRedTeamVMs] = useState<VMNode[]>(RED_TEAM_VMS);
  const [blueTeamVMs, setBlueTeamVMs] = useState<VMNode[]>(BLUE_TEAM_VMS);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [attackConfig, setAttackConfig] = useState<AttackConfig>({
    attackType: 'http_flood',
    sourceVMs: [],
    targetId: '',
    targetPort: 9080,
    duration: 120,
    workers: 50,
    sockets: 100,
    enableIpSpoofing: false,
    spoofedIps: [],
  });
  const [activeAttack, setActiveAttack] = useState<ActiveAttack | null>(null);
  const [attackLogs, setAttackLogs] = useState<AttackLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // IP Spoofing State
  const [ipSpoofingEnabled, setIpSpoofingEnabled] = useState(false);
  const [useSequentialIps, setUseSequentialIps] = useState(false);
  const [selectedIpRange, setSelectedIpRange] = useState('10.0.0.0/8');
  const [customIpRange, setCustomIpRange] = useState('');
  const [startingIp, setStartingIp] = useState('192.168.1.1');
  const [ipCount, setIpCount] = useState(10);
  const [generatedIps, setGeneratedIps] = useState<string[]>([]);
  const [commonIpRanges, setCommonIpRanges] = useState<string[]>([]);

  // Check API connection
  const checkApiConnection = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      if (response.ok) {
        setApiConnected(true);
        return true;
      }
    } catch (error) {
      console.error('API connection failed:', error);
    }
    setApiConnected(false);
    return false;
  }, []);

  // Fetch common IP ranges for spoofing
  const fetchCommonIpRanges = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/spoofing/ranges`);
      if (response.ok) {
        const data = await response.json();
        setCommonIpRanges(data.ranges || []);
        if (data.ranges && data.ranges.length > 0) {
          setSelectedIpRange(data.ranges[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch common IP ranges:', error);
    }
  }, []);

  // Generate random IPs for spoofing
  const generateRandomIps = async () => {
    try {
      const requestBody = useSequentialIps
        ? { starting_ip: startingIp, count: ipCount, use_sequential: true }
        : { ip_range: customIpRange || selectedIpRange, count: ipCount, use_sequential: false };

      const response = await fetch(`${API_BASE_URL}/api/spoofing/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedIps(data.spoofed_ips || []);
        setAttackConfig(prev => ({
          ...prev,
          spoofedIps: data.spoofed_ips || []
        }));

        const source = useSequentialIps
          ? `starting from ${startingIp}`
          : `from ${customIpRange || selectedIpRange}`;
        addLog('success', `Generated ${data.count} ${useSequentialIps ? 'sequential' : 'random'} IP addresses ${source}`);
      } else {
        const error = await response.json();
        addLog('error', `Failed to generate IPs: ${error.detail}`);
      }
    } catch (error) {
      console.error('IP generation failed:', error);
      addLog('error', 'Failed to generate spoofed IPs');
    }
  };

  // Fetch VM statuses
  const fetchVMStatuses = useCallback(async () => {
    try {
      const [redResponse, blueResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/vms/red-team`),
        fetch(`${API_BASE_URL}/api/vms/blue-team`)
      ]);

      if (redResponse.ok) {
        const redData = await redResponse.json();
        setRedTeamVMs(prev => prev.map(vm => {
          const apiVM = redData.vms.find((v: any) => v.id === vm.id);
          return apiVM ? { ...vm, status: apiVM.status } : vm;
        }));
      }

      if (blueResponse.ok) {
        const blueData = await blueResponse.json();
        setBlueTeamVMs(prev => prev.map(vm => {
          const apiVM = blueData.targets.find((v: any) => v.id === vm.id);
          return apiVM ? { ...vm, status: 'online' } : vm;
        }));
      }
    } catch (error) {
      console.error('Failed to fetch VM statuses:', error);
    }
  }, []);

  // Connect WebSocket for attack updates
  const connectWebSocket = useCallback((attackId: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/api/attacks/${attackId}/ws`;
    console.log(`Connecting WebSocket to: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connection opened');
      addLog('info', 'WebSocket connected - receiving live updates');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data);

        if (data.type === 'connected') {
          addLog('success', 'Connected to attack stream');
        } else if (data.type === 'status') {
          addLog('info', `Attack status: ${data.attack?.status || 'running'}`);
        } else if (data.type === 'log') {
          addLog(
            data.message.includes('✅') ? 'success' :
              data.message.includes('❌') ? 'error' : 'info',
            data.message,
            data.source
          );
          // Also show stdout/stderr if present
          if (data.stdout) {
            addLog('info', `Output: ${data.stdout.substring(0, 500)}`, data.source);
          }
          if (data.stderr) {
            addLog('warning', `Stderr: ${data.stderr.substring(0, 300)}`, data.source);
          }
        } else if (data.type === 'complete') {
          addLog('success', 'Attack completed successfully');
          setActiveAttack(prev => prev ? { ...prev, status: 'completed' } : null);
        } else if (data.type === 'stopped') {
          addLog('warning', 'Attack stopped by user');
          setActiveAttack(prev => prev ? { ...prev, status: 'stopped' } : null);
        } else if (data.type === 'heartbeat') {
          // Silently handle heartbeat
          console.log('Heartbeat received');
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      addLog('info', 'WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      addLog('error', 'WebSocket connection error - check if backend is running');
    };

    wsRef.current = ws;
  }, []);

  // Add log entry
  const addLog = (type: AttackLog['type'], message: string, source?: string) => {
    setAttackLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      type,
      message,
      source: source || ''
    }]);
  };

  // Execute attack
  const executeAttack = async () => {
    if (selectedSources.length === 0) {
      addLog('error', 'No source VMs selected');
      return;
    }
    if (!selectedTarget) {
      addLog('error', 'No target selected');
      return;
    }
    if (ipSpoofingEnabled && generatedIps.length === 0) {
      addLog('error', 'IP spoofing enabled but no IPs generated. Click "Generate Random IPs" first.');
      return;
    }

    setIsLoading(true);
    setAttackLogs([]);
    addLog('info', `Starting ${attackConfig.attackType} attack...`);
    addLog('info', `Sources: ${selectedSources.join(', ')}`);
    addLog('info', `Target: ${selectedTarget}:${attackConfig.targetPort}`);
    if (ipSpoofingEnabled) {
      addLog('info', `IP Spoofing: Enabled (${generatedIps.length} spoofed IPs)`);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/attacks/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attack_type: attackConfig.attackType,
          source_vms: selectedSources,
          target_id: selectedTarget,
          target_port: attackConfig.targetPort,
          duration: attackConfig.duration,
          workers: attackConfig.workers,
          sockets: attackConfig.sockets,
          enable_ip_spoofing: ipSpoofingEnabled,
          spoofed_ips: ipSpoofingEnabled ? generatedIps : [],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        addLog('success', `Attack launched! ID: ${data.attack_id}`);

        setActiveAttack({
          attack_id: data.attack_id,
          attack_type: attackConfig.attackType,
          source_vms: selectedSources,
          target_ip: BLUE_TEAM_VMS.find(vm => vm.id === selectedTarget)?.ip || '',
          target_port: attackConfig.targetPort,
          duration: attackConfig.duration,
          status: 'running',
          start_time: new Date().toISOString(),
        });

        // Small delay to allow attack registration, then connect WebSocket
        setTimeout(() => {
          connectWebSocket(data.attack_id);
        }, 500);
      } else {
        const error = await response.json();
        addLog('error', `Failed to launch attack: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      addLog('error', `Network error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Stop attack
  const stopAttack = async () => {
    if (!activeAttack) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/attacks/${activeAttack.attack_id}/stop`, {
        method: 'POST',
      });

      if (response.ok) {
        addLog('warning', 'Stopping attack...');
      }
    } catch (error) {
      addLog('error', `Failed to stop attack: ${error}`);
    }
  };

  // Toggle source VM selection
  const toggleSourceVM = (vmId: string) => {
    setSelectedSources(prev =>
      prev.includes(vmId)
        ? prev.filter(id => id !== vmId)
        : [...prev, vmId]
    );
  };

  // Initialize
  useEffect(() => {
    checkApiConnection();
    fetchVMStatuses();
    fetchCommonIpRanges();

    const interval = setInterval(() => {
      checkApiConnection();
      if (!activeAttack || activeAttack.status !== 'running') {
        fetchVMStatuses();
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [checkApiConnection, fetchVMStatuses, activeAttack]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
        {/* Header */}
        <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Zap className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                    DDoS Attack Simulator
                  </h1>
                  <p className="text-sm text-gray-400">Cyber Range Training Environment</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Badge variant={apiConnected ? "default" : "destructive"} className="gap-2">
                  {apiConnected ? (
                    <>
                      <Wifi className="w-3 h-3" />
                      API Connected
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3" />
                      API Disconnected
                    </>
                  )}
                </Badge>
                <Button variant="outline" size="sm" onClick={fetchVMStatuses}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Status
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6">
          <Tabs defaultValue="topology" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 lg:w-auto">
              <TabsTrigger value="topology">Network Topology</TabsTrigger>
              <TabsTrigger value="interactive">Interactive Map</TabsTrigger>
              <TabsTrigger value="network-map">Network Map</TabsTrigger>
              <TabsTrigger value="visualization">Attack Flow</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Topology Tab */}
            <TabsContent value="topology">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column - VM Selection */}
                <div className="lg:col-span-2 space-y-6">

                  {/* Network Topology Card */}
                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Network className="w-5 h-5 text-blue-500" />
                        Network Topology
                      </CardTitle>
                      <CardDescription>
                        Select source VMs and target for the attack
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">

                        {/* Attack Flow Animation */}
                        <AttackFlowAnimation
                          isActive={activeAttack?.status === 'running'}
                          sourceVMs={selectedSources}
                          targetId={selectedTarget}
                          attackType={attackConfig.attackType}
                        />

                        {/* Red Team VMs */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-red-500/20 rounded">
                              <Cpu className="w-4 h-4 text-red-500" />
                            </div>
                            <h3 className="font-semibold text-red-400">Red Team (Attackers)</h3>
                          </div>
                          <div className="space-y-2">
                            {redTeamVMs.map((vm) => (
                              <VMNodeCard
                                key={vm.id}
                                vm={vm}
                                isSelected={selectedSources.includes(vm.id)}
                                isAttacking={activeAttack?.status === 'running' && selectedSources.includes(vm.id)}
                                onClick={() => toggleSourceVM(vm.id)}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="hidden md:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                          <motion.div
                            animate={{
                              x: activeAttack?.status === 'running' ? [0, 8, 0] : 0,
                              scale: activeAttack?.status === 'running' ? [1, 1.1, 1] : 1
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: activeAttack?.status === 'running' ? Infinity : 0,
                              ease: "easeInOut"
                            }}
                            className={`
                              p-4 rounded-2xl transition-all duration-300
                              ${activeAttack?.status === 'running'
                                ? 'bg-red-600 shadow-lg shadow-red-600/50'
                                : 'bg-gray-700 shadow-md'}
                            `}
                          >
                            <ArrowRight className="w-8 h-8 text-white" />
                          </motion.div>
                        </div>

                        {/* Blue Team VMs */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 bg-blue-500/20 rounded-xl shadow-sm">
                              <Shield className="w-5 h-5 text-blue-500" />
                            </div>
                            <h3 className="font-semibold text-lg text-blue-400">Blue Team (Targets)</h3>
                          </div>
                          <div className="space-y-3">
                            {blueTeamVMs.map((vm) => (
                              <VMNodeCard
                                key={vm.id}
                                vm={vm}
                                isSelected={selectedTarget === vm.id}
                                isTarget={selectedTarget === vm.id}
                                isAttacking={activeAttack?.status === 'running' && selectedTarget === vm.id}
                                onClick={() => setSelectedTarget(vm.id)}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Attack Logs */}
                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <Terminal className="w-6 h-6 text-green-500" />
                        Attack Logs
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <LogViewer logs={attackLogs} />
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Attack Configuration */}
                <div className="space-y-6">

                  {/* Attack Configuration Card */}
                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <Settings className="w-6 h-6 text-purple-500" />
                        Attack Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">

                      {/* Attack Type */}
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Attack Type</Label>
                        <Select
                          value={attackConfig.attackType}
                          onValueChange={(value) => setAttackConfig({ ...attackConfig, attackType: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select attack type" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700">
                            {ATTACK_TYPES.map((type) => (
                              <SelectItem key={type.id} value={type.id} className="bg-gray-900 hover:bg-gray-800 focus:bg-gray-800">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: type.color }}
                                  />
                                  {type.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded">
                          {ATTACK_TYPES.find(t => t.id === attackConfig.attackType)?.description}
                        </p>
                      </div>

                      {/* Target Port */}
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Target Port</Label>
                        <Select
                          value={attackConfig.targetPort.toString()}
                          onValueChange={(value) => setAttackConfig({ ...attackConfig, targetPort: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700">
                            <SelectItem value="9080" className="bg-gray-900 hover:bg-gray-800 focus:bg-gray-800">9080 (DVWA)</SelectItem>
                            <SelectItem value="9090" className="bg-gray-900 hover:bg-gray-800 focus:bg-gray-800">9090 (bWAPP)</SelectItem>
                            <SelectItem value="3000" className="bg-gray-900 hover:bg-gray-800 focus:bg-gray-800">3000 (Juice Shop)</SelectItem>
                            <SelectItem value="80" className="bg-gray-900 hover:bg-gray-800 focus:bg-gray-800">80 (HTTP)</SelectItem>
                            <SelectItem value="443" className="bg-gray-900 hover:bg-gray-800 focus:bg-gray-800">443 (HTTPS)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Duration */}
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Duration (seconds)</Label>
                        <Input
                          type="number"
                          min={10}
                          max={600}
                          value={attackConfig.duration}
                          onChange={(e) => setAttackConfig({ ...attackConfig, duration: parseInt(e.target.value) || 120 })}
                          className="h-11"
                        />
                      </div>

                      {/* Workers (for HTTP floods) */}
                      {['http_flood', 'hulk'].includes(attackConfig.attackType) && (
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold">Workers</Label>
                          <Input
                            type="number"
                            min={1}
                            max={500}
                            value={attackConfig.workers}
                            onChange={(e) => setAttackConfig({ ...attackConfig, workers: parseInt(e.target.value) || 50 })}
                            className="h-11"
                          />
                        </div>
                      )}

                      {/* Sockets */}
                      {['http_flood', 'slowloris'].includes(attackConfig.attackType) && (
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold">Sockets</Label>
                          <Input
                            type="number"
                            min={10}
                            max={1000}
                            value={attackConfig.sockets}
                            onChange={(e) => setAttackConfig({ ...attackConfig, sockets: parseInt(e.target.value) || 100 })}
                            className="h-11"
                          />
                        </div>
                      )}

                      {/* IP Spoofing Configuration */}
                      <div className="pt-6 border-t border-gray-700 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-semibold">IP Spoofing</Label>
                            <p className="text-xs text-gray-400">Randomize source IP addresses</p>
                          </div>
                          <Switch
                            checked={ipSpoofingEnabled}
                            onCheckedChange={(checked) => {
                              setIpSpoofingEnabled(checked);
                              if (!checked) {
                                setGeneratedIps([]);
                              }
                            }}
                          />
                        </div>

                        {ipSpoofingEnabled && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-4 pt-2"
                          >
                            {/* Generation Mode Toggle */}
                            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                              <div className="space-y-0.5">
                                <Label className="text-sm">Generation Mode</Label>
                                <p className="text-xs text-gray-400">
                                  {useSequentialIps ? 'Sequential from starting IP' : 'Random from IP range'}
                                </p>
                              </div>
                              <Switch
                                checked={useSequentialIps}
                                onCheckedChange={(checked) => {
                                  setUseSequentialIps(checked);
                                  setGeneratedIps([]);
                                }}
                              />
                            </div>

                            {useSequentialIps ? (
                              /* Sequential IP Generation */
                              <div className="space-y-2">
                                <Label className="text-sm">Starting IP Address</Label>
                                <Input
                                  placeholder="e.g., 192.168.1.1"
                                  value={startingIp}
                                  onChange={(e) => setStartingIp(e.target.value)}
                                  className="h-11 font-mono text-xs"
                                />
                                <p className="text-xs text-gray-500">
                                  Will generate {ipCount} sequential IPs starting from this address
                                </p>
                              </div>
                            ) : (
                              /* Random IP Generation from CIDR Range */
                              <>
                                <div className="space-y-2">
                                  <Label className="text-sm">IP Range</Label>
                                  <Select value={selectedIpRange} onValueChange={setSelectedIpRange}>
                                    <SelectTrigger className="h-11">
                                      <SelectValue placeholder="Select IP range" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {commonIpRanges.map((range) => (
                                        <SelectItem key={range} value={range}>
                                          {range}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-sm">Custom IP Range (CIDR)</Label>
                                  <Input
                                    placeholder="e.g., 192.168.1.0/24"
                                    value={customIpRange}
                                    onChange={(e) => setCustomIpRange(e.target.value)}
                                    className="h-11 font-mono text-xs"
                                  />
                                </div>
                              </>
                            )}

                            <div className="space-y-2">
                              <Label className="text-sm">Number of IPs</Label>
                              <Input
                                type="number"
                                min={1}
                                max={1000}
                                value={ipCount}
                                onChange={(e) => setIpCount(parseInt(e.target.value) || 10)}
                                className="h-11"
                              />
                            </div>

                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={generateRandomIps}
                              disabled={isLoading}
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              {useSequentialIps ? 'Generate Sequential IPs' : 'Generate Random IPs'}
                            </Button>

                            {generatedIps.length > 0 && (
                              <div className="space-y-2">
                                <Label className="text-sm">Generated IPs ({generatedIps.length})</Label>
                                <div className="max-h-32 overflow-y-auto bg-gray-800 rounded-lg p-3 space-y-1">
                                  {generatedIps.slice(0, 10).map((ip, idx) => (
                                    <div key={idx} className="text-xs font-mono text-gray-300">
                                      {ip}
                                    </div>
                                  ))}
                                  {generatedIps.length > 10 && (
                                    <div className="text-xs text-gray-500 italic">
                                      ... and {generatedIps.length - 10} more
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>

                      {/* Selected Summary */}
                      <div className="pt-6 border-t border-gray-700">
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Sources:</span>
                            <span className="text-white">{selectedSources.length} VM(s)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Target:</span>
                            <span className="text-white">
                              {selectedTarget ? BLUE_TEAM_VMS.find(vm => vm.id === selectedTarget)?.ip : 'Not selected'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-4 space-y-3">
                        {activeAttack?.status === 'running' ? (
                          <Button
                            variant="destructive"
                            className="w-full"
                            onClick={stopAttack}
                          >
                            <Square className="w-4 h-4 mr-2" />
                            Stop Attack
                          </Button>
                        ) : (
                          <Button
                            className="w-full bg-red-600 hover:bg-red-700"
                            onClick={executeAttack}
                            disabled={!apiConnected || isLoading || selectedSources.length === 0 || !selectedTarget}
                          >
                            {isLoading ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Launching...
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 mr-2" />
                                Launch Attack
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Active Attack Status */}
                  {activeAttack && (
                    <Card className="bg-gray-900/50 border-gray-800">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-yellow-500" />
                          Active Attack
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Status</span>
                          <Badge variant={
                            activeAttack.status === 'running' ? 'default' :
                              activeAttack.status === 'completed' ? 'secondary' :
                                'destructive'
                          }>
                            {activeAttack.status.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Type</span>
                          <span>{ATTACK_TYPES.find(t => t.id === activeAttack.attack_type)?.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Target</span>
                          <span>{activeAttack.target_ip}:{activeAttack.target_port}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Duration</span>
                          <span>{activeAttack.duration}s</span>
                        </div>

                        {activeAttack.status === 'running' && (
                          <div className="pt-2">
                            <Progress
                              value={50}
                              className="h-2"
                            />
                            <p className="text-xs text-gray-500 mt-1 text-center">Attack in progress...</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Quick Tips */}
                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        Quick Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-gray-400 space-y-2">
                      <p>• Select multiple source VMs for distributed attacks</p>
                      <p>• SYN/UDP floods require sudo on VMs</p>
                      <p>• HTTP flood (GoldenEye) is most effective against web apps</p>
                      <p>• Slowloris keeps connections open slowly</p>
                      <p>• Monitor Wazuh/Suricata for detection</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Interactive Network Topology Tab - Editable Cytoscape Map */}
            <TabsContent value="interactive" className="space-y-6">
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="w-5 h-5 text-blue-500" />
                    Interactive Network Topology
                  </CardTitle>
                  <CardDescription>
                    Click nodes to select attackers and targets. Drag to reposition. Zoom and pan to explore.
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            </TabsContent>

            {/* Network Map Tab - NEW Enhanced Visualization */}
            <TabsContent value="network-map" className="space-y-6">
              <NetworkAttackMap
                redTeamVMs={redTeamVMs}
                blueTeamVMs={blueTeamVMs}
                selectedSources={selectedSources}
                selectedTarget={selectedTarget}
                isAttacking={activeAttack?.status === 'running'}
                attackLogs={attackLogs}
              />

              {/* Attack Logs below network map */}
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-green-500" />
                    Real-time Attack Logs
                  </CardTitle>
                  <CardDescription>
                    Live stream of attack execution and packet flow
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LogViewer logs={attackLogs} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Visualization Tab */}
            <TabsContent value="visualization" className="space-y-6">
              <CyberAttackMap
                redTeamVMs={redTeamVMs}
                blueTeamVMs={blueTeamVMs}
                selectedSources={selectedSources}
                selectedTarget={selectedTarget}
                isAttacking={activeAttack?.status === 'running'}
                attackLogs={attackLogs}
              />

              {/* Attack Logs below visualization */}
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-green-500" />
                    Live Attack Logs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <LogViewer logs={attackLogs} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Attack Statistics */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-purple-500" />
                      Attack Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Total Attacks</span>
                      <span className="text-2xl font-bold text-white">
                        {activeAttack ? 1 : 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Active Sources</span>
                      <span className="text-2xl font-bold text-red-400">
                        {selectedSources.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Log Entries</span>
                      <span className="text-2xl font-bold text-green-400">
                        {attackLogs.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Status</span>
                      <Badge variant={activeAttack?.status === 'running' ? 'default' : 'secondary'}>
                        {activeAttack?.status || 'IDLE'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* VM Status Summary */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="w-5 h-5 text-blue-500" />
                      VM Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Red Team VMs</span>
                        <span className="text-sm font-semibold">
                          {redTeamVMs.filter(vm => vm.status === 'online').length}/{redTeamVMs.length} Online
                        </span>
                      </div>
                      <Progress
                        value={(redTeamVMs.filter(vm => vm.status === 'online').length / redTeamVMs.length) * 100}
                        className="h-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Blue Team VMs</span>
                        <span className="text-sm font-semibold">
                          {blueTeamVMs.filter(vm => vm.status === 'online').length}/{blueTeamVMs.length} Online
                        </span>
                      </div>
                      <Progress
                        value={(blueTeamVMs.filter(vm => vm.status === 'online').length / blueTeamVMs.length) * 100}
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Attack Configuration Summary */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-orange-500" />
                      Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Attack Type</span>
                      <span className="font-medium">
                        {ATTACK_TYPES.find(t => t.id === attackConfig.attackType)?.name || 'None'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Target Port</span>
                      <span className="font-medium">{attackConfig.targetPort}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Duration</span>
                      <span className="font-medium">{attackConfig.duration}s</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Workers</span>
                      <span className="font-medium">{attackConfig.workers}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Sockets</span>
                      <span className="font-medium">{attackConfig.sockets}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Logs */}
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-500" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <LogViewer logs={attackLogs.slice(-10)} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-800 bg-gray-900/50 mt-8">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <p>DDoS Visualization Dashboard - Cyber Range Training Environment</p>
              <p>Network: 10.72.200.0/24</p>
            </div>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
