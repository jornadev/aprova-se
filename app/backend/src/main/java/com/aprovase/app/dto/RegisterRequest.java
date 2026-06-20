package com.aprovase.app.dto;

public record RegisterRequest(String name, String email, String password, Boolean termsAccepted) {}
