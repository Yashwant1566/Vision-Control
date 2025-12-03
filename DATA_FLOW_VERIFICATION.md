# 🔄 Data Flow Verification

## Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VISION CONTROL SYSTEM                         │
└─────────────────────────────────────────────────────────────────────┘

Step 1: ESP32-CAM streams video
┌──────────────┐
│  ESP32-CAM   │ ──────> http://172.30.186.220:81/stream
└──────────────┘
        │
        │ Video Stream
        ↓
        
Step 2: ML Model detects arrow direction
┌──────────────┐
│ arrow_det.py │ ──────> Captures frames from stream
│              │ ──────> Runs YOLO classification
│              │ ──────> Detects: left, right, up, down
└──────────────┘
        │
        │ Direction held for 1+ second
        │
        ↓ Maps direction:
        │   'left' → 'left'
        │   'right' → 'right'
        │   'up' → 'forward'
        │   'down' → 'backward'
        │
        ↓ Broadcasts via WebSocket
        
Step 3: WebSocket server broadcasts direction
┌──────────────┐
│  WS Server   │ ──────> ws://172.30.186.118:8765
│  (port 8765) │ ──────> Sends: "left", "right", "forward", etc.
└──────────────┘
        │
        │ WebSocket Message
        │
        ↓
        
Step 4: GameScreen.js receives direction
┌──────────────┐
│GameScreen.js │ ──────> Connects to ws://172.30.186.118:8765
│ (React Native│ ──────> Receives: event.data = "forward"
│     App)     │ ──────> Maps to ESP32 command
└──────────────┘
        │
        │ useEffect WebSocket listener:
        │
        │   ws.onmessage = (event) => {
        │     const direction = event.data.trim().toLowerCase();
        │     console.log('🧠 ML Direction received:', direction);
        │     
        │     const commandMap = {
        │       'left': 'left',
        │       'right': 'right',
        │       'forward': 'forward',
        │       'backward': 'backward',
        │       'stop': 'stop'
        │     };
        │     
        │     const command = commandMap[direction];
        │     if (command) {
        │       sendCommand(command);  // ← Calls ESP32
        │     }
        │   }
        │
        ↓
        
Step 5: sendCommand() executes
┌──────────────┐
│ sendCommand()│ ──────> console.log('🎮 GameScreen: Executing command')
│              │ ──────> Calls: sendCommandToESP32(cmd)
└──────────────┘
        │
        ↓
        
Step 6: sendCommandToESP32() sends HTTP request
┌──────────────┐
│sendCommand   │ ──────> const url = `http://172.30.186.220/${command}`
│ToESP32()     │ ──────> Example: http://172.30.186.220/forward
│              │ ──────> Method: GET
└──────────────┘
        │
        │ HTTP Request
        │
        ↓
        
Step 7: ESP32 receives command
┌──────────────┐
│   ESP32      │ ──────> Receives: GET /forward
│ CameraWeb    │ ──────> Moves motors forward
│  Server.ino  │ ──────> Responds: 200 OK
└──────────────┘
        │
        ↓
        
Step 8: Response back to GameScreen.js
┌──────────────┐
│GameScreen.js │ ──────> console.log('✅ ESP32 Response: OK')
│              │ ──────> Updates UI (currentCommand = 'FORWARD')
│              │ ──────> Shows arrow emoji: ⬆️
└──────────────┘

