package com.aprovase.app.service;

import com.aprovase.app.entity.Revision;
import com.aprovase.app.entity.StudySession;
import com.aprovase.app.entity.Subject;
import com.aprovase.app.entity.User;
import com.aprovase.app.repository.RevisionRepository;
import com.aprovase.app.repository.StudySessionRepository;
import com.aprovase.app.repository.SubjectRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@Transactional
public class StudySessionService {

    private static final int[] REVISION_INTERVALS = {1, 3, 7, 14, 30};

    private final StudySessionRepository sessionRepository;
    private final SubjectRepository subjectRepository;
    private final RevisionRepository revisionRepository;

    public StudySessionService(
        StudySessionRepository sessionRepository,
        SubjectRepository subjectRepository,
        RevisionRepository revisionRepository
    ) {
        this.sessionRepository = sessionRepository;
        this.subjectRepository = subjectRepository;
        this.revisionRepository = revisionRepository;
    }

    public StudySession startSession(Long subjectId, User user) {
        Subject subject = subjectRepository.findById(subjectId)
            .orElseThrow(() -> new RuntimeException("Subject not found: " + subjectId));
        StudySession session = new StudySession();
        session.setUser(user);
        session.setSubject(subject);
        session.setStartedAt(LocalDateTime.now());
        return sessionRepository.save(session);
    }

    public StudySession stopSession(Long sessionId, String content, Integer correctAnswers, Integer wrongAnswers, User requester) {
        StudySession session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));
        if (!session.getUser().getId().equals(requester.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        long minutes = java.time.Duration.between(session.getStartedAt(), LocalDateTime.now()).toMinutes();
        session.setDuration((int) Math.max(1, minutes));
        session.setContent(content);
        session.setCorrectAnswers(correctAnswers);
        session.setWrongAnswers(wrongAnswers);
        scheduleRevisions(session);
        return sessionRepository.save(session);
    }

    public StudySession createManual(StudySession session, User user) {
        Subject subject = subjectRepository.findById(session.getSubject().getId())
            .orElseThrow(() -> new RuntimeException("Subject not found"));
        session.setSubject(subject);
        session.setUser(user);
        StudySession saved = sessionRepository.save(session);
        if (saved.getDuration() != null) {
            scheduleRevisions(saved);
        }
        return saved;
    }

    public Page<StudySession> findFiltered(User user, Long subjectId, LocalDateTime from, LocalDateTime to, Pageable pageable) {
        boolean hasSubject = subjectId != null;
        boolean hasDate = from != null && to != null;
        if (hasSubject && hasDate)  return sessionRepository.findByUserAndSubjectAndDateRange(user, subjectId, from, to, pageable);
        if (hasSubject)             return sessionRepository.findByUserAndSubjectId(user, subjectId, pageable);
        if (hasDate)                return sessionRepository.findByUserAndDateRange(user, from, to, pageable);
        return sessionRepository.findByUserAndDurationIsNotNullOrderByStartedAtDesc(user, pageable);
    }

    public StudySession update(Long id, StudySession updated, User requester) {
        StudySession session = sessionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Session not found: " + id));
        if (!session.getUser().getId().equals(requester.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (updated.getSubject() != null && updated.getSubject().getId() != null) {
            Subject subject = subjectRepository.findById(updated.getSubject().getId())
                .orElseThrow(() -> new RuntimeException("Subject not found"));
            session.setSubject(subject);
        }
        if (updated.getStartedAt() != null) session.setStartedAt(updated.getStartedAt());
        if (updated.getDuration() != null) session.setDuration(updated.getDuration());
        if (updated.getContent() != null) session.setContent(updated.getContent());
        if (updated.getCorrectAnswers() != null) session.setCorrectAnswers(updated.getCorrectAnswers());
        if (updated.getWrongAnswers() != null) session.setWrongAnswers(updated.getWrongAnswers());
        return sessionRepository.save(session);
    }

    public void delete(Long id, User requester) {
        StudySession session = sessionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Session not found: " + id));
        if (!session.getUser().getId().equals(requester.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        sessionRepository.deleteById(id);
    }

    private void scheduleRevisions(StudySession session) {
        LocalDate base = session.getStartedAt().toLocalDate();
        for (int interval : REVISION_INTERVALS) {
            Revision revision = new Revision();
            revision.setStudySession(session);
            revision.setSubject(session.getSubject());
            revision.setUser(session.getUser());
            revision.setScheduledDate(base.plusDays(interval));
            revision.setIntervalDays(interval);
            revisionRepository.save(revision);
        }
    }
}
