package com.aprovase.app.controller;

import com.aprovase.app.entity.Subject;
import com.aprovase.app.entity.User;
import com.aprovase.app.service.SubjectService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/subjects")
public class SubjectController {

    private final SubjectService service;

    public SubjectController(SubjectService service) {
        this.service = service;
    }

    @GetMapping
    public List<Subject> getAll(@AuthenticationPrincipal User user) {
        return service.findAll(user);
    }

    @PostMapping
    public Subject create(@RequestBody Subject subject, @AuthenticationPrincipal User user) {
        return service.create(subject, user);
    }

    @PutMapping("/{id}")
    public Subject update(@PathVariable Long id,
                          @RequestBody Subject subject,
                          @AuthenticationPrincipal User user) {
        return service.update(id, subject, user);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal User user) {
        service.delete(id, user);
        return ResponseEntity.noContent().build();
    }
}
