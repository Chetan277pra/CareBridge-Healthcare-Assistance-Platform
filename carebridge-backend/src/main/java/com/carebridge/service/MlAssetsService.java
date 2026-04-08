package com.carebridge.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MlAssetsService {

    private final RestTemplate restTemplate;

    @Value("${ml.service.base-url:http://localhost:8000}")
    private String mlServiceBaseUrl;

    public List<String> getSymptoms() {
        return fetchList(mlServiceBaseUrl + "/assets/symptoms");
    }

    public List<String> getDiseases() {
        return fetchList(mlServiceBaseUrl + "/assets/diseases");
    }

    private List<String> fetchList(String url) {
        ResponseEntity<List<String>> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<>() {}
        );
        return response.getBody() != null ? response.getBody() : Collections.emptyList();
    }
}
