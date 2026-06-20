package com.aprovase.app.service;

import com.aprovase.app.entity.ExamPlan;
import com.aprovase.app.entity.Subject;
import com.aprovase.app.entity.Topic;
import com.aprovase.app.entity.User;
import com.aprovase.app.repository.ExamPlanRepository;
import com.aprovase.app.repository.SubjectRepository;
import com.aprovase.app.repository.TopicRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import jakarta.persistence.EntityManager;
import java.io.InputStream;
import java.util.*;

@Service
@Transactional
public class ExamPlanService {

    private final ExamPlanRepository examPlanRepository;
    private final SubjectRepository subjectRepository;
    private final TopicRepository topicRepository;
    private final ObjectMapper objectMapper;
    private final EntityManager entityManager;

    public ExamPlanService(ExamPlanRepository examPlanRepository,
                           SubjectRepository subjectRepository,
                           TopicRepository topicRepository,
                           ObjectMapper objectMapper,
                           EntityManager entityManager) {
        this.examPlanRepository = examPlanRepository;
        this.subjectRepository = subjectRepository;
        this.topicRepository = topicRepository;
        this.objectMapper = objectMapper;
        this.entityManager = entityManager;
    }

    public List<Map<String, Object>> listAvailable(User user) {
        List<Map<String, Object>> result = new ArrayList<>();
        Set<Long> seenIds = new HashSet<>();
        try {
            PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
            Resource[] resources = resolver.getResources("classpath:exams/*.json");
            for (Resource res : resources) {
                try (InputStream is = res.getInputStream()) {
                    JsonNode node = objectMapper.readTree(is);
                    String slug = node.get("slug").asText();
                    Map<String, Object> info = new LinkedHashMap<>();
                    info.put("slug", slug);
                    info.put("name", node.get("name").asText());
                    info.put("organization", node.path("organization").asText(""));
                    info.put("year", node.path("year").asInt(0));
                    info.put("custom", false);

                    Optional<ExamPlan> plan = examPlanRepository.findBySlug(slug);
                    boolean imported = plan.isPresent() &&
                        subjectRepository.existsByUserAndExamPlanId(user, plan.get().getId());
                    info.put("imported", imported);
                    if (imported) {
                        plan.ifPresent(ep -> {
                            info.put("id", ep.getId());
                            seenIds.add(ep.getId());
                        });
                    }
                    result.add(info);
                }
            }
        } catch (Exception ignored) {
            // No exam files on classpath — skip
        }

        // Append custom plans (plans with subjects but not from any JSON file)
        List<ExamPlan> userPlans = subjectRepository.findDistinctExamPlansByUser(user);
        for (ExamPlan ep : userPlans) {
            if (!seenIds.contains(ep.getId())) {
                Map<String, Object> info = new LinkedHashMap<>();
                info.put("id", ep.getId());
                info.put("slug", ep.getSlug());
                info.put("name", ep.getName());
                info.put("organization", ep.getOrganization() != null ? ep.getOrganization() : "");
                info.put("year", ep.getYear() != null ? ep.getYear() : 0);
                info.put("imported", true);
                info.put("custom", true);
                result.add(info);
            }
        }

        return result;
    }

    public void deletePlan(Long id, User user) {
        List<Subject> subjects = subjectRepository.findByUserAndExamPlanIdOrderByNameAsc(user, id);
        if (subjects.isEmpty()) return;
        List<Long> subjectIds = subjects.stream().map(Subject::getId).toList();

        entityManager.createNativeQuery("DELETE FROM revisions WHERE subject_id IN (:ids)")
                .setParameter("ids", subjectIds).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM weekly_plans WHERE subject_id IN (:ids)")
                .setParameter("ids", subjectIds).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM simulation_results WHERE subject_id IN (:ids)")
                .setParameter("ids", subjectIds).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM study_sessions WHERE subject_id IN (:ids)")
                .setParameter("ids", subjectIds).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM topics WHERE subject_id IN (:ids)")
                .setParameter("ids", subjectIds).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM subjects WHERE id IN (:ids)")
                .setParameter("ids", subjectIds).executeUpdate();

        try {
            examPlanRepository.deleteById(id);
        } catch (Exception ignored) {
        }
    }

    public ExamPlan createCustomPlan(String name, User user) {
        ExamPlan plan = new ExamPlan();
        plan.setSlug("custom-" + java.util.UUID.randomUUID().toString().substring(0, 8));
        plan.setName(name);
        plan.setOrganization("");
        plan.setYear(0);
        return examPlanRepository.save(plan);
    }

