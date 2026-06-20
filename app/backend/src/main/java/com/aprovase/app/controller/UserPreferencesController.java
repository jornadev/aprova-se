package com.aprovase.app.controller;

import com.aprovase.app.entity.User;
import com.aprovase.app.entity.UserPreferences;
import com.aprovase.app.service.UserPreferencesService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/preferences")
public class UserPreferencesController {

    private final UserPreferencesService service;

    public UserPreferencesController(UserPreferencesService service) {
        this.service = service;
    }

    @GetMapping
    public UserPreferences get(@AuthenticationPrincipal User user) {
        return service.get(user);
    }

    @PutMapping
    public UserPreferences update(@RequestBody UserPreferences preferences, @AuthenticationPrincipal User user) {
        return service.update(preferences, user);
    }
}
