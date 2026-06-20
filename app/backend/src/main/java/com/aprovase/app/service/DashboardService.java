package com.aprovase.app.service;

import com.aprovase.app.entity.Subject;
import com.aprovase.app.entity.User;
import com.aprovase.app.repository.RevisionRepository;
import com.aprovase.app.repository.StudySessionRepository;
import com.aprovase.app.repository.SubjectRepository;
import com.aprovase.app.repository.UserPreferencesRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final StudySessionRepository sessionRepository;
    private final RevisionRepository revisionRepository;
    private final SubjectRepository subjectRepository;
    private final UserPreferencesRepository preferencesRepository;

    public DashboardService(
        StudySessionRepository sessionRepository,
        RevisionRepository revisionRepository,
        SubjectRepository subjectRepository,
        UserPreferencesRepository preferencesRepository
    ) {
        this.sessionRepository = sessionRepository;
        this.revisionRepository = revisionRepository;
        this.subjectRepository = subjectRepository;
        this.preferencesRepository = preferencesRepository;
    }

    public Map<String, Object> getDashboard(User user) {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(23, 59, 59);

        LocalDateTime startOfWeek = today.with(DayOfWeek.MONDAY).atStartOfDay();
        LocalDateTime endOfWeek = today.with(DayOfWeek.SUNDAY).atTime(23, 59, 59);

        LocalDateTime startOfMonth = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime endOfMonth = today.withDayOfMonth(today.lengthOfMonth()).atTime(23, 59, 59);

        Integer minutesToday = sessionRepository.sumDurationBetween(user, startOfDay, endOfDay);
        Integer minutesWeek = sessionRepository.sumDurationBetween(user, startOfWeek, endOfWeek);
        Integer minutesMonth = sessionRepository.sumDurationBetween(user, startOfMonth, endOfMonth);

        double hoursToday = minutesToday / 60.0;
        double hoursWeek = minutesWeek / 60.0;
        double hoursMonth = minutesMonth / 60.0;

        int todayRevisions = revisionRepository.findByUserAndScheduledDateAndCompletedAtIsNull(user, today).size();

        int currentStreak = calculateStreak(user, today);

        double weeklyGoal = preferencesRepository.findByUser(user)
            .map(p -> p.getWeeklyGoalHours()).orElse(20.0);
        double weeklyGoalProgress = weeklyGoal > 0 ? Math.min(100.0, (hoursWeek / weeklyGoal) * 100) : 0;

        List<Map<String, Object>> last7Days = getLast7Days(user, today);

        String nextSubject = subjectRepository.findAllByUserOrderByPriorityDescWeeklyHoursDesc(user)
            .stream().findFirst().map(Subject::getName).orElse(null);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("hoursToday", Math.round(hoursToday * 100.0) / 100.0);
        result.put("hoursWeek", Math.round(hoursWeek * 100.0) / 100.0);
        result.put("hoursMonth", Math.round(hoursMonth * 100.0) / 100.0);
        result.put("currentStreak", currentStreak);
        result.put("todayRevisions", todayRevisions);
        result.put("weeklyGoalProgress", Math.round(weeklyGoalProgress * 10.0) / 10.0);
        result.put("last7Days", last7Days);
        result.put("nextSubjectInCycle", nextSubject);
        return result;
    }

    private int calculateStreak(User user, LocalDate today) {
        int streak = 0;
        LocalDate date = today;
        while (true) {
            LocalDateTime start = date.atStartOfDay();
            LocalDateTime end = date.atTime(23, 59, 59);
            Integer minutes = sessionRepository.sumDurationBetween(user, start, end);
            if (minutes == null || minutes == 0) break;
            streak++;
            date = date.minusDays(1);
        }
        return streak;
    }

    private List<Map<String, Object>> getLast7Days(User user, LocalDate today) {
        List<Map<String, Object>> result = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            LocalDateTime start = date.atStartOfDay();
            LocalDateTime end = date.atTime(23, 59, 59);
            Integer minutes = sessionRepository.sumDurationBetween(user, start, end);
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("date", date.format(fmt));
            entry.put("hours", Math.round((minutes / 60.0) * 100.0) / 100.0);
            result.add(entry);
        }
        return result;
    }
}
