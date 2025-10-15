#include "esp_camera.h"
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// Use your board's camera pin mappings via board_config.h
#include "board_config.h"

// ---------- WiFi ----------
const char* ssid = "Yashwant";
const char* password = "yashwant";

// ---------- Motor pins ----------
const int motorLeft1  = 14;
const int motorLeft2  = 12;
const int motorRight1 = 13;
const int motorRight2 = 15;

// ---------- Web server ----------
AsyncWebServer server(80);

// ---------- Tasking & Frame Sync ----------
// This semaphore ensures only one task accesses the framebuffer at a time
static SemaphoreHandle_t frameSemaphore = NULL;
// Pointer to the current framebuffer, shared between tasks
static camera_fb_t * fb = NULL;

// Forward declarations
void startMotorEndpoints();
void startDebugEndpoints();
#if defined(LED_GPIO_NUM)
extern void setupLedFlash();
#endif

// ---------- Tunable parameters ----------
const uint32_t CAPTURE_PERIOD_MS = 100;   // ms between captures (100ms => ~10 FPS). Increase to reduce load.
const size_t CAMERA_TASK_STACK = 16384;   // stack bytes for camera task (increase if still stack-overflowing)
const BaseType_t CAMERA_TASK_PRIORITY = 1;
const int CAMERA_TASK_CORE = 1;           // pin camera task to core 1 (leave core 0 for Wi-Fi/system)

// ===================================================
//  Dedicated task for capturing frames from the camera
// ===================================================
void cameraTask(void *pvParameters) {
  const TickType_t captureDelay = pdMS_TO_TICKS(CAPTURE_PERIOD_MS);

  while (true) {
    if (xSemaphoreTake(frameSemaphore, portMAX_DELAY) == pdTRUE) {
      // return previous frame to driver (if any)
      if (fb) {
        esp_camera_fb_return(fb);
        fb = NULL;
      }
      // capture new frame
      fb = esp_camera_fb_get();
      xSemaphoreGive(frameSemaphore);
    }
    // control capture FPS
    vTaskDelay(captureDelay);
  }
}

// ---------- Motor functions ----------
void moveForward() {
  digitalWrite(motorLeft1, HIGH);
  digitalWrite(motorLeft2, LOW);
  digitalWrite(motorRight1, HIGH);
  digitalWrite(motorRight2, LOW);
}
void moveBackward() {
  digitalWrite(motorLeft1, LOW);
  digitalWrite(motorLeft2, HIGH);
  digitalWrite(motorRight1, LOW);
  digitalWrite(motorRight2, HIGH);
}
void turnLeft() {
  digitalWrite(motorLeft1, LOW);
  digitalWrite(motorLeft2, HIGH);
  digitalWrite(motorRight1, HIGH);
  digitalWrite(motorRight2, LOW);
}
void turnRight() {
  digitalWrite(motorLeft1, HIGH);
  digitalWrite(motorLeft2, LOW);
  digitalWrite(motorRight1, LOW);
  digitalWrite(motorRight2, HIGH);
}
void stopMotors() {
  digitalWrite(motorLeft1, LOW);
  digitalWrite(motorLeft2, LOW);
  digitalWrite(motorRight1, LOW);
  digitalWrite(motorRight2, LOW);
}

