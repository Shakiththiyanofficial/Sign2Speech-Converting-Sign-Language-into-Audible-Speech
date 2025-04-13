#include <stdio.h>
#include <string.h>
#include <time.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "esp_log.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "nvs_flash.h"
#include "esp_netif.h"
#include "esp_system.h"
#include "esp_sntp.h"
#include "esp_http_client.h"

#define TAG "SIGN_READER"

// === Wi-Fi Credentials ===
#define WIFI_SSID      "Dell"
#define WIFI_PASSWORD  "ajith4321"

// === Firebase Realtime Database URL ===
#define FIREBASE_URL   "https://sign2speech-2598c-default-rtdb.firebaseio.com/SignSpeak/history.json"

// === PEM Certificate for HTTPS (must be embedded using EMBED_TXTFILES in CMakeLists) ===
extern const uint8_t firebase_cert_pem_start[] asm("_binary_firebase_cert_pem_start");

// === GPIOs for limit switches (representing fingers) ===
int switchPins[5] = {13, 12, 14, 27, 26};

// === GPIO pin for buzzer ===
#define BUZZER_GPIO 4

// === Binary string for start signal ===
const char* startSignal = "10101";

// === Read 5-finger binary gesture from limit switches ===
void readGesture(char* gestureOut) {
    for (int i = 0; i < 5; i++) {
        int level = gpio_get_level(switchPins[i]);
        gestureOut[i] = (level == 0) ? '1' : '0';  // Pressed = LOW = 1
    }
    gestureOut[5] = '\0';
}

// === Activate buzzer with beeps ===
void beep_buzzer(int times, int duration_ms, int gap_ms) {
    for (int i = 0; i < times; i++) {
        gpio_set_level(BUZZER_GPIO, 1);
        vTaskDelay(pdMS_TO_TICKS(duration_ms));
        gpio_set_level(BUZZER_GPIO, 0);
        if (i < times - 1) vTaskDelay(pdMS_TO_TICKS(gap_ms));
    }
}

// === Fetch current time from NTP server and log it ===
void fetch_time_from_wifi() {
    ESP_LOGI(TAG, "Syncing time with NTP...");
    esp_sntp_setoperatingmode(SNTP_OPMODE_POLL);
    esp_sntp_setservername(0, "pool.ntp.org");
    esp_sntp_init();

    time_t now = 0;
    struct tm timeinfo = { 0 };
    int retry = 0;
    const int retry_count = 10;

    while (timeinfo.tm_year < (2020 - 1900) && ++retry < retry_count) {
        ESP_LOGI(TAG, "Waiting for time... (%d/%d)", retry, retry_count);
        time(&now);
        localtime_r(&now, &timeinfo);
        vTaskDelay(pdMS_TO_TICKS(1000));
    }

    if (timeinfo.tm_year >= (2020 - 1900)) {
        setenv("TZ", "IST-5:30", 1);  // Set timezone to Sri Lanka/India
        tzset();

        char timeStr[64];
        strftime(timeStr, sizeof(timeStr), "%c", &timeinfo);

        ESP_LOGI(TAG, "NTP Time synced successfully!");
        ESP_LOGI(TAG, "Current Sri Lanka Time: %s", timeStr);
        ESP_LOGI(TAG, "Year: %d | Month: %d | Day: %d", timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday);
        ESP_LOGI(TAG, "Hour: %02d | Minute: %02d | Second: %02d", timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
    } else {
        ESP_LOGW(TAG, "Failed to fetch time from NTP.");
    }
}

// === Initialize Wi-Fi and call NTP sync ===
void wifi_init_sta(void) {
    ESP_ERROR_CHECK(nvs_flash_init());
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());

    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    wifi_config_t wifi_config = {
        .sta = {
            .ssid = WIFI_SSID,
            .password = WIFI_PASSWORD,
        },
    };

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());

    ESP_LOGI(TAG, "Connecting to WiFi...");
    esp_wifi_connect();

    for (int i = 0; i < 20; i++) {
        wifi_ap_record_t ap_info;
        if (esp_wifi_sta_get_ap_info(&ap_info) == ESP_OK) {
            ESP_LOGI(TAG, "Connected to WiFi: %s", ap_info.ssid);
            fetch_time_from_wifi();
            return;
        }
        vTaskDelay(pdMS_TO_TICKS(500));
    }

    ESP_LOGW(TAG, "WiFi connection failed.");
}

// === Send gesture and timestamp to Firebase Realtime DB ===
void send_to_firebase(const char* gesture, time_t timestamp) {
    struct tm timeinfo;
    localtime_r(&timestamp, &timeinfo);

    char formattedTime[32];
    strftime(formattedTime, sizeof(formattedTime), "%Y-%m-%d %H:%M:%S", &timeinfo);

    // Prepare JSON payload
    char json[256];
    snprintf(json, sizeof(json),
        "{\"detected_sign\":\"%s\",\"timestamp\":%lld,\"readable_time\":\"%s\"}",
        gesture, (long long)timestamp, formattedTime);

    // Setup HTTP client with Firebase URL and certificate
    esp_http_client_config_t config = {
        .url = FIREBASE_URL,
        .method = HTTP_METHOD_POST,
        .cert_pem = (const char *)firebase_cert_pem_start,
    };

    esp_http_client_handle_t client = esp_http_client_init(&config);
    esp_http_client_set_header(client, "Content-Type", "application/json");
    esp_http_client_set_post_field(client, json, strlen(json));

    // Send the request
    esp_err_t err = esp_http_client_perform(client);
    if (err == ESP_OK) {
        ESP_LOGI(TAG, "Data sent to Firebase: %s", json);
    } else {
        ESP_LOGE(TAG, "Failed to send data: %s", esp_err_to_name(err));
    }

    esp_http_client_cleanup(client);
}

// === Main Application ===
void app_main(void) {
    // Setup GPIOs for switches
    for (int i = 0; i < 5; i++) {
        gpio_config_t io_conf = {
            .pin_bit_mask = (1ULL << switchPins[i]),
            .mode = GPIO_MODE_INPUT,
            .pull_up_en = GPIO_PULLUP_ENABLE,
        };
        gpio_config(&io_conf);
    }

    // Setup GPIO for buzzer
    gpio_config_t buzzer_conf = {
        .pin_bit_mask = (1ULL << BUZZER_GPIO),
        .mode = GPIO_MODE_OUTPUT,
    };
    gpio_config(&buzzer_conf);
    gpio_set_level(BUZZER_GPIO, 0);

    // Connect to WiFi
    wifi_init_sta();

    // Main loop
    char signal[6] = "", gesture[6] = "";
    while (1) {
        readGesture(signal);
        ESP_LOGI(TAG, "Read: %s", signal);

        if (strcmp(signal, startSignal) == 0) {
            ESP_LOGI(TAG, "Start signal detected!");
            beep_buzzer(1, 150, 0);
            vTaskDelay(pdMS_TO_TICKS(10000));
            readGesture(gesture);

            if (strcmp(gesture, startSignal) != 0 && strcmp(gesture, "00000") != 0) {
                ESP_LOGI(TAG, "Gesture detected: %s", gesture);
                beep_buzzer(2, 100, 150);

                // Get time and push to Firebase
                time_t now;
                time(&now);
                send_to_firebase(gesture, now);
            } else {
                ESP_LOGW(TAG, "Invalid gesture.");
            }
        }

        vTaskDelay(pdMS_TO_TICKS(300));  // Gesture polling delay
    }
}
