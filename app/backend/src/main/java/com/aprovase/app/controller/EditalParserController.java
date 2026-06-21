package com.aprovase.app.controller;

import com.aprovase.app.entity.User;
import com.aprovase.app.service.EditalParserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/edital-parser")
public class EditalParserController {

    private final EditalParserService parserService;

    public EditalParserController(EditalParserService parserService) {
        this.parserService = parserService;
    }

    @PostMapping
    public ResponseEntity<List<Map<String, Object>>> parse(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User user) {
        String text = body.get("text");
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("Texto do edital é obrigatório.");
        }
        return ResponseEntity.ok(parserService.parse(text, user.getId()));
    }

    @GetMapping("/usage")
    public ResponseEntity<Map<String, Object>> getUsage(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(parserService.getUsage(user.getId()));
    }
}
