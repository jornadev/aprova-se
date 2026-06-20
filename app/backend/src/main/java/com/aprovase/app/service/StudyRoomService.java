package com.aprovase.app.service;

import com.aprovase.app.dto.SeatOccupantDto;
import com.aprovase.app.dto.StudyRoomStateDto;
import com.aprovase.app.entity.User;
import com.aprovase.app.entity.UserPreferences;
import com.aprovase.app.repository.SubjectRepository;
import com.aprovase.app.repository.UserPreferencesRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class StudyRoomService {

    private static final int SEATS_PER_ROOM = 16;
    private static final int EXPAND_THRESHOLD = 10; // ~60%
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

    // roomId -> { seatId -> occupant }
    private final ConcurrentHashMap<Integer, ConcurrentHashMap<String, SeatOccupantDto>> rooms = new ConcurrentHashMap<>();
    // email -> { roomId, seatId }
    private final ConcurrentHashMap<String, int[]> emailToLocation = new ConcurrentHashMap<>();

    public StudyRoomService(SubjectRepository subjectRepository,
                            UserPreferencesRepository preferencesRepository) {
        this.subjectRepository = subjectRepository;
        this.preferencesRepository = preferencesRepository;
        rooms.put(1, new ConcurrentHashMap<>());
    }

    public int suggestRoom() {
        ensureCapacity();
        int bestRoom = 1;
        int bestCount = -1;
        for (var entry : rooms.entrySet()) {
            int count = entry.getValue().size();
            if (count < SEATS_PER_ROOM && count > bestCount) {
                bestCount = count;
                bestRoom = entry.getKey();
            }
        }
        return bestRoom;
    }

    public boolean sit(User user, int roomId, String seatId, String subjectName, String status) {
        var room = rooms.get(roomId);
        if (room == null || !VALID_SEATS.contains(seatId) || room.containsKey(seatId)) return false;
        if (room.size() >= SEATS_PER_ROOM) return false;

        // Remove from previous seat if any
        int[] prev = emailToLocation.get(user.getEmail());
        if (prev != null) {
            var prevRoom = rooms.get(prev[0]);
            if (prevRoom != null) prevRoom.remove(seatIdFromIndex(prev[1]));
        }

        List<String> examNames = subjectRepository.findDistinctExamPlanNamesByUser(user);
        String examName = examNames.isEmpty() ? null : examNames.get(0);

        UserPreferences prefs = preferencesRepository.findByUser(user).orElse(null);
        String avatarData = prefs != null ? prefs.getAvatarData() : null;
        String concurso   = prefs != null ? prefs.getConcurso()   : null;
        String estado     = prefs != null ? prefs.getEstado()     : null;

        room.put(seatId, new SeatOccupantDto(
                user.getId(), firstName(user.getName()), examName,
                subjectName, status, Instant.now(), avatarColor(user.getId()),
                avatarData, concurso, estado
        ));
        emailToLocation.put(user.getEmail(), new int[]{roomId, 0});
        // store seatId mapping
        emailToSeatId.put(user.getEmail(), seatId);

        ensureCapacity();
        return true;
    }

    // Track email -> seatId separately for simplicity
    private final ConcurrentHashMap<String, String> emailToSeatId = new ConcurrentHashMap<>();

    public boolean updateSeat(User user, String subjectName, String status) {
        String seatId = emailToSeatId.get(user.getEmail());
        int[] loc = emailToLocation.get(user.getEmail());
        if (seatId == null || loc == null) return false;
        var room = rooms.get(loc[0]);
        if (room == null) return false;
        SeatOccupantDto cur = room.get(seatId);
        if (cur == null) return false;
        room.put(seatId, new SeatOccupantDto(
                cur.userId(), cur.userName(), cur.examName(),
                subjectName, status, cur.sittingAt(), cur.avatarColor(),
                cur.avatarData(), cur.concurso(), cur.estado()
        ));
        return true;
    }

    public int leave(String email) {
        String seatId = emailToSeatId.remove(email);
        int[] loc = emailToLocation.remove(email);
        if (seatId == null || loc == null) return -1;
        int roomId = loc[0];
        var room = rooms.get(roomId);
        if (room != null) room.remove(seatId);
        cleanupEmptyRooms();
        return roomId;
    }

    public StudyRoomStateDto getState(int roomId) {
        var room = rooms.get(roomId);
        if (room == null) return new StudyRoomStateDto(Map.of(), 0);
        return new StudyRoomStateDto(Map.copyOf(room), room.size());
    }

    public int getUserRoom(String email) {
        int[] loc = emailToLocation.get(email);
        return loc != null ? loc[0] : -1;
    }

    public List<Map<String, Object>> getRoomList() {
        List<Map<String, Object>> list = new ArrayList<>();
        for (var entry : rooms.entrySet()) {
            Map<String, Object> info = new LinkedHashMap<>();
            info.put("id", entry.getKey());
            info.put("online", entry.getValue().size());
            info.put("capacity", SEATS_PER_ROOM);
            list.add(info);
        }
        list.sort(Comparator.comparingInt(a -> (int) a.get("id")));
        return list;
    }

    private void ensureCapacity() {
        boolean allAboveThreshold = true;
        for (var room : rooms.values()) {
            if (room.size() < EXPAND_THRESHOLD) {
                allAboveThreshold = false;
                break;
            }
        }
        if (allAboveThreshold) {
            int nextId = rooms.keySet().stream().mapToInt(Integer::intValue).max().orElse(0) + 1;
            rooms.putIfAbsent(nextId, new ConcurrentHashMap<>());
        }
    }

    private void cleanupEmptyRooms() {
        if (rooms.size() <= 1) return;
        rooms.entrySet().removeIf(e -> e.getKey() > 1 && e.getValue().isEmpty());
    }

    private String seatIdFromIndex(int idx) { return ""; } // unused, kept for compat

    private String firstName(String fullName) {
        if (fullName == null || fullName.isBlank()) return "?";
        return fullName.trim().split("\\s+")[0];
    }

    private String avatarColor(Long userId) {
        return COLORS[(int) (userId % COLORS.length)];
    }
}
