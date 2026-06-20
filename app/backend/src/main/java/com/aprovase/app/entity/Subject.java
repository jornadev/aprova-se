package com.aprovase.app.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import com.aprovase.app.entity.User;

@Entity
@Table(name = "subjects")
public class Subject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String color;

    @Column(nullable = false)
    private Integer priority;

    @Column(nullable = false)
    private Double weeklyHours;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_plan_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private ExamPlan examPlan;

    @JsonIgnore
    @OneToMany(mappedBy = "subject", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StudySession> sessions = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "subject", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Topic> topics = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public Integer getPriority() { return priority; }
    public void setPriority(Integer priority) { this.priority = priority; }
    public Double getWeeklyHours() { return weeklyHours; }
    public void setWeeklyHours(Double weeklyHours) { this.weeklyHours = weeklyHours; }
    public List<StudySession> getSessions() { return sessions; }
    public List<Topic> getTopics() { return topics; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public ExamPlan getExamPlan() { return examPlan; }
    public void setExamPlan(ExamPlan examPlan) { this.examPlan = examPlan; }
}