    public Subject createSubjectInPlan(Long planId, Subject subject, User user) {
        ExamPlan plan = examPlanRepository.findById(planId)
            .orElseThrow(() -> new RuntimeException("ExamPlan not found: " + planId));
        subject.setExamPlan(plan);
        subject.setUser(user);
        return subjectRepository.save(subject);
    }

    public ExamPlan renamePlan(Long id, String name, User requester) {
        ExamPlan plan = examPlanRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("ExamPlan not found: " + id));
        if (!subjectRepository.existsByUserAndExamPlanId(requester, id)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        plan.setName(name);
        return examPlanRepository.save(plan);
    }

    public List<ExamPlan> findAll(User user) {
        return subjectRepository.findDistinctExamPlansByUser(user);
    }

    public ExamPlan importExam(String slug, User user) {
        try {
            PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
            Resource res = resolver.getResource("classpath:exams/" + slug + ".json");
            try (InputStream is = res.getInputStream()) {
                JsonNode root = objectMapper.readTree(is);

                ExamPlan plan = examPlanRepository.findBySlug(slug).orElseGet(ExamPlan::new);
                plan.setSlug(slug);
                plan.setName(root.get("name").asText());
                plan.setOrganization(root.path("organization").asText(""));
                plan.setYear(root.path("year").asInt(0));
                final ExamPlan savedPlan = examPlanRepository.save(plan);

                JsonNode subjectsNode = root.get("subjects");

                if (subjectsNode != null && subjectsNode.isArray()) {
                    Set<String> jsonSubjectNames = new HashSet<>();
                    for (JsonNode sn : subjectsNode) jsonSubjectNames.add(sn.get("name").asText());

                    for (Subject s : subjectRepository.findByUserAndExamPlanIdOrderByNameAsc(user, savedPlan.getId())) {
                        if (!jsonSubjectNames.contains(s.getName())) {
                            topicRepository.deleteAll(topicRepository.findBySubjectIdOrderByTitle(s.getId()));
                            subjectRepository.delete(s);
                        }
                    }
                }

                if (subjectsNode != null && subjectsNode.isArray()) {
                    for (JsonNode subjectNode : subjectsNode) {
                        String subjectName = subjectNode.get("name").asText();
                        String color = subjectNode.path("color").asText("#3b82f6");

                        Subject subject = subjectRepository
                            .findByUserAndNameAndExamPlanId(user, subjectName, savedPlan.getId())
                            .orElseGet(() -> {
                                Subject s = new Subject();
                                s.setName(subjectName);
                                s.setColor(color);
                                s.setPriority(3);
                                s.setWeeklyHours(4.0);
                                s.setExamPlan(savedPlan);
                                s.setUser(user);
                                return subjectRepository.save(s);
                            });

                        JsonNode topicsNode = subjectNode.get("topics");
                        if (topicsNode != null && topicsNode.isArray()) {
                            List<Topic> existingTopics = topicRepository.findBySubjectIdOrderByTitle(subject.getId());
                            Map<String, Topic> existingByTitle = new HashMap<>();
                            existingTopics.forEach(t -> existingByTitle.put(t.getTitle(), t));

                            Set<String> newTitles = new HashSet<>();
                            for (JsonNode topicNode : topicsNode) newTitles.add(topicNode.asText());

                            for (Topic t : existingTopics) {
                                if (!newTitles.contains(t.getTitle())) topicRepository.delete(t);
                            }

                            for (String title : newTitles) {
                                if (!existingByTitle.containsKey(title)) {
                                    Topic topic = new Topic();
                                    topic.setSubject(subject);
                                    topic.setTitle(title);
                                    topic.setStatus(Topic.TopicStatus.NOT_STUDIED);
                                    topicRepository.save(topic);
                                }
                            }
                        }
                    }
                }
                return savedPlan;
            }
        } catch (Exception e) {
            throw new RuntimeException("Erro ao importar edital '" + slug + "': " + e.getMessage(), e);
        }
    }

