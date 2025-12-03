import asyncio
import websockets

async def test_connection():
    uri = "ws://10.78.48.118:8765"
    print(f"🔌 Testing connection to {uri}")
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected successfully!")
            
            # Wait for a message
            print("⏳ Waiting for message...")
            message = await asyncio.wait_for(websocket.recv(), timeout=10)
            print(f"📩 Received: {message}")
            
    except asyncio.TimeoutError:
        print("⏰ No message received within 10 seconds (but connection OK)")
    except Exception as e:
        print(f"❌ Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
