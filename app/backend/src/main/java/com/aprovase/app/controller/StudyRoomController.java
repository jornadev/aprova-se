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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.time.Instant;

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
    public StudyRoomStateDto getState(@AuthenticationPrincipal User user) {
        return studyRoomService.getState();
    }

    @MessageMapping("/room.sit")
    public void sit(@Payload SitRequest request, Principal principal) {
        User user = extractUser(principal);
        if (user == null) return;
        studyRoomService.sit(user, request.seatId(), request.subjectName(), request.status());
        broadcast();
    }

    @MessageMapping("/room.update")
    public void update(@Payload UpdateSeatRequest request, Principal principal) {
        User user = extractUser(principal);
        if (user == null) return;
        studyRoomService.updateSeat(user, request.subjectName(), request.status());
        broadcast();
    }

    @MessageMapping("/room.leave")
    public void leave(Principal principal) {
        User user = extractUser(principal);
        if (user == null) return;
        studyRoomService.leave(user.getEmail());
        broadcast();
    }

    @MessageMapping("/room.chat")
    public void chat(@Payload ChatSendRequest request, Principal principal) {
        User user = extractUser(principal);
        if (user == null || request == null || request.text() == null || request.text().isBlank()) return;
        String text = request.text().length() > 500 ? request.text().substring(0, 500) : request.text();
        ChatMessageDto msg = new ChatMessageDto(
                user.getId(), user.getName(), null, text, Instant.now()
        );
        messagingTemplate.convertAndSend("/topic/study-room/chat", msg);
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor sha = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = sha.getUser();
        if (principal == null) return;
        try {
            User user = extractUser(principal);
            if (user != null && studyRoomService.leave(user.getEmail())) broadcast();
        } catch (Exception ignored) {}
    }

    private void broadcast() {
        messagingTemplate.convertAndSend("/topic/study-room", studyRoomService.getState());
    }

    private User extractUser(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken t
                && t.getPrincipal() instanceof User u) return u;
        return null;
    }
}
