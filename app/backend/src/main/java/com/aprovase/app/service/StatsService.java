package com.aprovase.app.service;

import com.aprovase.app.entity.Subject;
import com.aprovase.app.entity.User;
import com.aprovase.app.repository.StudySessionRepository;
import com.aprovase.app.repository.SubjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class StatsService {

    private final StudySessionRepository sessionRepository;
    private final SubjectRepository subjectRepository;

    public StatsService(StudySessionRepository sessionRepository, SubjectRepository subjectRepository) {
        this.sessionRepository = sessionRepository;
        this.subjectRepository = subjectRepository;
    }

    public List<Map<String, Object>> getWeeklyStats(User user) {
        List<Map<String, Object>> result = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-'W'ww");
        LocalDate today = LocalDate.now();
        for (int i = 7; i >= 0; i--) {
            LocalDate weekStart = today.minusWeeks(i).with(java.time.DayOfWeek.MONDAY);
            LocalDate weekEnd = weekStart.plusDays(6);
            Integer minutes = sessionRepository.sumDurationBetween(
                user, weekStart.atStartOfDay(), weekEnd.atTime(23, 59, 59));
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("week", weekStart.format(fmt));
            entry.put("weekLabel", weekStart.format(DateTimeFormatter.ofPattern("dd/MM")));
            entry.put("hours", Math.round((minutes / 60.0) * 100.0) / 100.0);
            result.add(entry);
        }
        return result;
    }

    public List<Map<String, Object>> getSubjectStats(User user) {
        List<Object[]> raw = sessionRepository.sumDurationBySubject(user);
        Map<Long, Subject> subjects = new HashMap<>();
        subjectRepository.findAllByUserOrderByPriorityDescWeeklyHoursDesc(user)
            .forEach(s -> subjects.put(s.getId(), s));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : raw) {
            Long subjectId = ((Number) row[0]).longValue();
            Integer minutes = ((Number) row[1]).intValue();
            Subject subject = subjects.get(subjectId);
            if (subject == null) continue;
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("subjectId", subjectId);
            entry.put("name", subject.getName());
            entry.put("color", subject.getColor());
            entry.put("hours", Math.round((minutes / 60.0) * 100.0) / 100.0);
            entry.put("minutes", minutes);
            result.add(entry);
        }
        return result;
    }

    public List<Map<String, Object>> getCalendarStats(User user) {
        LocalDateTime from = LocalDate.now().minusDays(365).atStartOfDay();
        List<Object[]> raw = sessionRepository.sumDurationByDay(user.getId(), from);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : raw) {
            String date = row[0].toString();
            Integer minutes = ((Number) row[1]).intValue();
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date", date);
            entry.put("minutes", minutes);
            result.add(entry);
        }
        return result;
    }

    public Map<String, Object> getSummary(User user) {
        Integer totalMinutes = sessionRepository.sumDurationAllTime(user);
        Long totalSessions   = sessionRepository.countCompleted(user);

        List<Object[]> qAll = sessionRepository.sumQuestionsAllTime(user);
        int totalCorrect = 0, totalWrong = 0;
        if (!qAll.isEmpty() && qAll.get(0) != null && qAll.get(0).length == 2) {
            if (qAll.get(0)[0] != null) totalCorrect = ((Number) qAll.get(0)[0]).intValue();
            if (qAll.get(0)[1] != null) totalWrong   = ((Number) qAll.get(0)[1]).intValue();
        }

        LocalDate today     = LocalDate.now();
        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        Long sessionsThisWeek = sessionRepository.countBetween(
            user, weekStart.atStartOfDay(), today.atTime(23, 59, 59));

        int totalQ = totalCorrect + totalWrong;
        double accuracy = totalQ > 0 ? Math.round((totalCorrect * 100.0 / totalQ) * 10.0) / 10.0 : 0;
        long avgSessionMin = totalSessions > 0 ? totalMinutes / totalSessions : 0;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalMinutes", totalMinutes);
        result.put("totalSessions", totalSessions);
        result.put("totalCorrect", totalCorrect);
        result.put("totalWrong", totalWrong);
        result.put("totalQuestions", totalQ);
        result.put("overallAccuracy", accuracy);
        result.put("sessionsThisWeek", sessionsThisWeek);
        result.put("avgSessionMin", avgSessionMin);
        return result;
    }

    public List<Map<String, Object>> getAccuracyTrend(User user) {
        List<Map<String, Object>> result = new ArrayList<>();
        LocalDate today = LocalDate.now();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM");
        for (int i = 7; i >= 0; i--) {
            LocalDate weekStart = today.minusWeeks(i).with(DayOfWeek.MONDAY);
            LocalDate weekEnd   = weekStart.plusDays(6);
            List<Object[]> q = sessionRepository.sumQuestionsBetween(
                user, weekStart.atStartOfDay(), weekEnd.atTime(23, 59, 59));
            int correct = 0, wrong = 0;
            if (!q.isEmpty() && q.get(0) != null && q.get(0).length == 2) {
                if (q.get(0)[0] != null) correct = ((Number) q.get(0)[0]).intValue();
                if (q.get(0)[1] != null) wrong   = ((Number) q.get(0)[1]).intValue();
            }
            int total = correct + wrong;
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("weekLabel", weekStart.format(fmt));
            entry.put("accuracy", total > 0 ? Math.round((correct * 100.0 / total) * 10.0) / 10.0 : null);
            entry.put("total", total);
            result.add(entry);
        }
        return result;
    }

    public List<Map<String, Object>> getAccuracyStats(User user) {
        List<Object[]> raw = sessionRepository.sumAccuracyBySubject(user);
        Map<Long, Subject> subjects = new HashMap<>();
        subjectRepository.findAllByUserOrderByPriorityDescWeeklyHoursDesc(user)
            .forEach(s -> subjects.put(s.getId(), s));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : raw) {
            Long subjectId = ((Number) row[0]).longValue();
            int correct = ((Number) row[1]).intValue();
            int wrong = ((Number) row[2]).intValue();
            Subject subject = subjects.get(subjectId);
            if (subject == null) continue;
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("subjectId", subjectId);
            entry.put("name", subject.getName());
            entry.put("color", subject.getColor());
            entry.put("correct", correct);
            entry.put("wrong", wrong);
            entry.put("total", correct + wrong);
            entry.put("accuracy", (correct + wrong) > 0 ? Math.round((correct * 100.0 / (correct + wrong)) * 10.0) / 10.0 : 0);
            result.add(entry);
        }
        return result;
    }
}
