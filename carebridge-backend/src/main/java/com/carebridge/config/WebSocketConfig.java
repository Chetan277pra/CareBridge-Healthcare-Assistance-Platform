package com.carebridge.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Configures STOMP over SockJS for real-time appointment notifications.
 *
 * Endpoints:
 *   ws://localhost:8080/ws  (SockJS fallback)
 *
 * Client subscribes to:
 *   /topic/appointments          — broadcast for all clients (provider dashboards)
 *   /user/queue/updates          — per-user updates (patient-specific)
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("http://localhost:5173", "http://localhost:*")
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Prefix for messages routed to @MessageMapping methods
        config.setApplicationDestinationPrefixes("/app");

        // Enable in-memory broker for /topic (broadcast) and /user (point-to-point)
        config.enableSimpleBroker("/topic", "/user");

        // Prefix used by the broker for user-specific destinations
        config.setUserDestinationPrefix("/user");
    }
}
