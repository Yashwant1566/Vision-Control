import cv2
import numpy as np
import tensorflow as tf
import asyncio
import threading
import websockets
from collections import deque
import time
import sys
import json

# ========== UPDATE THESE IPs ==========
ESP32_CAM_URL = "http://10.78.48.220:81/stream"
ML_HOST_IP = '0.0.0.0'
WS_PORT = 8765
# ======================================

MODEL_PATH = r"best_float32 (Detect).tflite"
CLASS_NAMES = {0: 'left', 1: 'right', 2: 'up', 3: 'down'}

print("🔹 Loading TensorFlow Lite model...")
try:
    interpreter = tf.lite.Interpreter(model_path=MODEL_PATH, num_threads=4)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    print(f"✅ Model loaded! Classes: {CLASS_NAMES}")
except Exception as e:
    print(f"❌ Failed to load model: {e}")
    sys.exit(1)

# ========== WEBSOCKET SERVER ==========
connected_clients = set()
broadcast_queue = asyncio.Queue()

async def ws_handler(websocket):
    connected_clients.add(websocket)
    print(f"✅ WS Client connected (Total: {len(connected_clients)})")
    try:
        await websocket.wait_closed()
    finally:
        connected_clients.remove(websocket)
        print(f"❌ WS Client disconnected (Total: {len(connected_clients)})")

async def broadcast_worker():
    while True:
        msg = await broadcast_queue.get()
        if connected_clients:
            websockets.broadcast(connected_clients, msg)
        broadcast_queue.task_done()

async def run_websocket_server():
    try:
        async with websockets.serve(ws_handler, ML_HOST_IP, WS_PORT):
            print(f"🌐 WebSocket: ws://{ML_HOST_IP}:{WS_PORT}")
            await broadcast_worker()
    except OSError as e:
        if e.errno == 10048:
            print(f"\n❌ Port {WS_PORT} in use!")
            sys.exit(1)
        raise

def ws_thread_func():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(run_websocket_server())

ws_thread = threading.Thread(target=ws_thread_func, daemon=True)
ws_thread.start()
time.sleep(0.5)

