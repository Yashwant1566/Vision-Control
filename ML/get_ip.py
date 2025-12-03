import socket

def get_local_ip():
    """Get the local IP address of this machine"""
    try:
        # Create a socket connection to determine local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Connect to Google DNS (doesn't actually send data)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        return "Unable to determine IP"

if __name__ == "__main__":
    ip = get_local_ip()
    print("=" * 60)
    print("🌐 YOUR PC'S LOCAL IP ADDRESS:")
    print(f"   {ip}")
    print("=" * 60)
    print("\n📝 UPDATE THESE FILES:")
    print(f"\n1. screens/GameScreen.js (line ~140):")
    print(f"   const ML_HOST_IP = '{ip}';")
    print("\n2. Your React Native app can now connect to:")
    print(f"   ws://{ip}:8765")
    print("\n" + "=" * 60)
