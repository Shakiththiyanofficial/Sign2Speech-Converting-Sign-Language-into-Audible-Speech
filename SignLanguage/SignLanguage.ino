#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// Define switch pins
const int fingerPins[5] = {13, 12, 14, 27, 26};

// Define combinations and corresponding text
const char* signMappings[32] = {
  "A", "B", "C", "D", "E",  // Define all 32 combinations here
  "F", "G", "H", "I", "J",
  "K", "L", "M", "N", "O",
  "P", "Q", "R", "S", "T",
  "U", "V", "W", "X", "Y",
  "Z", "Hello", "Yes", "No", "Help", "Thanks"
};

void setup() {
  Serial.begin(115200);

  // Initialize OLED
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
    for (;;);
  }
  display.clearDisplay();
  display.display();

  // Set finger switches as inputs with pull-up resistors
  for (int i = 0; i < 5; i++) {
    pinMode(fingerPins[i], INPUT_PULLUP);
  }
}

void loop() {
  int index = 0;

  // Read switches and form a binary number
  for (int i = 0; i < 5; i++) {
    if (digitalRead(fingerPins[i]) == LOW) { // Active LOW
      index |= (1 << i);
    }
  }

  // Display the corresponding text
  display.clearDisplay();
  display.setTextSize(2);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(10, 20);
  display.print(signMappings[index]); // Show mapped text
  display.display();

  Serial.println(signMappings[index]); // Debug output
  
  delay(500); // Small delay to avoid flickering
}