    public Map<String, Object> bulkImport(String name, List<Map<String, Object>> subjectsData, User user) {
        String[] palette = {"#7c3aed","#3b82f6","#22c55e","#f59e0b","#ef4444","#06b6d4","#ec4899","#f97316"};

        ExamPlan plan = new ExamPlan();
        plan.setSlug("custom-" + java.util.UUID.randomUUID().toString().substring(0, 8));
        String planName = name != null && !name.isBlank() ? name.trim() : "Edital personalizado";
        if (planName.length() > 250) planName = planName.substring(0, 250);
        plan.setName(planName);
        plan.setOrganization("");
        plan.setYear(0);
        final ExamPlan savedPlan = examPlanRepository.save(plan);

        int colorIdx = 0;
        for (Map<String, Object> subjectData : subjectsData) {
            Object nameObj = subjectData.get("name");
            String subjectName = nameObj != null ? nameObj.toString().trim() : "";
            if (subjectName.isBlank()) continue;
            if (subjectName.length() > 250) subjectName = subjectName.substring(0, 250);

            String color = (String) subjectData.get("color");
            if (color == null || color.isBlank()) {
                color = palette[colorIdx % palette.length];
            }
            colorIdx++;

            Subject subject = new Subject();
            subject.setName(subjectName);
            subject.setColor(color);
            subject.setPriority(3);
            subject.setWeeklyHours(4.0);
            subject.setExamPlan(savedPlan);
            subject.setUser(user);
            Subject savedSubject = subjectRepository.save(subject);

            Object topicsRaw = subjectData.get("topics");
            if (topicsRaw instanceof List<?> topicList) {
                for (Object item : topicList) {
                    String title = item != null ? item.toString().trim() : "";
                    if (title.isBlank()) continue;
                    if (title.length() > 255) title = title.substring(0, 255);
                    Topic topic = new Topic();
                    topic.setSubject(savedSubject);
                    topic.setTitle(title);
                    topic.setStatus(Topic.TopicStatus.NOT_STUDIED);
                    topicRepository.save(topic);
                }
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", savedPlan.getId());
        result.put("slug", savedPlan.getSlug());
        result.put("name", savedPlan.getName());
        result.put("imported", true);
        result.put("custom", true);
        return result;
    }

    public void importAllForUser(User user) {
        try {
            PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
            Resource[] resources = resolver.getResources("classpath:exams/*.json");
            for (Resource res : resources) {
                try (InputStream is = res.getInputStream()) {
                    JsonNode node = objectMapper.readTree(is);
                    importExam(node.get("slug").asText(), user);
                }
            }
        } catch (Exception ignored) {
            // No exam files found — skip auto-import
        }
    }

    public List<Map<String, Object>> getSubjectsWithProgress(Long examPlanId, User user) {
        List<Subject> subjects = subjectRepository.findByUserAndExamPlanIdOrderByNameAsc(user, examPlanId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Subject s : subjects) {
            List<Topic> topics = topicRepository.findBySubjectIdOrderByTitle(s.getId());
            long notStudied = topics.stream().filter(t -> t.getStatus() == Topic.TopicStatus.NOT_STUDIED).count();
            long studied = topics.stream().filter(t -> t.getStatus() == Topic.TopicStatus.STUDIED).count();
            long mastered = topics.stream().filter(t -> t.getStatus() == Topic.TopicStatus.MASTERED).count();

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id", s.getId());
            entry.put("name", s.getName());
            entry.put("color", s.getColor());
            entry.put("totalTopics", topics.size());
            entry.put("notStudied", notStudied);
            entry.put("studied", studied);
            entry.put("mastered", mastered);
            entry.put("completedTopics", studied + mastered);
            entry.put("progressPercent", topics.isEmpty() ? 0 :
                Math.round(((studied + mastered) * 100.0 / topics.size()) * 10.0) / 10.0);
            entry.put("topics", topics);
            result.add(entry);
        }
        return result;
    }

    public Map<String, Object> getOverallProgress(Long examPlanId, User user) {
        List<Subject> subjects = subjectRepository.findByUserAndExamPlanIdOrderByNameAsc(user, examPlanId);
        int total = 0, completed = 0;
        for (Subject s : subjects) {
            List<Topic> topics = topicRepository.findBySubjectIdOrderByTitle(s.getId());
            total += topics.size();
            completed += topics.stream().filter(t -> t.getStatus() != Topic.TopicStatus.NOT_STUDIED).count();
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalTopics", total);
        result.put("completedTopics", completed);
        result.put("progressPercent", total > 0 ? Math.round((completed * 100.0 / total) * 10.0) / 10.0 : 0);
        return result;
    }
}
