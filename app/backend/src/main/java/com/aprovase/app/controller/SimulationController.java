package com.aprovase.app.controller;

import com.aprovase.app.entity.Simulation;
import com.aprovase.app.entity.SimulationResult;
import com.aprovase.app.entity.User;
import com.aprovase.app.service.SimulationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/simulations")
public class SimulationController {

    private final SimulationService service;

    public SimulationController(SimulationService service) {
        this.service = service;
    }

    @GetMapping
    public List<Simulation> getAll(@AuthenticationPrincipal User user) {
        return service.findAll(user);
    }

    @PostMapping
    public Simulation create(@RequestBody Simulation simulation, @AuthenticationPrincipal User user) {
        return service.create(simulation, user);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal User user) {
        service.delete(id, user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/results")
    public SimulationResult addResult(@PathVariable Long id,
                                      @RequestBody SimulationResult result,
                                      @AuthenticationPrincipal User user) {
        return service.addResult(id, result, user);
    }

    @GetMapping("/{id}/results")
    public List<SimulationResult> getResults(@PathVariable Long id, @AuthenticationPrincipal User user) {
        return service.getResults(id, user);
    }

    @GetMapping("/comparison")
    public Map<String, Object> getComparison(@AuthenticationPrincipal User user) {
        return service.getComparison(user);
    }
}
