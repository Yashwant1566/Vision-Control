import cv2
import numpy as np
import tensorflow as tf
import asyncio
import threading
import websockets
import queue
import time

# === CONFIGURATION ===
ESP32_CAM_URL = "http://10.166.128.220:81/stream"
MODEL_PATH = r"C:\Users\ASUS\Yash\Vision-Control\ML\Yolo11n (Detect) (1).tflite"

# Class names for LEFT and RIGHT arrows
# UPDATE THESE based on your model training
CLASS_NAMES = {
    0: 'left',
    1: 'right'
}

print("🔹 Loading TensorFlow Lite model (bypassing YOLO metadata)...")

try:
    # Use native TFLite interpreter to avoid YOLO metadata corruption
    interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    
    print(f"✅ Model loaded successfully!")
    print(f"   Input shape: {input_details[0]['shape']}")
    print(f"   Output shape: {output_details[0]['shape']}")
    print(f"📋 Detection classes: {CLASS_NAMES}")
    
except Exception as e:
    print(f"❌ Failed to load model: {e}")
    print("\n🔧 Make sure:")
    print(f"   1. Model file exists: {MODEL_PATH}")
    print("   2. TensorFlow is installed: pip install tensorflow")
    exit(1)

# --- WebSocket Server ---
WS_HOST = '0.0.0.0'
WS_PORT = 8765
connected_clients = set()
message_queue = queue.Queue()

async def ws_handler(websocket):
    connected_clients.add(websocket)
    print(f"✅ Client connected ({len(connected_clients)} total)")
    try:
        await websocket.wait_closed()
    finally:
        connected_clients.remove(websocket)
        print(f"❌ Client disconnected ({len(connected_clients)} remaining)")

async def broadcast_loop():
    while True:
        await asyncio.sleep(0.1)
        while not message_queue.empty():
            msg = message_queue.get_nowait()
            if connected_clients:
                await asyncio.gather(
                    *[c.send(msg) for c in list(connected_clients)],
                    return_exceptions=True
                )

async def run_server():
    async with websockets.serve(ws_handler, WS_HOST, WS_PORT):
        print(f"🌐 WebSocket server: ws://{WS_HOST}:{WS_PORT}")
        await broadcast_loop()

def ws_thread_func():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(run_server())

threading.Thread(target=ws_thread_func, daemon=True).start()
time.sleep(1)

def broadcast_direction(direction):
    message_queue.put(direction)
    print(f"📤 Broadcasting: {direction}")

# --- Direction Tracking ---
last_direction = None
direction_count = 0
CONFIRMATION_THRESHOLD = 10

def confirm_direction(detected_class):
    global last_direction, direction_count
    if detected_class != last_direction:
        last_direction = detected_class
        direction_count = 0
    direction_count += 1
    if direction_count >= CONFIRMATION_THRESHOLD:
        direction_count = 0
        return detected_class
    return None

# --- Connect to ESP32 Stream ---
print(f"🔹 Connecting to ESP32-CAM at {ESP32_CAM_URL}...")

try:
    cap = cv2.VideoCapture(ESP32_CAM_URL)
    if not cap.isOpened():
        raise Exception("Failed to open stream")
    print("✅ Stream connected!")
except Exception as e:
    print(f"❌ Connection failed: {e}")
    print("\n🔧 TROUBLESHOOTING:")
    print("   1. Check ESP32 is powered on")
    print("   2. Verify IP address is correct")
    print("   3. Ensure both devices on same network")
    print(f"   4. Try opening {ESP32_CAM_URL} in browser")
    exit(1)

print("\n🎥 Starting detection... Press 'q' to quit\n")

# Direction mapping
direction_map = {
    'left': 'left',
    'right': 'right',
    'up': 'forward',
    'down': 'backward',
    'forward': 'forward',
    'backward': 'backward'
}

frame_count = 0

while True:
    ret, frame = cap.read()
    if not ret:
        print("⚠️  Frame not received. Retrying...")
        time.sleep(0.1)
        continue

    frame_count += 1

    try:
        detected_direction = None
        
        # --- YOLO Path (if model loaded successfully) ---
        if model is not None:
            results = model.predict(frame, verbose=False, conf=0.6)
            
            if len(results) > 0 and len(results[0].boxes) > 0:
                boxes = results[0].boxes
                best_idx = np.argmax(boxes.conf.cpu().numpy())
                best_conf = boxes.conf[best_idx].item()
                best_class = int(boxes.cls[best_idx].item())
                
                class_name = results[0].names[best_class]
                box = boxes.xyxy[best_idx].cpu().numpy()
                x1, y1, x2, y2 = map(int, box)
                
                # Draw detection
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(frame, f"{class_name} {best_conf:.2f}", 
                           (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 
                           0.6, (0, 255, 0), 2)
                
                detected_direction = class_name.lower()
        
        # --- TFLite Path (fallback) ---
        else:
            h, w = input_details[0]['shape'][1:3]
            img = cv2.resize(frame, (w, h))
            img = img.astype(np.float32) / 255.0
            img = np.expand_dims(img, 0)
            
            interpreter.set_tensor(input_details[0]['index'], img)
            interpreter.invoke()
            output = interpreter.get_tensor(output_details[0]['index'])[0]
            
            class_id = np.argmax(output)
            conf = output[class_id]
            
            if conf > 0.6 and class_id in CLASS_NAMES:
                class_name = CLASS_NAMES[class_id]
                detected_direction = class_name.lower()
                
                cv2.putText(frame, f"{class_name.upper()} {conf:.2f}", 
                           (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 
                           1, (0, 255, 0), 2)
        
        # --- Confirmation & Broadcasting ---
        if detected_direction and detected_direction in direction_map:
            confirmed = confirm_direction(detected_direction)
            if confirmed:
                direction_cmd = direction_map[confirmed]
                print(f"➡️  Confirmed: {detected_direction} → {direction_cmd}")
                broadcast_direction(direction_cmd)
                
                # Visual feedback
                cv2.putText(frame, f"✓ SENT: {direction_cmd.upper()}", 
                           (20, frame.shape[0] - 20), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        else:
            cv2.putText(frame, "No arrow detected", (20, 50), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        
        # Show client count
        cv2.putText(frame, f"Clients: {len(connected_clients)}", 
                   (frame.shape[1] - 120, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
    except Exception as e:
        print(f"⚠️  Processing error: {e}")
        cv2.putText(frame, f"Error: {str(e)[:30]}", (20, 50), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)

    # Display frame
    cv2.imshow("ESP32-CAM Detection", frame)
    
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
print("\n🔹 Detection stopped.")