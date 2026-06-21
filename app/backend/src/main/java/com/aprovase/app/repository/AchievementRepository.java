package com.aprovase.app.repository;

import com.aprovase.app.entity.Achievement;
import com.aprovase.app.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AchievementRepository extends JpaRepository<Achievement, Long> {
    List<Achievement> findByUserOrderByUnlockedAtDesc(User user);
    boolean existsByUserAndType(User user, String type);
}
