package com.aprovase.app.controller;

import com.aprovase.app.entity.User;
import com.aprovase.app.service.StatsService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final StatsService service;

    public StatsController(StatsService service) {
        this.service = service;
    }

    @GetMapping("/weekly")
    public List<Map<String, Object>> getWeekly(@AuthenticationPrincipal User user) {
        return service.getWeeklyStats(user);
    }

    @GetMapping("/subjects")
    public List<Map<String, Object>> getSubjects(@AuthenticationPrincipal User user) {
        return service.getSubjectStats(user);
    }

    @GetMapping("/calendar")
    public List<Map<String, Object>> getCalendar(@AuthenticationPrincipal User user) {
        return service.getCalendarStats(user);
    }

    @GetMapping("/accuracy")
    public List<Map<String, Object>> getAccuracy(@AuthenticationPrincipal User user) {
        return service.getAccuracyStats(user);
    }

    @GetMapping("/summary")
    public Map<String, Object> getSummary(@AuthenticationPrincipal User user) {
        return service.getSummary(user);
    }

    @GetMapping("/accuracy-trend")
    public List<Map<String, Object>> getAccuracyTrend(@AuthenticationPrincipal User user) {
        return service.getAccuracyTrend(user);
    }
}
