package com.aprovase.app.service;

import com.aprovase.app.entity.Revision;
import com.aprovase.app.entity.User;
import com.aprovase.app.repository.RevisionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class RevisionService {

    private final RevisionRepository revisionRepository;

    public RevisionService(RevisionRepository revisionRepository) {
        this.revisionRepository = revisionRepository;
    }

    public List<Revision> getToday(User user) {
        return revisionRepository.findByUserAndScheduledDateAndCompletedAtIsNull(user, LocalDate.now());
    }

    public List<Revision> getPending(User user) {
        return revisionRepository.findPendingByUser(user, LocalDate.now());
    }

    public Revision complete(Long id, User requester) {
        Revision revision = revisionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Revision not found: " + id));
        if (!revision.getUser().getId().equals(requester.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        revision.setCompletedAt(LocalDateTime.now());

        int nextInterval = revision.getIntervalDays() != null ? revision.getIntervalDays() * 2 : 30;
        if (nextInterval <= 365) {
            Revision next = new Revision();
            next.setStudySession(revision.getStudySession());
            next.setSubject(revision.getSubject());
            next.setUser(revision.getUser());
            next.setScheduledDate(LocalDate.now().plusDays(nextInterval));
            next.setIntervalDays(nextInterval);
            revisionRepository.save(next);
        }

        return revisionRepository.save(revision);
    }
}
