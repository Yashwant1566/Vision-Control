"""
Quick Start Script for Arrow Detection System
==============================================
This script automatically handles ESP32 initialization and starts detection.
"""

import requests
import time
import subprocess
import sys

ESP32_IP = "http://10.166.128.220"

def check_esp32_connection():
    """Check if ESP32 is reachable"""
    print("🔍 Checking ESP32 connection...")
    try:
        response = requests.get(f"{ESP32_IP}/", timeout=3)
        print("✅ ESP32 is online!")
        return True
    except:
        print("❌ Cannot reach ESP32")
        return False

def check_camera_health():
    """Check if camera is ready"""
    print("📹 Checking camera health...")
    try:
        response = requests.get(f"{ESP32_IP}/health", timeout=3)
        if response.status_code == 200:
            print("✅ Camera is ready!")
            return True
        else:
            print("⚠️ Camera is initializing...")
            return False
    except:
        return False

def trigger_soft_reset():
    """Trigger software reset on ESP32"""
    print("\n🔄 Triggering ESP32 software reset...")
    print("⚠️  This will restart the ESP32-CAM")
    
    try:
        response = requests.get(f"{ESP32_IP}/reset", timeout=3)
        print("✅ Reset signal sent!")
        print("⏳ Waiting 10 seconds for ESP32 to restart...")
        time.sleep(10)
        return True
    except:
        print("❌ Failed to send reset signal")
        return False

def wait_for_esp32_ready(max_wait=30):
    """Wait for ESP32 to be fully ready"""
    print(f"\n⏳ Waiting for ESP32 to be ready (max {max_wait}s)...")
    
    start_time = time.time()
    while time.time() - start_time < max_wait:
        if check_esp32_connection() and check_camera_health():
            print("✅ ESP32 is fully ready!\n")
            return True
        time.sleep(2)
    
    return False

def start_detection():
    """Start the arrow detection script"""
    print("🚀 Starting arrow detection...")
    print("=" * 50)
    
    try:
        # Run arrow_det_fixed.py in same directory
        subprocess.run([sys.executable, "arrow_det_fixed.py"], check=True)
    except KeyboardInterrupt:
        print("\n✋ Detection stopped by user")
    except Exception as e:
        print(f"\n❌ Error running detection: {e}")

def main():
    print("=" * 60)
    print("🎯 ARROW DETECTION SYSTEM - QUICK START")
    print("=" * 60)
    print()
    
    # Step 1: Check ESP32 connection
    if not check_esp32_connection():
        print("\n⚠️  Cannot connect to ESP32!")
        print("\n📋 MANUAL STEPS:")
        print("1. Ensure ESP32 is powered on")
        print("2. Check WiFi connection (both devices on same network)")
        print("3. Verify IP address is correct: " + ESP32_IP)
        print("4. Try accessing stream in browser: " + ESP32_IP + ":81/stream")
        
        choice = input("\n🔄 Do you want to continue anyway? (y/n): ").lower()
        if choice != 'y':
            sys.exit(1)
    
    # Step 2: Check camera health
    camera_ready = check_camera_health()
    
    if not camera_ready:
        print("\n🔧 Camera needs initialization...")
        choice = input("🔄 Trigger software reset? (y/n): ").lower()
        
        if choice == 'y':
            trigger_soft_reset()
            if not wait_for_esp32_ready():
                print("\n⚠️  ESP32 not responding after reset")
                print("🔌 Try manually pressing RESET button on ESP32-CAM")
                input("\nPress Enter after pressing RESET button...")
                
                if not wait_for_esp32_ready(15):
                    print("\n❌ Cannot initialize camera")
                    sys.exit(1)
    
    # Step 3: Start detection
    print("\n" + "=" * 60)
    print("✨ ALL SYSTEMS READY!")
    print("=" * 60)
    print("\n📊 System Status:")
    print(f"   • ESP32 IP: {ESP32_IP}")
    print(f"   • Camera Stream: {ESP32_IP}:81/stream")
    print(f"   • WebSocket Server: ws://0.0.0.0:8765")
    print(f"   • Detection: ACTIVE")
    print("\n💡 Press 'Q' in the detection window to stop")
    print("💡 Press Ctrl+C to force stop\n")
    
    input("Press Enter to start detection...")
    start_detection()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n✋ Startup cancelled by user")
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
