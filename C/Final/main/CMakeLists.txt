idf_component_register(
    SRCS "main.c"
    INCLUDE_DIRS "."
    EMBED_TXTFILES firebase_cert.pem
    REQUIRES
        nvs_flash
        esp_wifi
        esp_netif
        esp_event
        esp_http_client
        lwip
        driver
)
