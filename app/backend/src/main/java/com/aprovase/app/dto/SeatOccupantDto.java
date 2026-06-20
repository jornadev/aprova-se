package com.aprovase.app.dto;

import java.time.Instant;

public record SeatOccupantDto(
        Long userId,
        String userName,
        String examName,
        String subjectName,
        String status,
        Instant sittingAt,
        String avatarColor,
        String avatarData,
        String concurso,
        String estado
) {}
