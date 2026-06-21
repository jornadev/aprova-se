package com.aprovase.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class EditalParserService {

    @Value("${gemini.api-key:}")
    private String apiKey;

    private static final int MAX_REQUESTS_PER_WEEK = 15;
    private static final long WEEK_MS = 7L * 24 * 60 * 60 * 1000;
    private final Map<String, List<Long>> requestLog = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    private void checkRateLimit(Long userId) {
        String key = String.valueOf(userId);
        long now = System.currentTimeMillis();
        long weekAgo = now - WEEK_MS;

        requestLog.compute(key, (k, timestamps) -> {
            if (timestamps == null) timestamps = new ArrayList<>();
            timestamps.removeIf(t -> t < weekAgo);
            return timestamps;
        });

        List<Long> timestamps = requestLog.get(key);
        if (timestamps != null && timestamps.size() >= MAX_REQUESTS_PER_WEEK) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Limite de " + MAX_REQUESTS_PER_WEEK + " análises por semana atingido. Tente novamente em alguns dias.");
        }

        requestLog.computeIfAbsent(key, k -> new ArrayList<>()).add(now);
    }

    public Map<String, Object> getUsage(Long userId) {
        String key = String.valueOf(userId);
        long now = System.currentTimeMillis();
        long weekAgo = now - WEEK_MS;

        requestLog.compute(key, (k, timestamps) -> {
            if (timestamps == null) return new ArrayList<>();
            timestamps.removeIf(t -> t < weekAgo);
            return timestamps;
        });

        int used = requestLog.getOrDefault(key, List.of()).size();
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("used", used);
        result.put("limit", MAX_REQUESTS_PER_WEEK);
        result.put("remaining", Math.max(0, MAX_REQUESTS_PER_WEEK - used));
        return result;
    }

    public List<Map<String, Object>> parse(String rawText, Long userId) {
        checkRateLimit(userId);
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Gemini API key not configured.");
        }

        String prompt = """
                Analise o texto abaixo, que é o conteúdo programático de um edital de concurso público brasileiro.
                Extraia as disciplinas e seus respectivos tópicos.

                Regras:
                - Identifique cada disciplina (matéria) e liste seus tópicos separadamente.
                - Remova numeração dos tópicos (ex: "1.", "1.1", "a)", "I -").
                - Mantenha o texto original dos tópicos, apenas removendo a numeração.
                - Se um tópico tiver subtópicos, liste cada subtópico como um tópico separado.
                - Retorne APENAS o JSON, sem markdown, sem explicação.

                Formato de resposta (JSON array):
                [
                  {
                    "name": "Nome da Disciplina",
                    "topics": ["Tópico 1", "Tópico 2", "Tópico 3"]
                  }
                ]

                Texto do edital:
                """ + rawText;

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of("responseMimeType", "application/json")
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-goog-api-key", apiKey);

        ResponseEntity<String> response = restTemplate.exchange(
                url, HttpMethod.POST, new HttpEntity<>(body, headers), String.class
        );

        try {
            JsonNode root = objectMapper.readTree(response.getBody());
            String text = root.at("/candidates/0/content/parts/0/text").asText();
            JsonNode parsed = objectMapper.readTree(text);

            List<Map<String, Object>> result = new ArrayList<>();
            for (JsonNode disc : parsed) {
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("name", disc.get("name").asText());
                List<String> topics = new ArrayList<>();
                for (JsonNode t : disc.get("topics")) {
                    topics.add(t.asText());
                }
                entry.put("topics", topics);
                result.add(entry);
            }
            return result;
        } catch (Exception e) {
            throw new RuntimeException("Erro ao processar resposta do Gemini: " + e.getMessage(), e);
        }
    }
}
