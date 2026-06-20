package com.aprovase.app.controller;

import com.aprovase.app.entity.Subject;
import com.aprovase.app.entity.User;
import com.aprovase.app.service.SubjectService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cycle")
public class CycleController {

    private final SubjectService service;

    public CycleController(SubjectService service) {
        this.service = service;
    }

    @GetMapping
    public List<Subject> getCycle(@AuthenticationPrincipal User user) {
        return service.generateCycle(user);
    }
}