// ---------- Setup ----------
void setup() {
  // Disable brownout detector, which can cause unexpected resets with the camera
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); 

  Serial.begin(115200);
  // Serial.setDebugOutput(true); // keep disabled for stability testing
  Serial.println("Stabilized Camera + Motor Server starting...");

  // Initialize motor pins
  pinMode(motorLeft1, OUTPUT);
  pinMode(motorLeft2, OUTPUT);
  pinMode(motorRight1, OUTPUT);
  pinMode(motorRight2, OUTPUT);
  stopMotors();

  // Configure camera
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  // Choose resolution + quality carefully to reduce CPU/heap pressure
  if (psramFound()) {
    config.frame_size = FRAMESIZE_VGA;    // try VGA on PSRAM boards; reduce if unstable
    config.jpeg_quality = 30;             // higher number => more compression, lower CPU & memory load
    config.fb_count = 2;                  // 2 buffers = smoother streaming but higher memory usage
  } else {
    config.frame_size = FRAMESIZE_QVGA;   // non-psram boards should use QVGA or smaller
    config.jpeg_quality = 30;
    config.fb_count = 1;
  }

  // Camera init
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    return;
  }

  // Setup LED flash if available
  #if defined(LED_GPIO_NUM)
  setupLedFlash();
  #endif

  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  unsigned long startTry = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
    // optional timeout to avoid infinite blocking
    if (millis() - startTry > 20000) {
      Serial.println("\nWiFi connect timeout, retrying...");
      startTry = millis();
    }
  }
  Serial.println("\nWiFi connected");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  // Create the semaphore and the dedicated camera task
  frameSemaphore = xSemaphoreCreateMutex();
  if (!frameSemaphore) {
    Serial.println("Failed to create frame semaphore!");
    return;
  }

  BaseType_t created = xTaskCreatePinnedToCore(
    cameraTask,             // Function to implement the task
    "cameraTask",           // Name of the task
    CAMERA_TASK_STACK,      // Stack size in bytes
    NULL,                   // Task input parameter
    CAMERA_TASK_PRIORITY,   // Priority of the task
    NULL,                   // Task handle
    CAMERA_TASK_CORE        // Core where the task should run
  );
  if (created != pdPASS) {
    Serial.println("Failed to create cameraTask!");
    // proceed but streaming will likely fail
  }

  // continuous MJPEG stream handler
  server.on("/stream", HTTP_GET, [](AsyncWebServerRequest *request) {
    AsyncWebServerResponse *response = request->beginChunkedResponse(
      "multipart/x-mixed-replace; boundary=frame",
      // callback that AsyncWebServer calls repeatedly to fill chunks
      [](uint8_t *buffer, size_t maxLen, size_t index) -> size_t {
        // static state for this connection
        static uint8_t *jpg_buffer = nullptr;
        static size_t jpg_len = 0;
        static size_t pos = 0;
        static bool header_written = false;

        size_t out_len = 0;

        // If we finished the previous frame, try to grab a fresh one now.
        if (jpg_buffer == nullptr || pos >= jpg_len) {
          // Release previous copy if any
          if (jpg_buffer) {
            free(jpg_buffer);
            jpg_buffer = nullptr;
            jpg_len = 0;
            pos = 0;
            header_written = false;
          }

          // Copy latest frame under semaphore
          if (xSemaphoreTake(frameSemaphore, (TickType_t)200) == pdTRUE) {
            if (fb && fb->len) {
              jpg_len = fb->len;
              jpg_buffer = (uint8_t*) malloc(jpg_len);
              if (jpg_buffer) {
                memcpy(jpg_buffer, fb->buf, jpg_len);
              } else {
                // allocation failed
                jpg_len = 0;
              }
            } else {
              jpg_len = 0;
            }
            xSemaphoreGive(frameSemaphore);
          } else {
            // couldn't obtain frame; tell server nothing to send this round
            return 0;
          }

          // If still no frame, end
          if (!jpg_buffer || jpg_len == 0) {
            if (jpg_buffer) { free(jpg_buffer); jpg_buffer = nullptr; }
            return 0;
          }
        }

        // If header not yet written for this frame, write the multipart header first
        if (!header_written) {
          int h = snprintf((char*)buffer, maxLen,
                           "--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %zu\r\n\r\n",
                           jpg_len);
          if (h < 0) return 0;
          header_written = true;
          out_len += (size_t)h;
        }

        // Copy as many bytes of the JPEG as fit
        size_t space = (out_len < maxLen) ? (maxLen - out_len) : 0;
        size_t remaining = (jpg_len > pos) ? (jpg_len - pos) : 0;
        size_t toCopy = (space < remaining) ? space : remaining;

        if (toCopy) {
          memcpy(buffer + out_len, jpg_buffer + pos, toCopy);
          out_len += toCopy;
          pos += toCopy;
        }

        // If we finished sending the JPEG, append trailing CRLF (if fits) and prepare for next frame
        if (pos >= jpg_len) {
          if (out_len + 2 <= maxLen) {
            memcpy(buffer + out_len, "\r\n", 2);
            out_len += 2;
          }
          // mark so next call will fetch a new frame
          header_written = false;
          // free buffer now so next iteration will copy new frame
          free(jpg_buffer);
          jpg_buffer = nullptr;
          jpg_len = 0;
          pos = 0;
        }

        return out_len;
      } // end lambda
    );
    request->send(response);
  });

  // single-image capture endpoint
  server.on("/capture", HTTP_GET, [](AsyncWebServerRequest *request) {
    AsyncWebServerResponse *response = NULL;
    if (xSemaphoreTake(frameSemaphore, (TickType_t)100) == pdTRUE) {
      if(fb && fb->len) {
        response = request->beginResponse_P(200, "image/jpeg", fb->buf, fb->len);
      }
      xSemaphoreGive(frameSemaphore);
    }

    if (!response) {
      request->send(503, "text/plain", "Camera frame not available");
    } else {
      response->addHeader("Content-Disposition", "inline; filename=capture.jpg");
      request->send(response);
    }
  });

  startMotorEndpoints();
  startDebugEndpoints();

  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  // The tasks handle everything, so the main loop can be empty or just delay
  delay(1); 
}

// ---------- Motor & Debug endpoint functions ----------
void startMotorEndpoints() {
  server.on("/forward", HTTP_GET, [](AsyncWebServerRequest *request){ moveForward(); request->send(200); });
  server.on("/backward", HTTP_GET, [](AsyncWebServerRequest *request){ moveBackward(); request->send(200); });
  server.on("/left", HTTP_GET, [](AsyncWebServerRequest *request){ turnLeft(); request->send(200); });
  server.on("/right", HTTP_GET, [](AsyncWebServerRequest *request){ turnRight(); request->send(200); });
  server.on("/stop", HTTP_GET, [](AsyncWebServerRequest *request){ stopMotors(); request->send(200); });
}

void startDebugEndpoints() {
  server.on("/heap", HTTP_GET, [](AsyncWebServerRequest *request){
    char info[120];
    sprintf(info, "Free Heap: %u bytes\nMin Free Heap: %u bytes", ESP.getFreeHeap(), ESP.getMinFreeHeap());
    request->send(200, "text/plain", info);
  });
}
