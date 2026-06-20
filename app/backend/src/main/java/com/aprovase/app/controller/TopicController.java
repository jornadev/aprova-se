package com.aprovase.app.controller;

import com.aprovase.app.entity.Topic;
import com.aprovase.app.entity.User;
import com.aprovase.app.service.TopicService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class TopicController {

    private final TopicService service;

    public TopicController(TopicService service) {
        this.service = service;
    }

    @GetMapping("/subjects/{subjectId}/topics")
    public List<Topic> getBySubject(@PathVariable Long subjectId, @AuthenticationPrincipal User user) {
        return service.findBySubject(subjectId, user);
    }

    @PostMapping("/subjects/{subjectId}/topics")
    public Topic create(@PathVariable Long subjectId,
                        @RequestBody Topic topic,
                        @AuthenticationPrincipal User user) {
        return service.create(subjectId, topic, user);
    }

    @PutMapping("/topics/{id}")
    public Topic update(@PathVariable Long id,
                        @RequestBody Topic topic,
                        @AuthenticationPrincipal User user) {
        return service.update(id, topic, user);
    }

    @DeleteMapping("/topics/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal User user) {
        service.delete(id, user);
        return ResponseEntity.noContent().build();
    }
}
