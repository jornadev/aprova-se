package com.aprovase.app.controller;

import com.aprovase.app.entity.Question;
import com.aprovase.app.entity.User;
import com.aprovase.app.service.QuestionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/questions")
public class QuestionController {

    private final QuestionService service;

    public QuestionController(QuestionService service) {
        this.service = service;
    }

    @GetMapping
    public List<Question> getAll(
            @RequestParam(required = false) Long subjectId,
            @AuthenticationPrincipal User user) {
        return service.findAll(user, subjectId);
    }

    @PostMapping
    public Question create(@RequestBody Question question, @AuthenticationPrincipal User user) {
        return service.create(question, user);
    }

    @PutMapping("/{id}")
    public Question update(@PathVariable Long id, @RequestBody Question question, @AuthenticationPrincipal User user) {
        return service.update(id, question, user);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal User user) {
        service.delete(id, user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/practice")
    public List<Question> practice(
            @RequestParam(required = false) Long subjectId,
            @RequestParam(defaultValue = "10") int count,
            @AuthenticationPrincipal User user) {
        return service.practice(user, subjectId, count);
    }

    @GetMapping("/count")
    public Long count(
            @RequestParam(required = false) Long subjectId,
            @AuthenticationPrincipal User user) {
        return service.count(user, subjectId);
    }
}