def broadcast_detection(data):
    """Send detection data as JSON via WebSocket"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(broadcast_queue.put(json.dumps(data)))
    except Exception as e:
        print(f"⚠️ Broadcast error: {e}")

# ========== DIRECTION TRACKER ==========
class DirectionTracker:
    def __init__(self, confirmation_frames=2, cooldown_frames=3):
        self.history = deque(maxlen=confirmation_frames)
        self.last_sent = None
        self.cooldown_counter = 0
        self.confirmation_frames = confirmation_frames
        self.cooldown_frames = cooldown_frames
    
    def update(self, direction):
        if self.cooldown_counter > 0:
            self.cooldown_counter -= 1
            return None
        
        self.history.append(direction)
        
        if len(self.history) == self.confirmation_frames:
            if len(set(self.history)) == 1:
                confirmed = self.history[0]
                if confirmed != self.last_sent:
                    self.last_sent = confirmed
                    self.cooldown_counter = self.cooldown_frames
                    self.history.clear()
                    return confirmed
        return None

tracker = DirectionTracker(confirmation_frames=2, cooldown_frames=3)

# ========== MAIN DETECTION LOOP ==========
print(f"🔹 Connecting to {ESP32_CAM_URL}...")
cap = cv2.VideoCapture(ESP32_CAM_URL, cv2.CAP_FFMPEG)
cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

if not cap.isOpened():
    print("❌ Failed to connect!")
    sys.exit(1)

print("✅ Stream connected!\n")

input_shape = input_details[0]['shape']
input_height, input_width = input_shape[1], input_shape[2]

direction_map = {
    'left': 'left',
    'right': 'right',
    'up': 'forward',
    'down': 'backward'
}

frame_count = 0
fps_time = time.time()
fps = 0

print("🚀 LIGHTWEIGHT DETECTION ACTIVE!")
print("=" * 60)
print(f"📹 ESP32: {ESP32_CAM_URL}")
print(f"🌐 WebSocket: ws://{ML_HOST_IP}:{WS_PORT}")
print(f"📡 Sending: Direction commands + Box coordinates (JSON)")
print("=" * 60)
print("\n⌨️ Press 'q' to quit\n")

try:
    while True:
        ret, frame = cap.read()
        if not ret:
            time.sleep(0.01)
            continue

        frame_count += 1
        
        # Get original dimensions
        orig_height, orig_width = frame.shape[:2]
        
        # FPS calculation
        if frame_count % 60 == 0:
            current_time = time.time()
            fps = 60 / (current_time - fps_time)
            fps_time = current_time
            print(f"📊 FPS: {fps:.1f} | Clients: {len(connected_clients)}")

        # Inference
        img_resized = cv2.resize(frame, (input_width, input_height))
        img_rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)
        img_input = (img_rgb.astype(np.float32) / 255.0)[np.newaxis, ...]

        start_time = time.time()
        interpreter.set_tensor(input_details[0]['index'], img_input)
        interpreter.invoke()
        output = interpreter.get_tensor(output_details[0]['index'])
        inference_ms = (time.time() - start_time) * 1000

        # Parse YOLO output
        output = output[0].T
        boxes = output[:, :4]
        class_scores = output[:, 4:]
        
        best_conf = 0
        best_class = -1
        best_box = None
        
        for i in range(output.shape[0]):
            class_id = np.argmax(class_scores[i])
            conf = class_scores[i, class_id]
            
            if conf > best_conf and conf > 0.45 and class_id < len(CLASS_NAMES):
                best_conf = conf
                best_class = class_id
                best_box = boxes[i].copy()
        
        # Send detection data
        if best_class >= 0 and best_class in CLASS_NAMES and best_box is not None:
            class_name = CLASS_NAMES[best_class]
            detected_direction = class_name.lower()
            
            # Calculate bounding box (normalized coordinates for app)
            x_center_norm, y_center_norm, w_norm, h_norm = best_box
            
            # Convert to pixel coordinates (for 640x480 frame - app will scale)
            x_center_px = x_center_norm * 640
            y_center_px = y_center_norm * 480
            w_px = w_norm * 640
            h_px = h_norm * 480
            
            x1 = int(x_center_px - w_px / 2)
            y1 = int(y_center_px - h_px / 2)
            x2 = int(x_center_px + w_px / 2)
            y2 = int(y_center_px + h_px / 2)
            
            # Send detection data as JSON
            detection_data = {
                "type": "detection",
                "direction": class_name.lower(),
                "confidence": float(best_conf),
                "box": {
                    "x": x1,
                    "y": y1,
                    "width": x2 - x1,
                    "height": y2 - y1
                }
            }
            broadcast_detection(detection_data)
            
            # Send direction command
            confirmed = tracker.update(detected_direction)
            if confirmed and confirmed in direction_map:
                direction_cmd = direction_map[confirmed]
                command_data = {
                    "type": "command",
                    "direction": direction_cmd
                }
                broadcast_detection(command_data)
                print(f"📤 Command: {direction_cmd}")
            
            # Draw for local display
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            label = f"{class_name.upper()} {best_conf:.2f}"
            cv2.putText(frame, label, (x1, y1 - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        else:
            tracker.history.clear()
            # Send empty detection
            no_detection = {
                "type": "detection",
                "direction": None,
                "confidence": 0,
                "box": None
            }
            broadcast_detection(no_detection)

        # Show local view
        cv2.imshow("🎯 Detection (Local)", frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("\n✋ Quit")
            break

except KeyboardInterrupt:
    print("\n✋ Stopped")
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    cap.release()
    cv2.destroyAllWindows()
    print(f"\n✅ Done | {fps:.1f} FPS")
