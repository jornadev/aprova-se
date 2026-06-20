package com.aprovase.app.controller;

import com.aprovase.app.entity.Revision;
import com.aprovase.app.entity.User;
import com.aprovase.app.service.RevisionService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/revisions")
public class RevisionController {

    private final RevisionService service;

    public RevisionController(RevisionService service) {
        this.service = service;
    }

    @GetMapping("/today")
    public List<Revision> getToday(@AuthenticationPrincipal User user) {
        return service.getToday(user);
    }

    @GetMapping("/pending")
    public List<Revision> getPending(@AuthenticationPrincipal User user) {
        return service.getPending(user);
    }

    @PostMapping("/{id}/complete")
    public Revision complete(@PathVariable Long id, @AuthenticationPrincipal User user) {
        return service.complete(id, user);
    }
}
