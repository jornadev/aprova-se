package com.aprovase.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class EditalParserService {

    @Value("${gemini.api-key:}")
    private String apiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    public List<Map<String, Object>> parse(String rawText) {
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
