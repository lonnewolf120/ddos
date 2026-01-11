#!/usr/bin/env python3
"""
Unit tests for DDoS Orchestrator with mocked SSH connections
Tests attack orchestration logic without requiring actual VMs
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
import json
import tempfile
import os
from datetime import datetime

# Mock paramiko before importing our module
with patch.dict('sys.modules', {'paramiko': Mock()}):
    from distributed_ddos_executor import DDoSOrchestrator, SSHExecutor, AttackResult

class TestSSHExecutor(unittest.TestCase):
    """Test SSH execution with mocked connections"""

    @patch('distributed_ddos_executor.paramiko')
    def test_execute_command_success(self, mock_paramiko):
        """Test successful SSH command execution"""
        # Mock SSH client
        mock_ssh = Mock()
        mock_paramiko.SSHClient.return_value = mock_ssh

        # Mock command execution
        mock_stdout = Mock()
        mock_stdout.read.return_value = b"command output"
        mock_stdout.channel.recv_exit_status.return_value = 0

        mock_stderr = Mock()
        mock_stderr.read.return_value = b""

        mock_ssh.exec_command.return_value = (None, mock_stdout, mock_stderr)

        # Execute test
        result = SSHExecutor.execute_command("10.1.1.1", "echo test")

        # Verify results
        self.assertTrue(result["success"])
        self.assertEqual(result["exit_code"], 0)
        self.assertEqual(result["stdout"], "command output")
        self.assertEqual(result["hostname"], "10.1.1.1")

        # Verify SSH connection was made
        mock_ssh.connect.assert_called_once()
        mock_ssh.exec_command.assert_called_once_with("echo test", timeout=300)

    @patch('distributed_ddos_executor.paramiko')
    def test_execute_command_failure(self, mock_paramiko):
        """Test SSH command execution with failure"""
        # Mock SSH client to raise exception
        mock_ssh = Mock()
        mock_paramiko.SSHClient.return_value = mock_ssh
        mock_ssh.connect.side_effect = Exception("Connection failed")

        # Execute test
        result = SSHExecutor.execute_command("10.1.1.1", "echo test")

        # Verify failure handling
        self.assertFalse(result["success"])
        self.assertEqual(result["exit_code"], -1)
        self.assertIn("Connection failed", result["stderr"])

    @patch('distributed_ddos_executor.paramiko')
    def test_check_connectivity_success(self, mock_paramiko):
        """Test connectivity check success"""
        mock_ssh = Mock()
        mock_paramiko.SSHClient.return_value = mock_ssh

        mock_stdout = Mock()
        mock_stdout.read.return_value = b"ok"

        mock_ssh.exec_command.return_value = (None, mock_stdout, None)

        result = SSHExecutor.check_connectivity("10.1.1.1")

        self.assertTrue(result["success"])
        self.assertEqual(result["stdout"], "ok")


class TestDDoSOrchestrator(unittest.TestCase):
    """Test DDoS Orchestrator functionality"""

    def setUp(self):
        """Set up test fixtures"""
        self.orchestrator = DDoSOrchestrator()

    @patch('distributed_ddos_executor.SSHExecutor.execute_command')
    def test_install_ddos_tools(self, mock_execute):
        """Test DDoS tools installation"""
        # Mock successful installation
        mock_execute.return_value = {
            "success": True,
            "exit_code": 0,
            "stdout": "Installation complete",
            "stderr": ""
        }

        result = self.orchestrator.install_ddos_tools("10.1.1.1")

        self.assertTrue(result["success"])
        mock_execute.assert_called_once()

        # Verify installation command contains expected tools
        install_cmd = mock_execute.call_args[0][1]
        self.assertIn("hping3", install_cmd)
        self.assertIn("stress-ng", install_cmd)
        self.assertIn("target_stress.sh", install_cmd)

    @patch('distributed_ddos_executor.SSHExecutor.execute_command')
    def test_execute_http_flood_background(self, mock_execute):
        """Test HTTP flood execution in background"""
        mock_execute.return_value = {
            "success": True,
            "exit_code": 0,
            "stdout": "",
            "stderr": ""
        }

        attack_id = self.orchestrator.execute_http_flood(
            "10.1.1.1", "10.1.1.2", background=True
        )

        self.assertIsNotNone(attack_id)
        self.assertIn(attack_id, self.orchestrator.active_attacks)

        attack = self.orchestrator.active_attacks[attack_id]
        self.assertEqual(attack.tool, "goldeneye")
        self.assertEqual(attack.status, "running")
        self.assertEqual(attack.process_name, "python3.*goldeneye")

    @patch('distributed_ddos_executor.SSHExecutor.execute_command')
    def test_execute_hping_heavy(self, mock_execute):
        """Test HPING heavy flood execution"""
        mock_execute.return_value = {
            "success": True,
            "exit_code": 0,
            "stdout": "hping output",
            "stderr": ""
        }

        attack_id = self.orchestrator.execute_hping_heavy(
            "10.1.1.1", "10.1.1.2", payload_size=1400, duration=60
        )

        self.assertIsNotNone(attack_id)
        attack = self.orchestrator.active_attacks[attack_id]
        self.assertEqual(attack.tool, "hping3_heavy")
        self.assertEqual(attack.status, "completed")

        # Verify command contains payload size
        cmd_args = mock_execute.call_args[0][1]
        self.assertIn("-d 1400", cmd_args)

    @patch('distributed_ddos_executor.SSHExecutor.execute_command')
    def test_execute_target_cpu_stress(self, mock_execute):
        """Test target CPU stress execution"""
        mock_execute.return_value = {
            "success": True,
            "exit_code": 0,
            "stdout": "stress-ng output",
            "stderr": ""
        }

        attack_id = self.orchestrator.execute_target_cpu_stress(
            "10.1.1.2", workers=4, duration=60
        )

        self.assertIsNotNone(attack_id)
        attack = self.orchestrator.active_attacks[attack_id]
        self.assertEqual(attack.tool, "target_cpu_stress")
        self.assertEqual(attack.attacker_vm, "10.1.1.2")  # runs on target
        self.assertEqual(attack.target_ip, "10.1.1.2")

    @patch('distributed_ddos_executor.SSHExecutor.execute_command')
    def test_execute_target_mem_stress(self, mock_execute):
        """Test target memory stress execution"""
        mock_execute.return_value = {
            "success": True,
            "exit_code": 0,
            "stdout": "memory stress output",
            "stderr": ""
        }

        attack_id = self.orchestrator.execute_target_mem_stress(
            "10.1.1.2", mem_mb=512, duration=60
        )

        self.assertIsNotNone(attack_id)
        attack = self.orchestrator.active_attacks[attack_id]
        self.assertEqual(attack.tool, "target_mem_stress")

        # Verify command contains memory amount
        cmd_args = mock_execute.call_args[0][1]
        self.assertIn("mem 512", cmd_args)

    @patch('distributed_ddos_executor.SSHExecutor.check_connectivity')
    @patch('distributed_ddos_executor.SSHExecutor.execute_command')
    def test_execute_distributed_attack_target_stress(self, mock_execute, mock_connectivity):
        """Test distributed attack with target stress"""
        # Mock connectivity checks
        mock_connectivity.return_value = {"success": True}

        # Mock attack execution
        mock_execute.return_value = {
            "success": True,
            "exit_code": 0,
            "stdout": "stress output",
            "stderr": ""
        }

        attack_ids = self.orchestrator.execute_distributed_attack(
            attack_type="target_stress_cpu",
            target_team="team1",
            num_attackers=4,
            duration=60,
            capture_on_target=False
        )

        self.assertEqual(len(attack_ids), 1)  # Target stress returns single attack
        attack = self.orchestrator.active_attacks[attack_ids[0]]
        self.assertEqual(attack.tool, "target_cpu_stress")

    @patch('distributed_ddos_executor.SSHExecutor.execute_command')
    def test_stop_attack(self, mock_execute):
        """Test stopping an attack"""
        # Create a running attack
        attack_result = AttackResult(
            attack_id="test-123",
            attacker_vm="10.1.1.1",
            target_ip="10.1.1.2",
            target_port=80,
            tool="hping3",
            start_time=datetime.now().isoformat(),
            end_time=None,
            status="running",
            packets_sent=0,
            bytes_sent=0,
            stdout="",
            stderr="",
            exit_code=None,
            process_name="hping3"
        )
        self.orchestrator.active_attacks["test-123"] = attack_result

        # Mock successful kill command
        mock_execute.return_value = {
            "success": True,
            "exit_code": 0,
            "stdout": "",
            "stderr": ""
        }

        success = self.orchestrator.stop_attack("test-123")

        self.assertTrue(success)
        self.assertEqual(attack_result.status, "stopped")
        self.assertIsNotNone(attack_result.end_time)

        # Verify kill command was executed
        mock_execute.assert_called_once()
        kill_cmd = mock_execute.call_args[0][1]
        self.assertIn("pkill -9 -f 'hping3'", kill_cmd)

    def test_export_results(self):
        """Test exporting attack results to JSON"""
        # Create test attack
        attack_result = AttackResult(
            attack_id="test-123",
            attacker_vm="10.1.1.1",
            target_ip="10.1.1.2",
            target_port=80,
            tool="test_tool",
            start_time="2026-01-11T10:00:00",
            end_time="2026-01-11T10:05:00",
            status="completed",
            packets_sent=1000,
            bytes_sent=50000,
            stdout="test output",
            stderr="",
            exit_code=0
        )
        self.orchestrator.active_attacks["test-123"] = attack_result

        # Export to temporary file
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
            temp_path = f.name

        try:
            self.orchestrator.export_results(temp_path)

            # Verify file was created and contains expected data
            with open(temp_path, 'r') as f:
                data = json.load(f)

            self.assertEqual(len(data), 1)
            self.assertEqual(data[0]["attack_id"], "test-123")
            self.assertEqual(data[0]["tool"], "test_tool")
            self.assertEqual(data[0]["status"], "completed")

        finally:
            os.unlink(temp_path)


class TestAttackIntegration(unittest.TestCase):
    """Integration tests for attack flows"""

    @patch('distributed_ddos_executor.SSHExecutor.check_connectivity')
    @patch('distributed_ddos_executor.SSHExecutor.execute_command')
    def test_full_distributed_attack_flow(self, mock_execute, mock_connectivity):
        """Test complete distributed attack workflow"""
        orchestrator = DDoSOrchestrator()

        # Mock connectivity checks
        mock_connectivity.return_value = {"success": True}

        # Mock attack execution
        mock_execute.return_value = {
            "success": True,
            "exit_code": 0,
            "stdout": "attack output",
            "stderr": ""
        }

        # Execute distributed HTTP flood
        attack_ids = orchestrator.execute_distributed_attack(
            attack_type="http_flood",
            target_team="team1",
            target_port=9080,
            duration=60,
            num_attackers=2,
            background=True,
            capture_on_target=False  # Disable to avoid extra SSH calls
        )

        # Verify attacks were launched
        self.assertEqual(len(attack_ids), 2)  # 2 attackers

        for attack_id in attack_ids:
            attack = orchestrator.get_attack_status(attack_id)
            self.assertIsNotNone(attack)
            self.assertEqual(attack["tool"], "goldeneye")
            self.assertEqual(attack["status"], "running")

        # Test stopping all attacks
        mock_execute.reset_mock()
        stop_results = orchestrator.stop_all_attacks()

        self.assertEqual(len(stop_results), 2)
        self.assertTrue(all(stop_results.values()))


if __name__ == '__main__':
    # Run tests with verbose output
    unittest.main(verbosity=2)
