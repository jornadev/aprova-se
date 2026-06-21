package com.aprovase.app.repository;

import com.aprovase.app.entity.Question;
import com.aprovase.app.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByUserOrderByCreatedAtDesc(User user);
    List<Question> findByUserAndSubjectIdOrderByCreatedAtDesc(User user, Long subjectId);
    Long countByUser(User user);
    Long countByUserAndSubjectId(User user, Long subjectId);

    @Query(value = "SELECT * FROM questions WHERE user_id = :userId AND subject_id = :subjectId ORDER BY RANDOM() LIMIT :count", nativeQuery = true)
    List<Question> findRandomBySubject(@Param("userId") Long userId, @Param("subjectId") Long subjectId, @Param("count") int count);

    @Query(value = "SELECT * FROM questions WHERE user_id = :userId ORDER BY RANDOM() LIMIT :count", nativeQuery = true)
    List<Question> findRandom(@Param("userId") Long userId, @Param("count") int count);
}
