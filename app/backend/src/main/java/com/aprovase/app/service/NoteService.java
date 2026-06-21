package com.aprovase.app.service;

import com.aprovase.app.entity.Note;
import com.aprovase.app.entity.Subject;
import com.aprovase.app.entity.Topic;
import com.aprovase.app.entity.User;
import com.aprovase.app.repository.NoteRepository;
import com.aprovase.app.repository.SubjectRepository;
import com.aprovase.app.repository.TopicRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class NoteService {

    private final NoteRepository noteRepository;
    private final SubjectRepository subjectRepository;
    private final TopicRepository topicRepository;

    public NoteService(NoteRepository noteRepository, SubjectRepository subjectRepository, TopicRepository topicRepository) {
        this.noteRepository = noteRepository;
        this.subjectRepository = subjectRepository;
        this.topicRepository = topicRepository;
    }

    public List<Note> findAll(User user, Long subjectId, Long topicId) {
        if (topicId != null) return noteRepository.findByUserAndTopicIdOrderByUpdatedAtDescCreatedAtDesc(user, topicId);
        if (subjectId != null) return noteRepository.findByUserAndSubjectIdOrderByUpdatedAtDescCreatedAtDesc(user, subjectId);
        return noteRepository.findByUserOrderByUpdatedAtDescCreatedAtDesc(user);
    }

    public Note create(Note note, User user) {
        Subject subject = subjectRepository.findById(note.getSubject().getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Disciplina não encontrada"));
        if (!subject.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        note.setUser(user);
        note.setSubject(subject);
        if (note.getTopic() != null && note.getTopic().getId() != null) {
            Topic topic = topicRepository.findById(note.getTopic().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tópico não encontrado"));
            note.setTopic(topic);
        } else {
            note.setTopic(null);
        }
        note.setCreatedAt(LocalDateTime.now());
        note.setUpdatedAt(LocalDateTime.now());
        return noteRepository.save(note);
    }

    public Note update(Long id, Note updated, User user) {
        Note note = noteRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Anotação não encontrada"));
        if (!note.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (updated.getTitle() != null) note.setTitle(updated.getTitle());
        if (updated.getContent() != null) note.setContent(updated.getContent());
        note.setUpdatedAt(LocalDateTime.now());
        return noteRepository.save(note);
    }

    public void delete(Long id, User user) {
        Note note = noteRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Anotação não encontrada"));
        if (!note.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        noteRepository.deleteById(id);
    }
}
