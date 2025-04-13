#include <stdio.h>

// Define switch states (0 = not pressed, 1 = pressed)
int thumbState = 0;
int indexState = 0;
int middleState = 0;
int ringState = 0;
int pinkyState = 0;

void setup() {
    // Initialize states (this is a placeholder for real hardware initialization)
    printf("System initialized.\n");
}

void loop() {
    // Simulate reading switch states (replace with real hardware input)
    printf("Enter states for Thumb, Index, Middle, Ring, Pinky (0 or 1):\n");
    scanf("%d %d %d %d %d", &thumbState, &indexState, &middleState, &ringState, &pinkyState);

    // Calculate the 5-bit binary value
    int binaryValue = (thumbState << 4) | (indexState << 3) | (middleState << 2) | (ringState << 1) | pinkyState;

    // Display switch states
    printf("Thumb: %s\n", thumbState ? "ON" : "OFF");
    printf("Index: %s\n", indexState ? "ON" : "OFF");
    printf("Middle: %s\n", middleState ? "ON" : "OFF");
    printf("Ring: %s\n", ringState ? "ON" : "OFF");
    printf("Pinky: %s\n", pinkyState ? "ON" : "OFF");

    // Display binary value
    printf("Binary: %05d\n", binaryValue);
}

int main() {
    setup();

    while (1) {
        loop();
    }

    return 0;
}
