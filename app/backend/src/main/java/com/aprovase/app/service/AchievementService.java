package com.aprovase.app.service;

import com.aprovase.app.entity.Achievement;
import com.aprovase.app.entity.Topic;
import com.aprovase.app.entity.User;
import com.aprovase.app.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class AchievementService {

    private final AchievementRepository achievementRepository;
    private final StudySessionRepository sessionRepository;
    private final TopicRepository topicRepository;
    private final SubjectRepository subjectRepository;
    private final SimulationRepository simulationRepository;
    private final NoteRepository noteRepository;

    public AchievementService(
        AchievementRepository achievementRepository,
        StudySessionRepository sessionRepository,
        TopicRepository topicRepository,
        SubjectRepository subjectRepository,
        SimulationRepository simulationRepository,
        NoteRepository noteRepository
    ) {
        this.achievementRepository = achievementRepository;
        this.sessionRepository = sessionRepository;
        this.topicRepository = topicRepository;
        this.subjectRepository = subjectRepository;
        this.simulationRepository = simulationRepository;
        this.noteRepository = noteRepository;
    }

    public List<Achievement> findAll(User user) {
        return achievementRepository.findByUserOrderByUnlockedAtDesc(user);
    }

    public List<Achievement> checkAndUnlock(User user) {
        List<Achievement> newlyUnlocked = new ArrayList<>();

        int streak = calculateStreak(user);
        checkBadge(user, "STREAK_7", streak >= 7, newlyUnlocked);
        checkBadge(user, "STREAK_30", streak >= 30, newlyUnlocked);
        checkBadge(user, "STREAK_100", streak >= 100, newlyUnlocked);

        Integer totalMinutes = sessionRepository.sumDurationAllTime(user);
        double totalHours = (totalMinutes != null ? totalMinutes : 0) / 60.0;
        checkBadge(user, "HOURS_10", totalHours >= 10, newlyUnlocked);
        checkBadge(user, "HOURS_50", totalHours >= 50, newlyUnlocked);
        checkBadge(user, "HOURS_100", totalHours >= 100, newlyUnlocked);
        checkBadge(user, "HOURS_500", totalHours >= 500, newlyUnlocked);

        Long sessionCount = sessionRepository.countCompleted(user);
        checkBadge(user, "SESSIONS_50", sessionCount >= 50, newlyUnlocked);
        checkBadge(user, "SESSIONS_100", sessionCount >= 100, newlyUnlocked);

        var subjects = subjectRepository.findAllByUserOrderByPriorityDescWeeklyHoursDesc(user);
        long totalTopics = 0;
        long studiedTopics = 0;
        for (var sub : subjects) {
            var topics = topicRepository.findBySubjectIdOrderByTitle(sub.getId());
            totalTopics += topics.size();
            studiedTopics += topics.stream().filter(t -> t.getStatus() != Topic.TopicStatus.NOT_STUDIED).count();
        }
        if (totalTopics > 0) {
            double pct = (studiedTopics * 100.0) / totalTopics;
            checkBadge(user, "EDITAL_25", pct >= 25, newlyUnlocked);
            checkBadge(user, "EDITAL_50", pct >= 50, newlyUnlocked);
            checkBadge(user, "EDITAL_100", pct >= 100, newlyUnlocked);
        }

        long simCount = simulationRepository.findByUserOrderByCreatedAtDesc(user).size();
        checkBadge(user, "FIRST_SIMULATION", simCount > 0, newlyUnlocked);

        long noteCount = noteRepository.countByUser(user);
        checkBadge(user, "FIRST_NOTE", noteCount > 0, newlyUnlocked);

        return newlyUnlocked;
    }

    private void checkBadge(User user, String type, boolean condition, List<Achievement> newlyUnlocked) {
        if (condition && !achievementRepository.existsByUserAndType(user, type)) {
            Achievement achievement = new Achievement();
            achievement.setUser(user);
            achievement.setType(type);
            achievement.setUnlockedAt(LocalDateTime.now());
            achievementRepository.save(achievement);
            newlyUnlocked.add(achievement);
        }
    }

    private int calculateStreak(User user) {
        int streak = 0;
        LocalDate date = LocalDate.now();
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
}
