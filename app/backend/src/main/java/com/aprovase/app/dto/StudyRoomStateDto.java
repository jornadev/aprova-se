package com.aprovase.app.dto;

import java.util.Map;

public record StudyRoomStateDto(
        Map<String, SeatOccupantDto> seats,
        int totalOnline
) {}
