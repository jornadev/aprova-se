package com.aprovase.app.repository;

import com.aprovase.app.entity.Note;
import com.aprovase.app.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NoteRepository extends JpaRepository<Note, Long> {
    List<Note> findByUserOrderByUpdatedAtDescCreatedAtDesc(User user);
    List<Note> findByUserAndSubjectIdOrderByUpdatedAtDescCreatedAtDesc(User user, Long subjectId);
    List<Note> findByUserAndTopicIdOrderByUpdatedAtDescCreatedAtDesc(User user, Long topicId);
    Long countByUser(User user);
}
