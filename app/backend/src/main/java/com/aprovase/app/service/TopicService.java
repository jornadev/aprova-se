package com.aprovase.app.service;

import com.aprovase.app.entity.Subject;
import com.aprovase.app.entity.Topic;
import com.aprovase.app.entity.User;
import com.aprovase.app.repository.SubjectRepository;
import com.aprovase.app.repository.TopicRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@Transactional
public class TopicService {

    private final TopicRepository topicRepository;
    private final SubjectRepository subjectRepository;

    public TopicService(TopicRepository topicRepository, SubjectRepository subjectRepository) {
        this.topicRepository = topicRepository;
        this.subjectRepository = subjectRepository;
    }

    public List<Topic> findBySubject(Long subjectId, User requester) {
        Subject subject = subjectRepository.findById(subjectId)
            .orElseThrow(() -> new RuntimeException("Subject not found: " + subjectId));
        if (!subject.getUser().getId().equals(requester.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return topicRepository.findBySubjectIdOrderByTitle(subjectId);
    }

    public Topic create(Long subjectId, Topic topic, User requester) {
        Subject subject = subjectRepository.findById(subjectId)
            .orElseThrow(() -> new RuntimeException("Subject not found: " + subjectId));
        if (!subject.getUser().getId().equals(requester.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        topic.setSubject(subject);
        return topicRepository.save(topic);
    }

    public Topic update(Long id, Topic updated, User requester) {
        Topic topic = topicRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Topic not found: " + id));
        Subject subject = subjectRepository.findById(topic.getSubject().getId())
            .orElseThrow(() -> new RuntimeException("Subject not found"));
        if (!subject.getUser().getId().equals(requester.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (updated.getTitle() != null) topic.setTitle(updated.getTitle());
        if (updated.getStatus() != null) topic.setStatus(updated.getStatus());
        return topicRepository.save(topic);
    }

    public void delete(Long id, User requester) {
        Topic topic = topicRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Topic not found: " + id));
        Subject subject = subjectRepository.findById(topic.getSubject().getId())
            .orElseThrow(() -> new RuntimeException("Subject not found"));
        if (!subject.getUser().getId().equals(requester.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        topicRepository.deleteById(id);
    }
}
