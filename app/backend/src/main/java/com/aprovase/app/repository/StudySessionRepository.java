package com.aprovase.app.repository;

import com.aprovase.app.entity.StudySession;
import com.aprovase.app.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface StudySessionRepository extends JpaRepository<StudySession, Long> {

    @Query("SELECT s FROM StudySession s WHERE s.user = :user AND s.duration IS NOT NULL AND s.startedAt BETWEEN :from AND :to ORDER BY s.startedAt DESC")
    List<StudySession> findCompletedBetween(@Param("user") User user, @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    Page<StudySession> findByUserAndDurationIsNotNullOrderByStartedAtDesc(User user, Pageable pageable);

    @Query("SELECT s FROM StudySession s WHERE s.user = :user AND s.duration IS NOT NULL AND s.subject.id = :subjectId ORDER BY s.startedAt DESC")
    Page<StudySession> findByUserAndSubjectId(@Param("user") User user, @Param("subjectId") Long subjectId, Pageable pageable);

    @Query("SELECT s FROM StudySession s WHERE s.user = :user AND s.duration IS NOT NULL AND s.startedAt >= :from AND s.startedAt <= :to ORDER BY s.startedAt DESC")
    Page<StudySession> findByUserAndDateRange(@Param("user") User user, @Param("from") LocalDateTime from, @Param("to") LocalDateTime to, Pageable pageable);

    @Query("SELECT s FROM StudySession s WHERE s.user = :user AND s.duration IS NOT NULL AND s.subject.id = :subjectId AND s.startedAt >= :from AND s.startedAt <= :to ORDER BY s.startedAt DESC")
    Page<StudySession> findByUserAndSubjectAndDateRange(@Param("user") User user, @Param("subjectId") Long subjectId, @Param("from") LocalDateTime from, @Param("to") LocalDateTime to, Pageable pageable);

    @Query("SELECT COALESCE(SUM(s.duration), 0) FROM StudySession s WHERE s.user = :user AND s.startedAt BETWEEN :from AND :to AND s.duration IS NOT NULL")
    Integer sumDurationBetween(@Param("user") User user, @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT s.subject.id, COALESCE(SUM(s.duration), 0) FROM StudySession s WHERE s.user = :user AND s.duration IS NOT NULL GROUP BY s.subject.id")
    List<Object[]> sumDurationBySubject(@Param("user") User user);

    @Query(value = "SELECT CAST(s.started_at AS date), COALESCE(SUM(s.duration), 0) FROM study_sessions s WHERE s.duration IS NOT NULL AND s.user_id = :userId AND s.started_at >= :from GROUP BY CAST(s.started_at AS date) ORDER BY CAST(s.started_at AS date)", nativeQuery = true)
    List<Object[]> sumDurationByDay(@Param("userId") Long userId, @Param("from") LocalDateTime from);

    @Query("SELECT s.subject.id, COALESCE(SUM(s.correctAnswers), 0), COALESCE(SUM(s.wrongAnswers), 0) FROM StudySession s WHERE s.user = :user AND s.duration IS NOT NULL GROUP BY s.subject.id")
    List<Object[]> sumAccuracyBySubject(@Param("user") User user);

    @Query("SELECT COUNT(s) FROM StudySession s WHERE s.user = :user AND s.duration IS NOT NULL")
    Long countCompleted(@Param("user") User user);

    @Query("SELECT COALESCE(SUM(s.duration), 0) FROM StudySession s WHERE s.user = :user AND s.duration IS NOT NULL")
    Integer sumDurationAllTime(@Param("user") User user);

    @Query("SELECT COALESCE(SUM(s.correctAnswers), 0), COALESCE(SUM(s.wrongAnswers), 0) FROM StudySession s WHERE s.user = :user AND s.duration IS NOT NULL")
    List<Object[]> sumQuestionsAllTime(@Param("user") User user);

    @Query("SELECT COUNT(s) FROM StudySession s WHERE s.user = :user AND s.duration IS NOT NULL AND s.startedAt BETWEEN :from AND :to")
    Long countBetween(@Param("user") User user, @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT COALESCE(SUM(s.correctAnswers), 0), COALESCE(SUM(s.wrongAnswers), 0) FROM StudySession s WHERE s.user = :user AND s.duration IS NOT NULL AND s.startedAt BETWEEN :from AND :to")
    List<Object[]> sumQuestionsBetween(@Param("user") User user, @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
