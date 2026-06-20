package com.aprovase.app.controller;

import com.aprovase.app.entity.ExamPlan;
import com.aprovase.app.entity.Subject;
import com.aprovase.app.entity.User;
import com.aprovase.app.service.ExamPlanService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/exam-plans")
public class ExamPlanController {

    private final ExamPlanService service;

    public ExamPlanController(ExamPlanService service) {
        this.service = service;
    }

    @GetMapping("/available")
    public List<Map<String, Object>> listAvailable(@AuthenticationPrincipal User user) {
        return service.listAvailable(user);
    }

    @GetMapping
    public List<ExamPlan> getAll(@AuthenticationPrincipal User user) {
        return service.findAll(user);
    }

    @PostMapping("/{slug}/import")
    public ExamPlan importExam(@PathVariable String slug, @AuthenticationPrincipal User user) {
        return service.importExam(slug, user);
    }

    @GetMapping("/{id}/subjects")
    public List<Map<String, Object>> getSubjects(@PathVariable Long id, @AuthenticationPrincipal User user) {
        return service.getSubjectsWithProgress(id, user);
    }

    @GetMapping("/{id}/progress")
    public Map<String, Object> getProgress(@PathVariable Long id, @AuthenticationPrincipal User user) {
        return service.getOverallProgress(id, user);
    }

    @PostMapping("/custom")
    public Map<String, Object> createCustomPlan(@RequestBody Map<String, String> body,
                                                 @AuthenticationPrincipal User user) {
        String name = body.get("name");
        ExamPlan plan = service.createCustomPlan(name, user);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", plan.getId());
        result.put("slug", plan.getSlug());
        result.put("name", plan.getName());
        result.put("imported", true);
        result.put("custom", true);
        return result;
    }

    @PostMapping("/{planId}/subjects")
    public Subject createSubjectInPlan(@PathVariable Long planId,
                                        @RequestBody Subject subject,
                                        @AuthenticationPrincipal User user) {
        return service.createSubjectInPlan(planId, subject, user);
    }

    @PostMapping("/bulk-import")
    public Map<String, Object> bulkImport(@RequestBody Map<String, Object> body,
                                           @AuthenticationPrincipal User user) {
        String name = (String) body.get("name");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> subjects = (List<Map<String, Object>>) body.get("subjects");
        if (subjects == null || subjects.isEmpty()) {
            throw new IllegalArgumentException("Nenhuma disciplina encontrada no edital.");
        }
        return service.bulkImport(name, subjects, user);
    }

    @DeleteMapping("/{id}")
    public void deletePlan(@PathVariable Long id, @AuthenticationPrincipal User user) {
        service.deletePlan(id, user);
    }

    @PutMapping("/{id}/name")
    public Map<String, Object> renamePlan(@PathVariable Long id,
                                           @RequestBody Map<String, String> body,
                                           @AuthenticationPrincipal User user) {
        String name = body.get("name");
        ExamPlan plan = service.renamePlan(id, name, user);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", plan.getId());
        result.put("slug", plan.getSlug());
        result.put("name", plan.getName());
        return result;
    }
}
