package com.aprovase.app.service;

import com.aprovase.app.entity.Subject;
import com.aprovase.app.entity.User;
import com.aprovase.app.repository.SubjectRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@Transactional
public class SubjectService {

    private final SubjectRepository subjectRepository;

    public SubjectService(SubjectRepository subjectRepository) {
        this.subjectRepository = subjectRepository;
    }

    public List<Subject> findAll(User user) {
        return subjectRepository.findAllByUserOrderByPriorityDescWeeklyHoursDesc(user);
    }

    public Subject findById(Long id) {
        return subjectRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Subject not found: " + id));
    }

    public Subject create(Subject subject, User user) {
        subject.setUser(user);
        return subjectRepository.save(subject);
    }

    public Subject update(Long id, Subject updated, User requester) {
        Subject subject = findById(id);
        if (!subject.getUser().getId().equals(requester.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (updated.getName() != null) subject.setName(updated.getName());
        if (updated.getColor() != null) subject.setColor(updated.getColor());
        if (updated.getPriority() != null) subject.setPriority(updated.getPriority());
        if (updated.getWeeklyHours() != null) subject.setWeeklyHours(updated.getWeeklyHours());
        return subjectRepository.save(subject);
    }

    public void delete(Long id, User requester) {
        Subject subject = findById(id);
        if (!subject.getUser().getId().equals(requester.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        subjectRepository.deleteById(id);
    }

    public List<Subject> generateCycle(User user) {
        return subjectRepository.findAllByUserOrderByPriorityDescWeeklyHoursDesc(user);
    }
}
