package com.aprovase.app.repository;

import com.aprovase.app.entity.ExamPlan;
import com.aprovase.app.entity.Subject;
import com.aprovase.app.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SubjectRepository extends JpaRepository<Subject, Long> {
    List<Subject> findAllByUserOrderByPriorityDescWeeklyHoursDesc(User user);
    List<Subject> findByUserAndExamPlanIdOrderByNameAsc(User user, Long examPlanId);
    Optional<Subject> findByUserAndNameAndExamPlanId(User user, String name, Long examPlanId);
    boolean existsByUserAndExamPlanId(User user, Long examPlanId);

    @Query("SELECT DISTINCT s.examPlan.name FROM Subject s WHERE s.user = :user AND s.examPlan IS NOT NULL")
    List<String> findDistinctExamPlanNamesByUser(@Param("user") User user);

    @Query("SELECT DISTINCT s.examPlan FROM Subject s WHERE s.user = :user AND s.examPlan IS NOT NULL")
    List<ExamPlan> findDistinctExamPlansByUser(@Param("user") User user);
}
