package com.aprovase.app.controller;

import com.aprovase.app.entity.User;
import com.aprovase.app.service.DashboardService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    @GetMapping
    public Map<String, Object> getDashboard(@AuthenticationPrincipal User user) {
        return service.getDashboard(user);
    }
}
