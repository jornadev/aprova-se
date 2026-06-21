package com.aprovase.app.service;

import com.aprovase.app.entity.Simulation;
import com.aprovase.app.entity.SimulationResult;
import com.aprovase.app.entity.Subject;
import com.aprovase.app.entity.User;
import com.aprovase.app.repository.SimulationRepository;
import com.aprovase.app.repository.SimulationResultRepository;
import com.aprovase.app.repository.SubjectRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
@Transactional
public class SimulationService {

    private final SimulationRepository simulationRepository;
    private final SimulationResultRepository resultRepository;
    private final SubjectRepository subjectRepository;

    public SimulationService(
        SimulationRepository simulationRepository,
        SimulationResultRepository resultRepository,
        SubjectRepository subjectRepository
    ) {
        this.simulationRepository = simulationRepository;
        this.resultRepository = resultRepository;
        this.subjectRepository = subjectRepository;
    }

    public List<Simulation> findAll(User user) {
        return simulationRepository.findByUserOrderByCreatedAtDesc(user);
    }

    public Simulation create(Simulation simulation, User user) {
        simulation.setUser(user);
        return simulationRepository.save(simulation);
    }

    public void delete(Long id, User requester) {
        Simulation simulation = simulationRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Simulation not found: " + id));
        if (!simulation.getUser().getId().equals(requester.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        simulationRepository.deleteById(id);
    }

    public SimulationResult addResult(Long simulationId, SimulationResult result, User requester) {
        Simulation simulation = simulationRepository.findById(simulationId)
            .orElseThrow(() -> new RuntimeException("Simulation not found: " + simulationId));
        if (!simulation.getUser().getId().equals(requester.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        Subject subject = subjectRepository.findById(result.getSubject().getId())
            .orElseThrow(() -> new RuntimeException("Subject not found"));
        result.setSimulation(simulation);
        result.setSubject(subject);
        return resultRepository.save(result);
    }

    public List<SimulationResult> getResults(Long simulationId, User requester) {
        Simulation simulation = simulationRepository.findById(simulationId)
            .orElseThrow(() -> new RuntimeException("Simulation not found: " + simulationId));
        if (!simulation.getUser().getId().equals(requester.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return resultRepository.findBySimulationId(simulationId);
    }

    public Map<String, Object> getComparison(User user) {
        List<Simulation> simulations = simulationRepository.findByUserOrderByCreatedAtDesc(user);
        List<Map<String, Object>> items = new ArrayList<>();

        for (Simulation sim : simulations) {
            List<SimulationResult> results = resultRepository.findBySimulationId(sim.getId());
            int totalCorrect = 0, totalQuestions = 0;
            List<Map<String, Object>> subjectResults = new ArrayList<>();

            for (SimulationResult r : results) {
                totalCorrect += r.getCorrect();
                totalQuestions += r.getTotal();
                Map<String, Object> sr = new LinkedHashMap<>();
                sr.put("subjectName", r.getSubject().getName());
                sr.put("correct", r.getCorrect());
                sr.put("total", r.getTotal());
                sr.put("pct", r.getTotal() > 0 ? Math.round((r.getCorrect() * 100.0) / r.getTotal() * 10.0) / 10.0 : 0);
                subjectResults.add(sr);
            }

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("simulationId", sim.getId());
            entry.put("name", sim.getName());
            entry.put("examDate", sim.getExamDate());
            entry.put("createdAt", sim.getCreatedAt());
            entry.put("totalCorrect", totalCorrect);
            entry.put("totalQuestions", totalQuestions);
            entry.put("percentage", totalQuestions > 0 ? Math.round((totalCorrect * 100.0) / totalQuestions * 10.0) / 10.0 : 0);
            entry.put("results", subjectResults);
            items.add(entry);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("simulations", items);
        result.put("total", items.size());
        return result;
    }
}
