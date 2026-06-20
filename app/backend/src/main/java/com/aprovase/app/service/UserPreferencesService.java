package com.aprovase.app.service;

import com.aprovase.app.entity.User;
import com.aprovase.app.entity.UserPreferences;
import com.aprovase.app.repository.UserPreferencesRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class UserPreferencesService {

    private final UserPreferencesRepository repository;

    public UserPreferencesService(UserPreferencesRepository repository) {
        this.repository = repository;
    }

    public UserPreferences get(User user) {
        return repository.findByUser(user).orElseGet(() -> {
            UserPreferences prefs = new UserPreferences();
            prefs.setUser(user);
            return repository.save(prefs);
        });
    }

    public UserPreferences update(UserPreferences updated, User user) {
        UserPreferences prefs = get(user);
        if (updated.getDailyGoalHours() != null) prefs.setDailyGoalHours(updated.getDailyGoalHours());
        if (updated.getWeeklyGoalHours() != null) prefs.setWeeklyGoalHours(updated.getWeeklyGoalHours());
        if (updated.getWeeklyGoalQuestions() != null) prefs.setWeeklyGoalQuestions(updated.getWeeklyGoalQuestions());
        if (updated.getTheme() != null) prefs.setTheme(updated.getTheme());
        // targetExamDate can be explicitly set to null to clear it
        prefs.setTargetExamDate(updated.getTargetExamDate());
        if (updated.getMinAccuracyPercent() != null) prefs.setMinAccuracyPercent(updated.getMinAccuracyPercent());
        if (updated.getStudyDaysPerWeek() != null) prefs.setStudyDaysPerWeek(updated.getStudyDaysPerWeek());
        if (updated.getPomodoroFocusMin() != null) prefs.setPomodoroFocusMin(updated.getPomodoroFocusMin());
        if (updated.getPomodoroShortBreakMin() != null) prefs.setPomodoroShortBreakMin(updated.getPomodoroShortBreakMin());
        if (updated.getPomodoroLongBreakMin() != null) prefs.setPomodoroLongBreakMin(updated.getPomodoroLongBreakMin());
        prefs.setConcurso(updated.getConcurso());
        prefs.setEstado(updated.getEstado());
        if (updated.getAvatarColor() != null) prefs.setAvatarColor(updated.getAvatarColor());
        if (updated.getAvatarData() != null) prefs.setAvatarData(updated.getAvatarData());
        return repository.save(prefs);
    }
}
