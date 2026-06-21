package com.aprovase.app.controller;

import com.aprovase.app.entity.Note;
import com.aprovase.app.entity.User;
import com.aprovase.app.service.NoteService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notes")
public class NoteController {

    private final NoteService service;

    public NoteController(NoteService service) {
        this.service = service;
    }

    @GetMapping
    public List<Note> getAll(
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) Long topicId,
            @AuthenticationPrincipal User user) {
        return service.findAll(user, subjectId, topicId);
    }

    @PostMapping
    public Note create(@RequestBody Note note, @AuthenticationPrincipal User user) {
        return service.create(note, user);
    }

    @PutMapping("/{id}")
    public Note update(@PathVariable Long id, @RequestBody Note note, @AuthenticationPrincipal User user) {
        return service.update(id, note, user);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal User user) {
        service.delete(id, user);
        return ResponseEntity.noContent().build();
    }
}
