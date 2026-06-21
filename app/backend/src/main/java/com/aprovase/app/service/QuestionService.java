package com.aprovase.app.service;

import com.aprovase.app.entity.Question;
import com.aprovase.app.entity.Subject;
import com.aprovase.app.entity.Topic;
import com.aprovase.app.entity.User;
import com.aprovase.app.repository.QuestionRepository;
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
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final SubjectRepository subjectRepository;
    private final TopicRepository topicRepository;

    public QuestionService(QuestionRepository questionRepository, SubjectRepository subjectRepository, TopicRepository topicRepository) {
        this.questionRepository = questionRepository;
        this.subjectRepository = subjectRepository;
        this.topicRepository = topicRepository;
    }

    public List<Question> findAll(User user, Long subjectId) {
        if (subjectId != null) return questionRepository.findByUserAndSubjectIdOrderByCreatedAtDesc(user, subjectId);
        return questionRepository.findByUserOrderByCreatedAtDesc(user);
    }

    public Question create(Question question, User user) {
        Subject subject = subjectRepository.findById(question.getSubject().getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Disciplina não encontrada"));
        if (!subject.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        question.setUser(user);
        question.setSubject(subject);
        if (question.getTopic() != null && question.getTopic().getId() != null) {
            Topic topic = topicRepository.findById(question.getTopic().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tópico não encontrado"));
            question.setTopic(topic);
        } else {
            question.setTopic(null);
        }
        question.setCreatedAt(LocalDateTime.now());
        return questionRepository.save(question);
    }

    public Question update(Long id, Question updated, User user) {
        Question question = questionRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Questão não encontrada"));
        if (!question.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (updated.getQuestionText() != null) question.setQuestionText(updated.getQuestionText());
        if (updated.getAlternatives() != null) question.setAlternatives(updated.getAlternatives());
        if (updated.getCorrectIndex() != null) question.setCorrectIndex(updated.getCorrectIndex());
        if (updated.getExplanation() != null) question.setExplanation(updated.getExplanation());
        return questionRepository.save(question);
    }

    public void delete(Long id, User user) {
        Question question = questionRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Questão não encontrada"));
        if (!question.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        questionRepository.deleteById(id);
    }

    public List<Question> practice(User user, Long subjectId, int count) {
        if (subjectId != null) {
            return questionRepository.findRandomBySubject(user.getId(), subjectId, count);
        }
        return questionRepository.findRandom(user.getId(), count);
    }

    public Long count(User user, Long subjectId) {
        if (subjectId != null) return questionRepository.countByUserAndSubjectId(user, subjectId);
        return questionRepository.countByUser(user);
    }
}
