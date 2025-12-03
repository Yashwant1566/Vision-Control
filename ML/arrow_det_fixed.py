import cv2
import numpy as np
import tensorflow as tf
import asyncio
import threading
import websockets
from collections import deque
import time
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
import socket

# ========== UPDATE THESE IPs ==========
ESP32_CAM_URL = "http://10.78.48.220:81/stream"
ML_HOST_IP = '0.0.0.0'
WS_PORT = 8765
STREAM_PORT = 8080  # HTTP MJPEG stream for app
# ======================================

# ========== PERFORMANCE TUNING ==========
JPEG_QUALITY = 70          # Adjust for quality vs speed (50-90)
FRAME_WIDTH = 480          # Smaller = faster
FRAME_HEIGHT = 360
SKIP_FRAMES = 1            # Process every Nth frame
STREAM_FPS = 30            # Target streaming FPS
# ========================================

MODEL_PATH = r"best_float32 (Detect).tflite"
CLASS_NAMES = {0: 'left', 1: 'right', 2: 'up', 3: 'down'}

print("🔹 Loading TensorFlow Lite model...")
try:
    interpreter = tf.lite.Interpreter(model_path=MODEL_PATH, num_threads=4)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    print(f"✅ Model loaded! Classes: {CLASS_NAMES}")
    print(f"📊 Input shape: {input_details[0]['shape']}")
    print(f"📊 Output shape: {output_details[0]['shape']}")
except Exception as e:
    print(f"❌ Failed to load model: {e}")
    sys.exit(1)

# ========== WEBSOCKET SERVER ==========
connected_clients = set()
broadcast_queue = asyncio.Queue()

async def ws_handler(websocket):
    connected_clients.add(websocket)
    client_addr = websocket.remote_address
    print(f"✅ WS Client connected: {client_addr} (Total: {len(connected_clients)})")
    try:
        await websocket.wait_closed()
    finally:
        connected_clients.remove(websocket)
        print(f"❌ WS Client disconnected: {client_addr} (Total: {len(connected_clients)})")

async def broadcast_worker():
    while True:
        msg = await broadcast_queue.get()
        if connected_clients:
            websockets.broadcast(connected_clients, msg)
        broadcast_queue.task_done()

async def run_websocket_server():
    try:
        async with websockets.serve(ws_handler, ML_HOST_IP, WS_PORT):
            print(f"🌐 WebSocket server: ws://{ML_HOST_IP}:{WS_PORT}")
            await broadcast_worker()
    except OSError as e:
        if e.errno == 10048:
            print(f"\n❌ Port {WS_PORT} already in use!")
            sys.exit(1)
        raise

def ws_thread_func():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(run_websocket_server())

ws_thread = threading.Thread(target=ws_thread_func, daemon=True)
ws_thread.start()
time.sleep(0.5)

def broadcast_direction(direction):
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(broadcast_queue.put(direction))
        print(f"📤 Direction: {direction}")
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

# ========== HTTP MJPEG STREAM SERVER ==========
latest_frame = None
frame_lock = threading.Lock()
stream_active = True

