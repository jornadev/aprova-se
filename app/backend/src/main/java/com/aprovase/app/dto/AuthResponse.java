package com.aprovase.app.dto;

public record AuthResponse(String token, UserDto user) {
    public record UserDto(Long id, String name, String email) {}
}