🚗 CAR MOVES! 🚗
```

---

## Console Logs to Verify Each Step

### 1. arrow_det.py Console:
```
✅ Stream connected!
0: 320x320 Left 0.92, Right 0.03, Down 0.03, Up 0.02, 13.7ms
➡️ Confirmed direction: Left → left          ← Step 2 ✓
```

### 2. Python WebSocket Server:
```
✅ Client connected. Total clients: 1         ← GameScreen.js connected ✓
```

### 3. React Native Console (GameScreen.js):
```
🌐 Connected to ML direction server           ← Step 4 ✓
🧠 ML Direction received: left                ← WebSocket message received ✓
🎮 GameScreen: Executing command 'left'       ← Step 5 ✓
📡 Sending to ESP32: http://172.30.186.220/left ← Step 6 ✓
✅ ESP32 Response: OK                         ← Step 7 ✓
✅ Command 'left' executed successfully       ← Step 8 ✓
```

### 4. ESP32 Serial Monitor:
```
GET /left                                     ← Received HTTP request ✓
Moving left...
```

---

## Test Cases

### Test Case 1: Manual Button Press
**Purpose:** Verify GameScreen.js → ESP32 communication

**Steps:**
1. Open GameScreen in React Native app
2. Press "LEFT" button manually
3. Check console for logs

**Expected Logs:**
```javascript
🎮 GameScreen: Executing command 'left'
📡 Sending to ESP32: http://172.30.186.220/left
✅ ESP32 Response: OK
✅ Command 'left' executed successfully (Speed: 50%)
```

**Expected Result:** ✅ Car turns left

---

### Test Case 2: ML Direction via WebSocket
**Purpose:** Verify ML → WebSocket → GameScreen.js → ESP32

**Steps:**
1. Start arrow_det.py
2. Open GameScreen in React Native app
3. Hold LEFT arrow in front of camera for 1+ second
4. Watch all consoles

**Expected Flow:**

**Python Console (arrow_det.py):**
```
➡️ Confirmed direction: Left → left
```

**React Native Console:**
```
🧠 ML Direction received: left
🎮 GameScreen: Executing command 'left'
📡 Sending to ESP32: http://172.30.186.220/left
✅ ESP32 Response: OK
✅ Command 'left' executed successfully
```

**Expected Result:** ✅ Car turns left automatically

---

### Test Case 3: All Directions
**Test each direction:**

| Arrow Shown | ML Output | WS Message | ESP32 URL | Car Action |
|-------------|-----------|------------|-----------|------------|
| ⬅️ Left     | Left      | "left"     | /left     | Turn left  |
| ➡️ Right    | Right     | "right"    | /right    | Turn right |
| ⬆️ Up       | Up        | "forward"  | /forward  | Move forward |
| ⬇️ Down     | Down      | "backward" | /backward | Move backward |

---

### Test Case 4: WebSocket Reconnection
**Purpose:** Verify auto-reconnect works

**Steps:**
1. Start arrow_det.py
2. Open GameScreen
3. Stop arrow_det.py (Ctrl+C)
4. Wait 5 seconds
5. Restart arrow_det.py

**Expected Logs:**
```
❌ ML WebSocket closed. Reconnecting in 5s...
🌐 Connected to ML direction server
```

---

## Verification Checklist

### ✅ GameScreen.js is correctly configured:
- [x] WebSocket connects to `ws://172.30.186.118:8765`
- [x] `ws.onmessage` handler is defined
- [x] Direction mapping matches ML output
- [x] `sendCommand()` is called with correct command
- [x] `sendCommandToESP32()` sends to correct URL
- [x] Enhanced logging is in place

### ✅ Data Flow Components:
- [x] arrow_det.py broadcasts directions via WebSocket
- [x] WebSocket server runs on port 8765
- [x] GameScreen.js connects to WebSocket on mount
- [x] Messages flow from ML → WS → App → ESP32
- [x] ESP32 endpoints match commands

---

## Quick Test Script

Run this to monitor WebSocket in real-time:
```bash
cd ML
python test_websocket_flow.py
```

Then hold an arrow in front of camera and watch the output!

---

## Troubleshooting

### Issue: GameScreen doesn't receive WebSocket messages
**Check:**
1. Is arrow_det.py running? Check Python console
2. Is ML_HOST_IP correct in GameScreen.js? (Line 141)
3. Check React Native console for connection errors
4. Run `python test_websocket_flow.py` to verify WS works

### Issue: Commands not sent to ESP32
**Check:**
1. Is ESP32_IP correct? (Line 18)
2. Check React Native console for HTTP errors
3. Verify ESP32 is on and connected to WiFi
4. Test manual button press first

### Issue: Car doesn't move
**Check:**
1. ESP32 Serial Monitor - are requests received?
2. Are motor pins configured correctly?
3. Is battery charged?
4. Test with `/forward` in browser first

---

**All systems verified and ready! 🚀**
