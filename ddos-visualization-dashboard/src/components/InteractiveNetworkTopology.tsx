"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Network,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  RefreshCw,
  Copy,
  CheckCircle,
  AlertCircle,
  Activity,
  Server,
  Shield,
  Zap,
  Filter,
  Eye,
  EyeOff,
  X,
  Info,
  ExternalLink,
  Wifi,
  WifiOff,
  Menu,
  Target,
} from "lucide-react"

// Cytoscape will be loaded dynamically
let cytoscape: any = null

interface VMNode {
  id: string;
  name: string;
  ip: string;
  role: string;
  status: 'online' | 'offline' | 'attacking' | 'target';
}

interface InteractiveNetworkTopologyProps {
  redTeamVMs: VMNode[];
  blueTeamVMs: VMNode[];
  selectedSources: string[];
  selectedTarget: string;
  onSourceSelect: (vmId: string) => void;
  onTargetSelect: (vmId: string) => void;
  isAttackActive?: boolean;
  attackType?: string;
}

export default function InteractiveNetworkTopology({
  redTeamVMs,
  blueTeamVMs,
  selectedSources,
  selectedTarget,
  onSourceSelect,
  onTargetSelect,
  isAttackActive = false,
  attackType = 'http_flood',
}: InteractiveNetworkTopologyProps) {
  const cyRef = useRef<HTMLDivElement>(null)
  const cyInstance = useRef<any>(null)
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterTeam, setFilterTeam] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [showCredentials, setShowCredentials] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Generate network data from VM props
  const networkData = {
    nodes: [
      // Red Team nodes
      ...redTeamVMs.map((vm, index) => ({
        data: {
          id: vm.id,
          label: vm.name,
          team: "red",
          ip: vm.ip,
          type: "attacker",
          role: vm.role,
          status: vm.status,
          credentials: { username: "mist", password: "Cyber#Range" },
          url: `http://${vm.ip}`,
          position: { x: 150, y: 100 + index * 100 },
        },
      })),
      // Blue Team nodes
      ...blueTeamVMs.map((vm, index) => ({
        data: {
          id: vm.id,
          label: vm.name,
          team: "blue",
          ip: vm.ip,
          type: "target",
          role: vm.role,
          status: vm.status,
          credentials: { username: "mist", password: "Cyber#Range" },
          url: `http://${vm.ip}`,
          position: { x: 650, y: 150 + index * 150 },
        },
      })),
    ],
    edges: [
      // Generate edges from selected sources to target
      ...selectedSources.map((sourceId, index) => ({
        data: {
          id: `attack-${sourceId}-${selectedTarget}`,
          source: sourceId,
          target: selectedTarget || blueTeamVMs[0]?.id,
          type: isAttackActive ? "active-attack" : "potential-attack",
        },
      })),
    ],
  }

  // Load Cytoscape dynamically
  useEffect(() => {
    const loadCytoscape = async () => {
      if (typeof window !== "undefined" && !cytoscape) {
        cytoscape = (await import("cytoscape")).default
      }
      setIsLoading(false)
    }
    loadCytoscape()
  }, [])

  // Initialize Cytoscape with DDoS theme styling
  useEffect(() => {
    if (!cytoscape || !cyRef.current || isLoading) return

    const cy = cytoscape({
      container: cyRef.current,
      elements: networkData,
      style: [
        {
          selector: "node",
          style: {
            "background-color": (ele: any) => {
              const team = ele.data("team")
              const status = ele.data("status")
              const isSelected = selectedSources.includes(ele.data("id")) || selectedTarget === ele.data("id")

              if (team === "red") {
                if (isAttackActive && selectedSources.includes(ele.data("id"))) {
                  return "#dc2626" // Active attack red
                }
                return isSelected ? "#ef4444" : "#991b1b"
              }

              if (team === "blue") {
                if (isAttackActive && selectedTarget === ele.data("id")) {
                  return "#ea580c" // Target orange
                }
                return isSelected ? "#3b82f6" : "#1e40af"
              }

              return "#4b5563"
            },
            label: "data(label)",
            "text-valign": "center",
            "text-halign": "center",
            color: "#ffffff",
            "font-size": "11px",
            "font-weight": "600",
            "font-family": "Inter, sans-serif",
            width: 60,
            height: 60,
            "border-width": 3,
            "border-color": (ele: any) => {
              const team = ele.data("team")
              const isSelected = selectedSources.includes(ele.data("id")) || selectedTarget === ele.data("id")

              if (team === "red") {
                if (isAttackActive && selectedSources.includes(ele.data("id"))) {
                  return "#fee2e2"
                }
                return isSelected ? "#fca5a5" : "#7f1d1d"
              }

              if (team === "blue") {
                if (isAttackActive && selectedTarget === ele.data("id")) {
                  return "#fed7aa"
                }
                return isSelected ? "#93c5fd" : "#1e3a8a"
              }

              return "#374151"
            },
            "border-opacity": 1,
            "background-opacity": 0.95,
            shape: "round-rectangle",
            "transition-property": "background-color, border-color, width, height",
            "transition-duration": "0.3s",
            "transition-timing-function": "ease-out",
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-width": 4,
            "border-color": "#fbbf24",
            width: 70,
            height: 70,
          },
        },
        {
          selector: "node:hover",
          style: {
            "border-width": 4,
            width: 65,
            height: 65,
            "background-opacity": 1,
          },
        },
        {
          selector: "edge",
          style: {
            width: (ele: any) => {
              const type = ele.data("type")
              return type === "active-attack" ? 4 : 2
            },
            "line-color": (ele: any) => {
              const type = ele.data("type")
              return type === "active-attack" ? "#ef4444" : "#6b7280"
            },
            "target-arrow-color": (ele: any) => {
              const type = ele.data("type")
              return type === "active-attack" ? "#ef4444" : "#6b7280"
            },
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            "line-style": (ele: any) => {
              const type = ele.data("type")
              return type === "active-attack" ? "solid" : "dashed"
            },
            opacity: (ele: any) => {
              const type = ele.data("type")
              return type === "active-attack" ? 1 : 0.5
            },
            "transition-property": "line-color, target-arrow-color, width, opacity",
            "transition-duration": "0.3s",
            "transition-timing-function": "ease-out",
          },
        },
        {
          selector: "edge:selected",
          style: {
            "line-color": "#fbbf24",
            "target-arrow-color": "#fbbf24",
            width: 5,
            opacity: 1,
          },
        },
      ],
      layout: {
        name: "preset",
        positions: (node: any) => {
          const pos = node.data("position")
          return pos ? { x: pos.x, y: pos.y } : undefined
        },
        fit: true,
        padding: 50,
      },
      wheelSensitivity: 0.2,
      minZoom: 0.3,
      maxZoom: 3,
    })

    // Event handlers
    cy.on("tap", "node", (evt: any) => {
      const node = evt.target
      const nodeData = node.data()
      setSelectedNode(nodeData)

      // Trigger selection callbacks
      if (nodeData.team === "red") {
        onSourceSelect(nodeData.id)
      } else if (nodeData.team === "blue") {
        onTargetSelect(nodeData.id)
      }
    })

    cy.on("cxttap", "node", (evt: any) => {
      const node = evt.target
      const nodeData = node.data()
      if (nodeData.url) {
        window.open(nodeData.url, "_blank")
      }
    })

    cy.on("mouseover", "node", (evt: any) => {
      const node = evt.target
      node.style("cursor", "pointer")
    })

    cyInstance.current = cy

    return () => {
      if (cyInstance.current) {
        cyInstance.current.destroy()
      }
    }
  }, [isLoading, networkData, selectedSources, selectedTarget, isAttackActive])

  // Update graph when selections change
  useEffect(() => {
    if (!cyInstance.current) return

    cyInstance.current.elements().remove()
    cyInstance.current.add(networkData)
    cyInstance.current.layout({ name: 'preset' }).run()
  }, [selectedSources, selectedTarget, isAttackActive])

  const handleZoomIn = () => {
    if (cyInstance.current) {
      cyInstance.current.zoom(cyInstance.current.zoom() * 1.2)
    }
  }

  const handleZoomOut = () => {
    if (cyInstance.current) {
      cyInstance.current.zoom(cyInstance.current.zoom() * 0.8)
    }
  }

  const handleReset = () => {
    if (cyInstance.current) {
      cyInstance.current.fit()
      cyInstance.current.center()
    }
  }

  const handleExport = () => {
    if (cyInstance.current) {
      const png64 = cyInstance.current.png({ scale: 2 })
      const link = document.createElement("a")
      link.href = png64
      link.download = "ddos-network-topology.png"
      link.click()
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const filteredNodes = [...redTeamVMs, ...blueTeamVMs].filter((vm) => {
    const term = searchTerm.trim().toLowerCase()
    if (filterTeam === "red" && !redTeamVMs.find(v => v.id === vm.id)) return false
    if (filterTeam === "blue" && !blueTeamVMs.find(v => v.id === vm.id)) return false
    if (!term) return true
    return (
      vm.name.toLowerCase().includes(term) ||
      vm.ip.includes(term) ||
      vm.role.toLowerCase().includes(term)
    )
  })

  const handleSidebarNodeClick = (vm: VMNode) => {
    setSelectedNode({
      id: vm.id,
      label: vm.name,
      team: redTeamVMs.find(v => v.id === vm.id) ? "red" : "blue",
      ip: vm.ip,
      role: vm.role,
      status: vm.status,
      credentials: { username: "mist", password: "Cyber#Range" },
      url: `http://${vm.ip}`,
    })

    try {
      if (cyInstance.current) {
        const el = cyInstance.current.$(`#${vm.id}`)
        if (el && el.length > 0) {
          cyInstance.current.center(el)
          cyInstance.current.$(`#${vm.id}`).select()
        }
      }
    } catch (e) {
      console.warn("Cy focus error", e)
    }
  }

  const getTeamColor = (team: string) => {
    return team === "red" ? "bg-red-600 text-white" : "bg-blue-600 text-white"
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "attacking":
        return <Zap className="w-4 h-4 text-red-500 animate-pulse" />
      case "target":
        return <Target className="w-4 h-4 text-orange-500" />
      case "offline":
        return <WifiOff className="w-4 h-4 text-gray-500" />
      default:
        return <Activity className="w-4 h-4 text-primary" />
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-primary">Loading interactive network topology...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[700px] bg-gray-900/50 rounded-2xl border border-gray-800 overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-gray-800 p-3 flex justify-between items-center bg-gray-900/80">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Menu className="w-4 h-4" />
          </Button>
          <div className="text-sm text-gray-400">
            {filteredNodes.length} nodes • {selectedSources.length} attackers • {selectedTarget ? '1' : '0'} target
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-gray-800 bg-gray-900/50`}>
          <div className="p-4 space-y-4 h-full overflow-auto">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search nodes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800/50 border-gray-700"
              />
            </div>

            {/* Team Filters */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-300">Filter by Team</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["all", "red", "blue"].map((team) => (
                  <Button
                    key={team}
                    size="sm"
                    variant={filterTeam === team ? "default" : "outline"}
                    onClick={() => setFilterTeam(team)}
                    className={
                      filterTeam === team
                        ? team === "red"
                          ? "bg-red-600 hover:bg-red-700"
                          : team === "blue"
                            ? "bg-blue-600 hover:bg-blue-700"
                            : ""
                        : ""
                    }
                  >
                    {team.charAt(0).toUpperCase() + team.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Nodes List */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Server className="w-4 h-4" />
                Virtual Machines ({filteredNodes.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-auto">
                {filteredNodes.map((vm) => {
                  const isRedTeam = redTeamVMs.find(v => v.id === vm.id)
                  return (
                    <Card
                      key={vm.id}
                      className="p-3 cursor-pointer hover:shadow-md transition-shadow border-l-4 bg-gray-800/50"
                      style={{ borderLeftColor: isRedTeam ? "#ef4444" : "#3b82f6" }}
                      onClick={() => handleSidebarNodeClick(vm)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {isRedTeam ? <Zap className="w-4 h-4 text-red-500" /> : <Shield className="w-4 h-4 text-blue-500" />}
                            <span className="font-semibold text-sm text-white">{vm.name}</span>
                            {getStatusIcon(vm.status)}
                          </div>
                          <p className="text-xs text-gray-400 font-mono">{vm.ip}</p>
                        </div>
                        <Badge className={`text-xs ${getTeamColor(isRedTeam ? "red" : "blue")}`}>
                          {isRedTeam ? "RED" : "BLUE"}
                        </Badge>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-3 pt-4 border-t border-gray-800">
              <h3 className="text-sm font-semibold text-gray-300">Connection Types</h3>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-red-600"></div>
                  <span>Active Attack</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-gray-600 border-dashed border-t"></div>
                  <span>Potential Attack</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Network Canvas */}
        <div className="flex-1 relative">
          <div
            ref={cyRef}
            className="w-full h-full"
            style={{ cursor: "grab" }}
          />
        </div>
      </div>

      {/* Node Details Modal */}
      {selectedNode && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto shadow-2xl bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                {selectedNode.team === "red" ? <Zap className="w-5 h-5 text-red-500" /> : <Shield className="w-5 h-5 text-blue-500" />}
                <div>
                  <CardTitle className="text-xl text-white">{selectedNode.label}</CardTitle>
                  <p className="text-sm text-gray-400">{selectedNode.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getTeamColor(selectedNode.team)}>
                  {selectedNode.team?.toUpperCase()}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedNode(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* System Information */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-300 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    System Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 border border-gray-700 rounded-xl bg-gray-800/50">
                      <span className="text-sm text-gray-400">IP Address</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-white">{selectedNode.ip}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(selectedNode.ip, "ip")}
                        >
                          {copiedField === "ip" ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 border border-gray-700 rounded-xl bg-gray-800/50">
                      <span className="text-sm text-gray-400">Status</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(selectedNode.status)}
                        <span className="text-sm capitalize text-white">{selectedNode.status}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Access Credentials */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-300 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Access Credentials
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCredentials(!showCredentials)}
                    >
                      {showCredentials ? (
                        <>
                          <EyeOff className="w-4 h-4 mr-2" />
                          Hide
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          Show
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 border border-gray-700 rounded-xl bg-gray-800/50">
                      <span className="text-sm text-gray-400">Username</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-white">
                          {showCredentials ? selectedNode.credentials?.username : "••••••"}
                        </span>
                        {showCredentials && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(selectedNode.credentials?.username, "username")}
                          >
                            {copiedField === "username" ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 border border-gray-700 rounded-xl bg-gray-800/50">
                      <span className="text-sm text-gray-400">Password</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-white">
                          {showCredentials ? selectedNode.credentials?.password : "••••••••••"}
                        </span>
                        {showCredentials && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(selectedNode.credentials?.password, "password")}
                          >
                            {copiedField === "password" ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <Button
                  onClick={() => selectedNode.url && window.open(selectedNode.url, "_blank")}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open URL
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    if (selectedNode.team === "red") {
                      onSourceSelect(selectedNode.id)
                    } else {
                      onTargetSelect(selectedNode.id)
                    }
                    setSelectedNode(null)
                  }}
                >
                  <Target className="w-4 h-4 mr-2" />
                  Select Node
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