class StreamHandler(BaseHTTPRequestHandler):
    timeout = 10
    
    def log_message(self, format, *args):
        pass  # Suppress HTTP logs
    
    def handle_one_request(self):
        try:
            BaseHTTPRequestHandler.handle_one_request(self)
        except (socket.error, BrokenPipeError, ConnectionResetError):
            pass

    def do_GET(self):
        if self.path == '/stream':
            try:
                self.send_response(200)
                self.send_header('Content-type', 'multipart/x-mixed-replace; boundary=--jpgboundary')
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                self.send_header('Pragma', 'no-cache')
                self.send_header('Expires', '0')
                self.send_header('Connection', 'close')
                self.end_headers()
                
                print(f"📺 HTTP Client connected: {self.client_address[0]}")
                
                frame_delay = 1.0 / STREAM_FPS
                last_frame_time = 0
                
                while stream_active:
                    current_time = time.time()
                    
                    # Throttle FPS
                    if current_time - last_frame_time < frame_delay:
                        time.sleep(0.01)
                        continue
                    
                    last_frame_time = current_time
                    
                    with frame_lock:
                        if latest_frame is None:
                            continue
                        frame = latest_frame.copy()
                    
                    # Encode JPEG
                    ret, jpeg = cv2.imencode('.jpg', frame, 
                                            [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
                    if not ret:
                        continue
                    
                    try:
                        # Send MJPEG frame
                        self.wfile.write(b'--jpgboundary\r\n')
                        self.wfile.write(b'Content-Type: image/jpeg\r\n')
                        self.wfile.write(f'Content-Length: {len(jpeg)}\r\n\r\n'.encode())
                        self.wfile.write(jpeg.tobytes())
                        self.wfile.write(b'\r\n')
                        self.wfile.flush()
                    except (BrokenPipeError, ConnectionResetError, socket.error):
                        print(f"📺 HTTP Client disconnected: {self.client_address[0]}")
                        break
                        
            except Exception as e:
                print(f"❌ Stream error: {e}")
                
        elif self.path == '/':
            try:
                self.send_response(200)
                self.send_header('Content-type', 'text/html')
                self.end_headers()
                html = f"""
                <html>
                <head>
                    <title>ML Detection Stream</title>
                    <style>
                        body {{
                            background: #0F172A;
                            color: #fff;
                            text-align: center;
                            padding: 20px;
                            margin: 0;
                            font-family: Arial, sans-serif;
                        }}
                        img {{
                            max-width: 90%;
                            border: 3px solid #10B981;
                            border-radius: 8px;
                        }}
                        .info {{
                            font-family: monospace;
                            color: #94A3B8;
                            margin-top: 10px;
                        }}
                    </style>
                </head>
                <body>
                    <h1>🎯 Arrow Detection Stream</h1>
                    <img src="/stream">
                    <p class="info">
                        Quality: {JPEG_QUALITY}% | Resolution: {FRAME_WIDTH}x{FRAME_HEIGHT} | FPS: {STREAM_FPS}
                    </p>
                    <p class="info">
                        WebSocket: ws://{ML_HOST_IP}:{WS_PORT}
                    </p>
                </body>
                </html>
                """
                self.wfile.write(html.encode())
            except Exception:
                pass
        else:
            self.send_error(404)

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True
    
    def handle_error(self, request, client_address):
        pass  # Silently handle errors

def run_http_server():
    try:
        server = ThreadedHTTPServer((ML_HOST_IP, STREAM_PORT), StreamHandler)
        server.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        print(f"📺 HTTP Stream server: http://{ML_HOST_IP}:{STREAM_PORT}/stream")
        print(f"🌍 Web UI: http://{ML_HOST_IP}:{STREAM_PORT}/")
        server.serve_forever()
    except Exception as e:
        print(f"❌ HTTP Server error: {e}")

http_thread = threading.Thread(target=run_http_server, daemon=True)
http_thread.start()
time.sleep(1)

# ========== MAIN DETECTION LOOP ==========
print(f"🔹 Connecting to {ESP32_CAM_URL}...")
cap = cv2.VideoCapture(ESP32_CAM_URL, cv2.CAP_FFMPEG)
cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

if not cap.isOpened():
    print("❌ Failed to connect to ESP32 camera stream!")
    sys.exit(1)

print("✅ Camera stream connected!\n")

input_shape = input_details[0]['shape']
input_height, input_width = input_shape[1], input_shape[2]

direction_map = {
    'left': 'left',
    'right': 'right',
    'up': 'forward',
    'down': 'backward'
}

frame_count = 0
detection_count = 0
fps_time = time.time()
fps = 0
inference_ms = 0

print("🚀 DETECTION ACTIVE!")
print("=" * 80)
print(f"📹 ESP32 Camera: {ESP32_CAM_URL}")
print(f"🌐 WebSocket: ws://{ML_HOST_IP}:{WS_PORT}")
print(f"📺 HTTP Stream: http://{ML_HOST_IP}:{STREAM_PORT}/stream")
print(f"🌍 Web UI: http://{ML_HOST_IP}:{STREAM_PORT}/")
print(f"⚙️ Settings: Quality={JPEG_QUALITY}%, Size={FRAME_WIDTH}x{FRAME_HEIGHT}, StreamFPS={STREAM_FPS}")
print("=" * 80)
print("\n⌨️ Press 'q' in OpenCV window to quit\n")

try:
    while True:
        ret, frame = cap.read()
        if not ret:
            time.sleep(0.01)
            continue

        frame_count += 1
        
        # Skip frames if needed
        if frame_count % SKIP_FRAMES != 0:
            with frame_lock:
                latest_frame = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))
            continue
        
        # Resize for processing
        frame = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))
        orig_height, orig_width = frame.shape[:2]
        
        # FPS calculation
        if frame_count % 60 == 0:
            current_time = time.time()
            fps = 60 / (current_time - fps_time)
            fps_time = current_time
            print(f"📊 FPS: {fps:.1f} | Inference: {inference_ms:.0f}ms | WS Clients: {len(connected_clients)}")

        # Run ML inference
        img_resized = cv2.resize(frame, (input_width, input_height))
        img_rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)
        img_input = (img_rgb.astype(np.float32) / 255.0)[np.newaxis, ...]

        start_time = time.time()
        interpreter.set_tensor(input_details[0]['index'], img_input)
        interpreter.invoke()
        output = interpreter.get_tensor(output_details[0]['index'])
        inference_ms = (time.time() - start_time) * 1000

        # Parse YOLO output
        output = output[0].T  # [8400, 7]
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
        
        # Draw detection on frame
        if best_class >= 0 and best_class in CLASS_NAMES and best_box is not None:
            class_name = CLASS_NAMES[best_class]
            detected_direction = class_name.lower()
            
            # Calculate bounding box
            x_center_norm, y_center_norm, w_norm, h_norm = best_box
            x_center_px = x_center_norm * input_width
            y_center_px = y_center_norm * input_height
            w_px = w_norm * input_width
            h_px = h_norm * input_height
            
            x1_resized = int(x_center_px - w_px / 2)
            y1_resized = int(y_center_px - h_px / 2)
            x2_resized = int(x_center_px + w_px / 2)
            y2_resized = int(y_center_px + h_px / 2)
            
            # Scale to display frame
            scale_x = orig_width / input_width
            scale_y = orig_height / input_height
            
            x1 = max(0, min(int(x1_resized * scale_x), orig_width - 1))
            y1 = max(0, min(int(y1_resized * scale_y), orig_height - 1))
            x2 = max(0, min(int(x2_resized * scale_x), orig_width - 1))
            y2 = max(0, min(int(y2_resized * scale_y), orig_height - 1))
            
            # Draw green bounding box
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 3)
            
            # Draw label background
            label = f"{class_name.upper()} {best_conf:.2f}"
            font = cv2.FONT_HERSHEY_SIMPLEX
            (label_w, label_h), _ = cv2.getTextSize(label, font, 0.7, 2)
            
            label_y1 = max(y1 - label_h - 8, 0)
            cv2.rectangle(frame, (x1, label_y1), (x1 + label_w + 8, y1), (0, 255, 0), -1)
            cv2.putText(frame, label, (x1 + 4, y1 - 4), font, 0.7, (0, 0, 0), 2)
            
            # Draw large status at top
            cv2.putText(frame, f"DETECTED: {class_name.upper()}", (10, 35), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 2)
            
            # Broadcast direction if confirmed
            confirmed = tracker.update(detected_direction)
            if confirmed and confirmed in direction_map:
                direction_cmd = direction_map[confirmed]
                broadcast_direction(direction_cmd)
                detection_count += 1
        else:
            tracker.history.clear()
            cv2.putText(frame, "NO ARROW DETECTED", (10, 35), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)

        # Draw stats overlay at bottom
        cv2.rectangle(frame, (0, orig_height - 25), (250, orig_height), (0, 0, 0), -1)
        cv2.putText(frame, f"FPS: {fps:.1f} | {inference_ms:.0f}ms | Detections: {detection_count}", 
                   (5, orig_height - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        # Update global frame for HTTP streaming
        with frame_lock:
            latest_frame = frame.copy()

        # Display in OpenCV window
        cv2.imshow("🎯 Arrow Detection (Local View)", frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("\n✋ Quit by user")
            break

except KeyboardInterrupt:
    print("\n✋ Stopped by user")
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    stream_active = False
    cap.release()
    cv2.destroyAllWindows()
    print(f"\n✅ Detection stopped")
    print(f"📊 Final Stats: {fps:.1f} FPS | {detection_count} detections sent")