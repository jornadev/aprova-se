package com.aprovase.app.controller;

import com.aprovase.app.entity.User;
import com.aprovase.app.entity.WeeklyPlan;
import com.aprovase.app.service.WeeklyPlanService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/weekly-plan")
public class WeeklyPlanController {

    private final WeeklyPlanService service;

    public WeeklyPlanController(WeeklyPlanService service) {
        this.service = service;
    }

    @GetMapping
    public List<WeeklyPlan> getAll(@AuthenticationPrincipal User user) {
        return service.findAll(user);
    }

    @PostMapping
    public WeeklyPlan create(@RequestBody WeeklyPlan plan, @AuthenticationPrincipal User user) {
        return service.create(plan, user);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal User user) {
        service.delete(id, user);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    public WeeklyPlan update(@PathVariable Long id,
                             @RequestBody WeeklyPlan plan,
                             @AuthenticationPrincipal User user) {
        return service.update(id, plan, user);
    }

    @GetMapping("/progress")
    public Map<String, Object> getProgress(@AuthenticationPrincipal User user) {
        return service.getProgress(user);
    }
}
