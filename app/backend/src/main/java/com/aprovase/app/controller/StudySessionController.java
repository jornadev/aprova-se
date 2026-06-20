package com.aprovase.app.controller;

import com.aprovase.app.entity.StudySession;
import com.aprovase.app.entity.User;
import com.aprovase.app.service.StudySessionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/sessions")
public class StudySessionController {

    private final StudySessionService service;

    public StudySessionController(StudySessionService service) {
        this.service = service;
    }

    @PostMapping("/start")
    public StudySession start(@RequestBody Map<String, Long> body, @AuthenticationPrincipal User user) {
        return service.startSession(body.get("subjectId"), user);
    }

    @PostMapping("/{id}/stop")
    public StudySession stop(@PathVariable Long id,
                             @RequestBody(required = false) Map<String, Object> body,
                             @AuthenticationPrincipal User user) {
        String content = body != null ? (String) body.get("content") : null;
        Integer correct = body != null && body.get("correctAnswers") != null ? ((Number) body.get("correctAnswers")).intValue() : null;
        Integer wrong = body != null && body.get("wrongAnswers") != null ? ((Number) body.get("wrongAnswers")).intValue() : null;
        return service.stopSession(id, content, correct, wrong, user);
    }

    @PostMapping
    public StudySession createManual(@RequestBody StudySession session, @AuthenticationPrincipal User user) {
        return service.createManual(session, user);
    }

    @GetMapping
    public Page<StudySession> getHistory(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) Long subjectId,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
        @AuthenticationPrincipal User user
    ) {
        return service.findFiltered(user, subjectId, from, to, PageRequest.of(page, size));
    }

    @PutMapping("/{id}")
    public StudySession update(@PathVariable Long id,
                               @RequestBody StudySession session,
                               @AuthenticationPrincipal User user) {
        return service.update(id, session, user);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal User user) {
        service.delete(id, user);
        return ResponseEntity.noContent().build();
    }
}
