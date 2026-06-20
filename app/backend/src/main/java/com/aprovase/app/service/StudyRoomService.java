package com.aprovase.app.service;

import com.aprovase.app.dto.SeatOccupantDto;
import com.aprovase.app.dto.StudyRoomStateDto;
import com.aprovase.app.entity.User;
import com.aprovase.app.entity.UserPreferences;
import com.aprovase.app.repository.SubjectRepository;
import com.aprovase.app.repository.UserPreferencesRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class StudyRoomService {

    private static final Set<String> VALID_SEATS;
    private static final String[] COLORS = {
            "#7c3aed", "#2563eb", "#059669", "#d97706",
            "#dc2626", "#0891b2", "#be185d", "#4f46e5"
    };

    static {
        Set<String> ids = ConcurrentHashMap.newKeySet();
        for (int t = 1; t <= 4; t++)
            for (String pos : new String[]{"N", "E", "S", "W"})
                ids.add("T" + t + "_" + pos);
        VALID_SEATS = Collections.unmodifiableSet(ids);
    }

    private final SubjectRepository subjectRepository;
    private final UserPreferencesRepository preferencesRepository;
    private final Map<String, SeatOccupantDto> seats       = new ConcurrentHashMap<>();
    private final Map<String, String>          emailToSeat = new ConcurrentHashMap<>();

    public StudyRoomService(SubjectRepository subjectRepository,
                            UserPreferencesRepository preferencesRepository) {
        this.subjectRepository = subjectRepository;
        this.preferencesRepository = preferencesRepository;
    }

    public boolean sit(User user, String seatId, String subjectName, String status) {
        if (!VALID_SEATS.contains(seatId) || seats.containsKey(seatId)) return false;
        String existing = emailToSeat.get(user.getEmail());
        if (existing != null) seats.remove(existing);

        List<String> examNames = subjectRepository.findDistinctExamPlanNamesByUser(user);
        String examName = examNames.isEmpty() ? null : examNames.get(0);

        UserPreferences prefs = preferencesRepository.findByUser(user).orElse(null);
        String avatarData = prefs != null ? prefs.getAvatarData() : null;
        String concurso   = prefs != null ? prefs.getConcurso()   : null;
        String estado     = prefs != null ? prefs.getEstado()     : null;

        seats.put(seatId, new SeatOccupantDto(
                user.getId(), firstName(user.getName()), examName,
                subjectName, status, Instant.now(), avatarColor(user.getId()),
                avatarData, concurso, estado
        ));
        emailToSeat.put(user.getEmail(), seatId);
        return true;
    }

    public boolean updateSeat(User user, String subjectName, String status) {
        String seatId = emailToSeat.get(user.getEmail());
        if (seatId == null) return false;
        SeatOccupantDto cur = seats.get(seatId);
        if (cur == null) return false;
        seats.put(seatId, new SeatOccupantDto(
                cur.userId(), cur.userName(), cur.examName(),
                subjectName, status, cur.sittingAt(), cur.avatarColor(),
                cur.avatarData(), cur.concurso(), cur.estado()
        ));
        return true;
    }

    public boolean leave(String email) {
        String seatId = emailToSeat.remove(email);
        if (seatId == null) return false;
        seats.remove(seatId);
        return true;
    }

    public StudyRoomStateDto getState() {
        return new StudyRoomStateDto(Map.copyOf(seats), seats.size());
    }

    private String firstName(String fullName) {
        if (fullName == null || fullName.isBlank()) return "?";
        return fullName.trim().split("\\s+")[0];
    }

    private String avatarColor(Long userId) {
        return COLORS[(int) (userId % COLORS.length)];
    }
}
