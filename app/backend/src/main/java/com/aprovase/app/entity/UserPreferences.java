package com.aprovase.app.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import com.aprovase.app.entity.User;

@Entity
@Table(name = "user_preferences")
public class UserPreferences {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private Double dailyGoalHours = 4.0;

    @Column(nullable = false)
    private Double weeklyGoalHours = 20.0;

    @Column(nullable = false)
    private Integer weeklyGoalQuestions = 200;

    @Column(nullable = false)
    private String theme = "dark";

    @Column
    private String targetExamDate; // ISO date "2026-11-15"

    @Column(nullable = false)
    private Integer minAccuracyPercent = 70;

    @Column(nullable = false)
    private Integer studyDaysPerWeek = 5;

    @Column(nullable = false)
    private Integer pomodoroFocusMin = 25;

    @Column(nullable = false)
    private Integer pomodoroShortBreakMin = 5;

    @Column(nullable = false)
    private Integer pomodoroLongBreakMin = 15;

    @Column
    private String concurso;

    @Column(length = 2)
    private String estado;

    @Column(length = 20)
    private String avatarColor;

    @Column(columnDefinition = "TEXT")
    private String avatarData;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public Double getDailyGoalHours() { return dailyGoalHours; }
    public void setDailyGoalHours(Double v) { this.dailyGoalHours = v; }
    public Double getWeeklyGoalHours() { return weeklyGoalHours; }
    public void setWeeklyGoalHours(Double v) { this.weeklyGoalHours = v; }
    public Integer getWeeklyGoalQuestions() { return weeklyGoalQuestions; }
    public void setWeeklyGoalQuestions(Integer v) { this.weeklyGoalQuestions = v; }
    public String getTheme() { return theme; }
    public void setTheme(String v) { this.theme = v; }
    public String getTargetExamDate() { return targetExamDate; }
    public void setTargetExamDate(String v) { this.targetExamDate = v; }
    public Integer getMinAccuracyPercent() { return minAccuracyPercent; }
    public void setMinAccuracyPercent(Integer v) { this.minAccuracyPercent = v; }
    public Integer getStudyDaysPerWeek() { return studyDaysPerWeek; }
    public void setStudyDaysPerWeek(Integer v) { this.studyDaysPerWeek = v; }
    public Integer getPomodoroFocusMin() { return pomodoroFocusMin; }
    public void setPomodoroFocusMin(Integer v) { this.pomodoroFocusMin = v; }
    public Integer getPomodoroShortBreakMin() { return pomodoroShortBreakMin; }
    public void setPomodoroShortBreakMin(Integer v) { this.pomodoroShortBreakMin = v; }
    public Integer getPomodoroLongBreakMin() { return pomodoroLongBreakMin; }
    public void setPomodoroLongBreakMin(Integer v) { this.pomodoroLongBreakMin = v; }
    public String getConcurso() { return concurso; }
    public void setConcurso(String v) { this.concurso = v; }
    public String getEstado() { return estado; }
    public void setEstado(String v) { this.estado = v; }
    public String getAvatarColor() { return avatarColor; }
    public void setAvatarColor(String v) { this.avatarColor = v; }
    public String getAvatarData() { return avatarData; }
    public void setAvatarData(String v) { this.avatarData = v; }
}
