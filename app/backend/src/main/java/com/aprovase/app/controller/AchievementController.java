package com.aprovase.app.controller;

import com.aprovase.app.entity.Achievement;
import com.aprovase.app.entity.User;
import com.aprovase.app.service.AchievementService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/achievements")
public class AchievementController {

    private final AchievementService service;

    public AchievementController(AchievementService service) {
        this.service = service;
    }

    @GetMapping
    public List<Achievement> getAll(@AuthenticationPrincipal User user) {
        return service.findAll(user);
    }

    @PostMapping("/check")
    public List<Achievement> check(@AuthenticationPrincipal User user) {
        return service.checkAndUnlock(user);
    }
}
