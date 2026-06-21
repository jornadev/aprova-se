package com.aprovase.app.service;

import com.aprovase.app.entity.Subject;
import com.aprovase.app.entity.User;
import com.aprovase.app.entity.WeeklyPlan;
import com.aprovase.app.repository.StudySessionRepository;
import com.aprovase.app.repository.SubjectRepository;
import com.aprovase.app.repository.WeeklyPlanRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;

@Service
@Transactional
public class WeeklyPlanService {

    private final WeeklyPlanRepository planRepository;
    private final SubjectRepository subjectRepository;
    private final StudySessionRepository sessionRepository;

    public WeeklyPlanService(
        WeeklyPlanRepository planRepository,
        SubjectRepository subjectRepository,
        StudySessionRepository sessionRepository
    ) {
        this.planRepository = planRepository;
        this.subjectRepository = subjectRepository;
        this.sessionRepository = sessionRepository;
    }

    public List<WeeklyPlan> findAll(User user) {
        return planRepository.findByUser(user);
    }

    public WeeklyPlan create(WeeklyPlan plan, User user) {
        if (plan.getDayOfWeek() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dia da semana é obrigatório");
        if (plan.getSubject() == null || plan.getSubject().getId() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Disciplina é obrigatória");
        if (plan.getTargetMinutes() == null || plan.getTargetMinutes() < 15)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duração mínima é 15 minutos");

        Subject subject = subjectRepository.findById(plan.getSubject().getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Disciplina não encontrada"));
        plan.setSubject(subject);
        plan.setUser(user);
        return planRepository.save(plan);
    }

    public void delete(Long id, User requester) {
        WeeklyPlan plan = planRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Plan not found"));
        if (!plan.getUser().getId().equals(requester.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        planRepository.deleteById(id);
    }

    public WeeklyPlan update(Long id, WeeklyPlan patch, User requester) {
        WeeklyPlan plan = planRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Plan not found"));
        if (!plan.getUser().getId().equals(requester.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (patch.getDayOfWeek() != null)    plan.setDayOfWeek(patch.getDayOfWeek());
        if (patch.getTargetMinutes() != null) plan.setTargetMinutes(patch.getTargetMinutes());
        return planRepository.save(plan);
    }

    public Map<String, Object> getProgress(User user) {
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        LocalDate weekEnd = today.with(DayOfWeek.SUNDAY);

        List<WeeklyPlan> plans = planRepository.findByUser(user);
        int totalTarget = plans.stream().mapToInt(WeeklyPlan::getTargetMinutes).sum();

        Integer studiedMinutes = sessionRepository.sumDurationBetween(
            user, weekStart.atStartOfDay(), weekEnd.atTime(23, 59, 59));

        double progress = totalTarget > 0 ? Math.min(100.0, (studiedMinutes * 100.0) / totalTarget) : 0;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalTargetMinutes", totalTarget);
        result.put("studiedMinutes", studiedMinutes);
        result.put("progressPercent", Math.round(progress * 10.0) / 10.0);
        return result;
    }
}
