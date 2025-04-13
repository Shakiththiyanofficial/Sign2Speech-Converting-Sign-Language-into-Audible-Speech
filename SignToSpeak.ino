#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// Include helper files from Firebase library
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// ------------------- USER CONFIG -------------------
#define WIFI_SSID "Vipulan’s iPhone"
#define WIFI_PASSWORD "Vipul1405"

#define API_KEY "AIzaSyB9T0YT18kVf_sNtdJz1b5SPM-f0-R_z-8"
#define DATABASE_URL "https://signtospeak-92c56-default-rtdb.firebaseio.com/"
// ---------------------------------------------------

// Pins for the 5 limit switches
int switchPins[5] = {13, 12, 14, 27, 26};  // Adjust as needed

// Buzzer pin
#define BUZZER_PIN 4

// Default start signal (editable from app)
String startSignal = "10101";

// Firebase setup
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

bool signupOK = false;
unsigned long lastSent = 0;

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);

  // Initialize switch pins
  for (int i = 0; i < 5; i++) {
    pinMode(switchPins[i], INPUT_PULLUP);
  }

  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected. IP: " + WiFi.localIP().toString());

  // Firebase config
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  config.token_status_callback = tokenStatusCallback;

  if (Firebase.signUp(&config, &auth, "", "")) {
    signupOK = true;
    Serial.println("Firebase signup OK");
  } else {
    Serial.printf("Firebase signup failed: %s\n", config.signer.signupError.message.c_str());
  }

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // One beep when ready
  tone(BUZZER_PIN, 1000, 200);
}

// Reads binary pattern from switches
String readBinarySignal() {
  String binary = "";
  for (int i = 0; i < 5; i++) {
    binary += (digitalRead(switchPins[i]) == LOW) ? "1" : "0";
  }
  return binary;
}

void loop() {
  if (!signupOK || !Firebase.ready()) return;

  String inputSignal = readBinarySignal();
  Serial.println("Read: " + inputSignal);

  // Detect start signal
  if (inputSignal == startSignal && millis() - lastSent > 3000) {
    Serial.println("Start signal detected");

    // Beep once
    tone(BUZZER_PIN, 1000, 150);

    delay(1500);  // Small wait before next gesture

    // Read next gesture
    String gestureSignal = readBinarySignal();
    Serial.println("Next Gesture Signal: " + gestureSignal);

    // Ignore 00000 and startSignal again
    if (gestureSignal != "00000" && gestureSignal != startSignal) {
      if (Firebase.RTDB.setString(&fbdo, "/SignSpeak/gesture", gestureSignal)) {
        Serial.println("Signal sent to Firebase: " + gestureSignal);

        // Double beep to confirm
        tone(BUZZER_PIN, 1000, 100);
        delay(150);
        tone(BUZZER_PIN, 1000, 100);

        lastSent = millis();
      } else {
        Serial.println("Firebase Error: " + fbdo.errorReason());
      }
    } else {
      Serial.println("Invalid gesture. Not sent.");
    }
  }

  delay(200);  // Polling delay
}
