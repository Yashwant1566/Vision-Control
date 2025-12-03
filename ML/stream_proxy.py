"""
Simple HTTP proxy to forward ESP32 camera stream to phone via ADB reverse
"""
import requests
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn

ESP32_STREAM_URL = "http://10.78.48.220:81/stream"
PROXY_PORT = 8082  # Changed from 8081 to avoid conflict with Metro

class ProxyHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Suppress logging
        pass

    def do_GET(self):
        if self.path == '/stream' or self.path == '/':
            try:
                print(f"📹 Client connected: {self.client_address[0]}")
                print(f"   Proxying stream from: {ESP32_STREAM_URL}")
                
                # Stream from ESP32 with longer timeout
                response = requests.get(ESP32_STREAM_URL, stream=True, timeout=30)
                
                # Forward headers
                self.send_response(200)
                self.send_header('Content-Type', response.headers.get('Content-Type', 'multipart/x-mixed-replace'))
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                self.send_header('Pragma', 'no-cache')
                self.send_header('Connection', 'close')
                self.end_headers()
                
                # Stream data
                for chunk in response.iter_content(chunk_size=4096):
                    if chunk:
                        try:
                            self.wfile.write(chunk)
                            self.wfile.flush()
                        except (BrokenPipeError, ConnectionResetError):
                            print(f"📹 Client disconnected: {self.client_address[0]}")
                            break
                            
            except requests.exceptions.RequestException as e:
                print(f"❌ ESP32 stream error: {e}")
                self.send_error(502, "Cannot connect to ESP32 camera")
            except Exception as e:
                print(f"❌ Proxy error: {e}")
        else:
            self.send_error(404)

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

if __name__ == "__main__":
    try:
        server = ThreadedHTTPServer(('0.0.0.0', PROXY_PORT), ProxyHandler)
        print("=" * 60)
        print("🎥 ESP32 Camera Stream Proxy")
        print("=" * 60)
        print(f"📹 ESP32 Source: {ESP32_STREAM_URL}")
        print(f"🌐 Proxy Server: http://0.0.0.0:{PROXY_PORT}/stream")
        print(f"📱 Phone Access: http://localhost:{PROXY_PORT}/stream (via ADB)")
        print("=" * 60)
        print("\n⏳ Waiting for connections...\n")
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n✋ Proxy stopped")
    except Exception as e:
        print(f"❌ Error: {e}")
