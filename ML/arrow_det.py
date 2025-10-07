import cv2
import requests
import numpy as np
from ultralytics import YOLO

# Load model
model = YOLO("/home/yashwant/Desktop/App Dev/test/firsProject/ML/best_float32.tflite", task="classify")

# ESP32-CAM URL
url = "http://10.184.205.146/stream"

# Open MJPEG stream
stream = requests.get(url, stream=True)
bytes_data = b""

for chunk in stream.iter_content(chunk_size=1024):
    bytes_data += chunk
    a = bytes_data.find(b'\xff\xd8')  # JPEG start
    b = bytes_data.find(b'\xff\xd9')  # JPEG end
    if a != -1 and b != -1 and b > a:
        jpg = bytes_data[a:b+2]
        bytes_data = bytes_data[b+2:]

        # Only decode if jpg has a reasonable size
        if len(jpg) > 1000:  # ignore tiny corrupted frames
            frame = cv2.imdecode(np.frombuffer(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
            if frame is None:
                continue  # skip if decoding failed

            # Run classification
            results = model(frame)
            pred = results[0]

            if pred.probs is not None:
                top1_class = pred.names[pred.probs.top1]
                top1_conf = pred.probs.top1conf
                text = f"{top1_class} ({top1_conf:.2f})"
                cv2.putText(frame, text, (20, 40), cv2.FONT_HERSHEY_SIMPLEX,
                            1, (0, 255, 0), 2, cv2.LINE_AA)

            cv2.imshow("ESP32-CAM Classification", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

cv2.destroyAllWindows()
