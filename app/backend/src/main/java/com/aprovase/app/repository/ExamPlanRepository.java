package com.aprovase.app.repository;

import com.aprovase.app.entity.ExamPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ExamPlanRepository extends JpaRepository<ExamPlan, Long> {
    Optional<ExamPlan> findBySlug(String slug);
}
