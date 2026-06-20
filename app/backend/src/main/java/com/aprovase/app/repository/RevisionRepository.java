package com.aprovase.app.repository;

import com.aprovase.app.entity.Revision;
import com.aprovase.app.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface RevisionRepository extends JpaRepository<Revision, Long> {

    List<Revision> findByUserAndScheduledDateAndCompletedAtIsNull(User user, LocalDate date);

    @Query("SELECT r FROM Revision r WHERE r.user = :user AND r.scheduledDate <= :today AND r.completedAt IS NULL ORDER BY r.scheduledDate")
    List<Revision> findPendingByUser(@Param("user") User user, @Param("today") LocalDate today);
}
