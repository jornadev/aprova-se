package com.aprovase.app.controller;

import com.aprovase.app.dto.ChatMessageDto;
import com.aprovase.app.dto.ChatSendRequest;
import com.aprovase.app.dto.SitRequest;
import com.aprovase.app.dto.StudyRoomStateDto;
import com.aprovase.app.dto.UpdateSeatRequest;
import com.aprovase.app.entity.User;
import com.aprovase.app.service.StudyRoomService;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/study-room")
public class StudyRoomController {

    private final StudyRoomService studyRoomService;
    private final SimpMessagingTemplate messagingTemplate;

    public StudyRoomController(StudyRoomService studyRoomService, SimpMessagingTemplate messagingTemplate) {
        this.studyRoomService = studyRoomService;
        this.messagingTemplate = messagingTemplate;
    }

    @GetMapping
    public Map<String, Object> getInfo(@AuthenticationPrincipal User user) {
        int suggested = studyRoomService.suggestRoom();
        int current = studyRoomService.getUserRoom(user.getEmail());
        int roomId = current > 0 ? current : suggested;
        return Map.of(
            "roomId", roomId,
            "room", studyRoomService.getState(roomId),
            "rooms", studyRoomService.getRoomList()
        );
    }

    @GetMapping("/{roomId}")
    public StudyRoomStateDto getRoom(@PathVariable int roomId, @AuthenticationPrincipal User user) {
        return studyRoomService.getState(roomId);
    }

    @GetMapping("/rooms")
    public List<Map<String, Object>> getRooms(@AuthenticationPrincipal User user) {
        return studyRoomService.getRoomList();
    }

    @MessageMapping("/room.sit")
    public void sit(@Payload SitRequest request, Principal principal) {
        User user = extractUser(principal);
        if (user == null) return;
        if (studyRoomService.sit(user, request.roomId(), request.seatId(), request.subjectName(), request.status())) {
            broadcastRoom(request.roomId());
            broadcastRoomList();
        }
    }

    @MessageMapping("/room.update")
    public void update(@Payload UpdateSeatRequest request, Principal principal) {
        User user = extractUser(principal);
        if (user == null) return;
        if (studyRoomService.updateSeat(user, request.subjectName(), request.status())) {
            int roomId = studyRoomService.getUserRoom(user.getEmail());
            if (roomId > 0) broadcastRoom(roomId);
        }
    }

    @MessageMapping("/room.leave")
    public void leave(Principal principal) {
        User user = extractUser(principal);
        if (user == null) return;
        int roomId = studyRoomService.leave(user.getEmail());
        if (roomId > 0) {
            broadcastRoom(roomId);
            broadcastRoomList();
        }
    }

    @MessageMapping("/room.chat")
    public void chat(@Payload ChatSendRequest request, Principal principal) {
        User user = extractUser(principal);
        if (user == null || request == null || request.text() == null || request.text().isBlank()) return;
        String text = request.text().length() > 500 ? request.text().substring(0, 500) : request.text();
        int roomId = studyRoomService.getUserRoom(user.getEmail());
        if (roomId <= 0) return;
        ChatMessageDto msg = new ChatMessageDto(
                user.getId(), user.getName(), null, text, Instant.now()
        );
        messagingTemplate.convertAndSend("/topic/study-room/" + roomId + "/chat", msg);
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor sha = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = sha.getUser();
        if (principal == null) return;
        try {
            User user = extractUser(principal);
            if (user != null) {
                int roomId = studyRoomService.leave(user.getEmail());
                if (roomId > 0) {
                    broadcastRoom(roomId);
                    broadcastRoomList();
                }
            }
        } catch (Exception ignored) {}
    }

    private void broadcastRoom(int roomId) {
        messagingTemplate.convertAndSend("/topic/study-room/" + roomId, studyRoomService.getState(roomId));
    }

    private void broadcastRoomList() {
        messagingTemplate.convertAndSend("/topic/study-room/rooms", studyRoomService.getRoomList());
    }

    private User extractUser(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken t
                && t.getPrincipal() instanceof User u) return u;
        return null;
    }
}
