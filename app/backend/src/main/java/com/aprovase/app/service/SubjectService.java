package com.aprovase.app.service;

import com.aprovase.app.entity.Subject;
import com.aprovase.app.entity.User;
import com.aprovase.app.repository.StudySessionRepository;
import com.aprovase.app.repository.SubjectRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class SubjectService {

    private final SubjectRepository subjectRepository;
    private final StudySessionRepository sessionRepository;

    public SubjectService(SubjectRepository subjectRepository, StudySessionRepository sessionRepository) {
        this.subjectRepository = subjectRepository;
        this.sessionRepository = sessionRepository;
    }

    public List<Subject> findAll(User user) {
        return subjectRepository.findAllByUserOrderByPriorityDescWeeklyHoursDesc(user);
    }

    public Subject findById(Long id) {
        return subjectRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Subject not found: " + id));
    }

    public Subject create(Subject subject, User user) {
        validateSubject(subject);
        subject.setUser(user);
        return subjectRepository.save(subject);
    }

    private void validateSubject(Subject subject) {
        if (subject.getName() == null || subject.getName().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nome da disciplina é obrigatório");
        if (subject.getColor() == null || subject.getColor().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cor é obrigatória");
        if (subject.getPriority() == null || subject.getPriority() < 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Prioridade deve ser >= 0");
        if (subject.getWeeklyHours() == null || subject.getWeeklyHours() < 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Horas semanais deve ser >= 0");
    }

    public Subject update(Long id, Subject updated, User requester) {
        Subject subject = findById(id);
        if (!subject.getUser().getId().equals(requester.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (updated.getName() != null) subject.setName(updated.getName());
        if (updated.getColor() != null) subject.setColor(updated.getColor());
        if (updated.getPriority() != null) subject.setPriority(updated.getPriority());
        if (updated.getWeeklyHours() != null) subject.setWeeklyHours(updated.getWeeklyHours());
        return subjectRepository.save(subject);
    }

    public void delete(Long id, User requester) {
        Subject subject = findById(id);
        if (!subject.getUser().getId().equals(requester.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        subjectRepository.deleteById(id);
    }

    public List<Subject> generateCycle(User user) {
        List<Subject> subjects = subjectRepository.findAllByUserOrderByPriorityDescWeeklyHoursDesc(user);
        if (subjects.isEmpty()) return subjects;

        LocalDate today = LocalDate.now();
        LocalDateTime startOfWeek = today.with(DayOfWeek.MONDAY).atStartOfDay();
        LocalDateTime endOfWeek = today.with(DayOfWeek.SUNDAY).atTime(23, 59, 59);

        List<Object[]> weeklyBySubject = sessionRepository.sumDurationBySubject(user);
        Map<Long, Integer> studiedMinutes = new HashMap<>();
        for (Object[] row : weeklyBySubject) {
            Long subjectId = ((Number) row[0]).longValue();
            int minutes = ((Number) row[1]).intValue();
            studiedMinutes.put(subjectId, minutes);
        }

        subjects.sort((a, b) -> {
            double goalA = a.getWeeklyHours() != null ? a.getWeeklyHours() : 0;
            double goalB = b.getWeeklyHours() != null ? b.getWeeklyHours() : 0;
            double studiedA = (studiedMinutes.getOrDefault(a.getId(), 0)) / 60.0;
            double studiedB = (studiedMinutes.getOrDefault(b.getId(), 0)) / 60.0;
            double deficitA = goalA - studiedA;
            double deficitB = goalB - studiedB;

            if (Math.abs(deficitA - deficitB) > 0.01) return Double.compare(deficitB, deficitA);

            int prioA = a.getPriority() != null ? a.getPriority() : 0;
            int prioB = b.getPriority() != null ? b.getPriority() : 0;
            return Integer.compare(prioB, prioA);
        });

        return subjects;
    }
}
