# 🎯 Arrow Detection Stream Setup

## What Changed?

Your React Native app now shows the **processed video stream with detection boxes** instead of just the raw camera feed!

## New Architecture

```
ESP32-CAM (10.78.48.220)
    ↓ streams raw video (:81/stream)
Python ML Script (10.78.48.118)
    ↓ processes frames
    ↓ draws detection boxes
    ↓ serves processed stream (:8080/stream)
React Native App
    ↓ displays processed stream with boxes
    ↓ receives WebSocket directions
    ↓ sends commands to ESP32
```

## Setup Steps

### 1. Update IP Addresses

**In `ML/arrow_det_fixed.py` line 12:**
```python
ESP32_CAM_URL = "http://10.78.48.220:81/stream"  # Your ESP32 IP
```

**In `screens/GameScreen.js` lines 18-20:**
```javascript
const ESP32_IP = "http://10.78.48.220";
const ML_HOST_IP = '10.78.48.118';  // Your PC IP
const ML_STREAM_URL = 'http://10.78.48.118:8080/stream';
```

### 2. Run ML Detection Script

```bash
cd ML
python arrow_det_fixed.py
```

**Expected Output:**
```
✅ Model loaded! Classes: {0: 'left', 1: 'right', 2: 'up', 3: 'down'}
🌐 WebSocket: ws://0.0.0.0:8765
📺 MJPEG Stream Server: http://10.78.48.118:8080/stream
   (Use this URL in React Native app)
✅ Stream OK
```

### 3. Test Stream in Browser

Open browser and go to:
```
http://10.78.48.118:8080/stream
```

You should see:
- ✅ Live camera feed
- ✅ **Green boxes around detected arrows**
- ✅ Labels showing "LEFT 0.87", "RIGHT 0.92", etc.
- ✅ "No Arrow Detected" when no arrow is visible
- ✅ FPS counter at bottom

### 4. Rebuild React Native App

```bash
# Clean build
cd android
./gradlew clean
cd ..

# Run app
npx react-native run-android
```

### 5. Check App

Open GameScreen in the app. You should see:
- ✅ "📹 LIVE DETECTION FEED" header with 🧠 AI badge
- ✅ **Video with green detection boxes**
- ✅ Labels on arrows showing direction and confidence
- ✅ Stream URL at bottom

## What You'll See

### In Python OpenCV Window:
- Real-time video with detection boxes
- Green rectangles around detected arrows
- Labels: "LEFT 0.87", "RIGHT 0.92", etc.
- FPS counter

### In React Native App:
- **Same processed video with detection boxes!**
- Green boxes around arrows
- Labels showing direction + confidence
- "No Arrow Detected" when no arrow present

### Detection Flow:
1. **Camera captures arrow**
2. **Python ML processes frame**
3. **Draws green box + label**
4. **Streams processed frame to app**
5. **App displays video with boxes**
6. **WebSocket sends direction command**
7. **ESP32 executes motor command**

## Features

### Visual Feedback:
- ✅ **Green boxes** around detected arrows
- ✅ **Labels** with direction name and confidence
- ✅ **"No Arrow Detected"** message when idle
- ✅ **FPS counter** for performance monitoring

### Stream Quality:
- Resolution: Same as ESP32 camera (VGA/SVGA)
- FPS: ~30 FPS in app
- Latency: ~100-200ms total
- Quality: JPEG 80% (adjustable)

## Customization

### Change Box Color
**In `arrow_det_fixed.py` line ~242:**
```python
cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 3)  # Green
# Change to: (255, 0, 0) for Blue or (0, 0, 255) for Red
```

### Change Text Size
**In `arrow_det_fixed.py` line ~247:**
```python
cv2.putText(frame, label_text, (x1, y1 - 5), 
           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
# Change 0.8 to 1.0 for larger text
```

### Adjust Stream Quality
**In `arrow_det_fixed.py` line ~92:**
```python
ret, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
# Change 80 to:
#   90-95 = Higher quality, more bandwidth
#   60-70 = Lower quality, less bandwidth
```

### Change Stream FPS
**In `arrow_det_fixed.py` line ~99:**
```python
time.sleep(0.033)  # ~30 FPS
# Change to:
#   0.050 = 20 FPS (lower CPU)
#   0.020 = 50 FPS (higher CPU)
```

## Troubleshooting

### App shows black screen
1. Check Python script is running
2. Test stream in browser: `http://10.78.48.118:8080/stream`
3. Verify IP addresses match
4. Check firewall allows port 8080

### No detection boxes visible
1. Check OpenCV window - boxes should appear there
2. Verify detection is working (watch console output)
3. Try better lighting
4. Lower confidence threshold to 0.3

### Stream is laggy
1. Reduce JPEG quality to 60
2. Increase sleep time to 0.050 (20 FPS)
3. Process every 2nd frame only
4. Reduce camera resolution on ESP32

### "Port 8080 already in use"
```bash
# Windows
netstat -ano | findstr :8080
# Kill the process using that port
taskkill /F /PID <process_id>
```

## Comparison

### Before (Raw Stream):
```
ESP32 → App (raw video)
No detection visualization
Separate detection process
```

### After (Processed Stream):
```
ESP32 → Python ML → App (processed video)
✅ Detection boxes visible
✅ Labels with confidence
✅ Real-time feedback
✅ Better user experience
```

## Performance

| Metric | Value |
|--------|-------|
| Stream Resolution | VGA (640x480) |
| Stream FPS | ~30 FPS |
| Detection FPS | ~15-20 FPS |
| Latency | 100-200ms |
| JPEG Quality | 80% |
| Bandwidth | ~500 KB/s |

## URLs Summary

| Service | URL |
|---------|-----|
| ESP32 Camera | http://10.78.48.220:81/stream |
| ML Processed Stream | http://10.78.48.118:8080/stream |
| WebSocket Server | ws://10.78.48.118:8765 |
| ESP32 Commands | http://10.78.48.220/forward |

---

**Result:** Your React Native app now shows live arrow detection with green boxes around detected arrows! 🎯✨
