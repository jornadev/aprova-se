package com.aprovase.app.dto;

import java.time.Instant;

public record ChatMessageDto(
        Long userId,
        String userName,
        String avatarColor,
        String text,
        Instant timestamp
) {}
