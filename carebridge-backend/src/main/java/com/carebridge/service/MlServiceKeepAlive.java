package com.carebridge.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
@Slf4j
public class MlServiceKeepAlive implements CommandLineRunner {

    private final RestTemplate restTemplate;

    @Value("${ml.service.base-url:http://localhost:8000}")
    private String mlServiceBaseUrl;

    @Override
    public void run(String... args) {
        // Trigger immediate background wake-up on startup
        triggerBackgroundPing();
    }

    @Scheduled(fixedRate = 600000) // 10 minutes in milliseconds
    public void keepAliveScheduled() {
        // Periodically ping to prevent ML service from sleeping while backend is active
        triggerBackgroundPing();
    }

    private void triggerBackgroundPing() {
        new Thread(() -> {
            try {
                String url = mlServiceBaseUrl;
                if (url != null && url.endsWith("/")) {
                    url = url.substring(0, url.length() - 1);
                }
                url = url + "/health";
                log.info("Sending background keep-alive ping to ML Service at: {}", url);
                restTemplate.getForObject(url, String.class);
            } catch (Exception e) {
                log.warn("Background keep-alive ping to ML Service failed: {}", e.getMessage());
            }
        }).start();
    }
}
