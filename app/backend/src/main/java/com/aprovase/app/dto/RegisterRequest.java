package com.aprovase.app.dto;

import jakarta.validation.constraints.*;

public record RegisterRequest(
    @NotBlank(message = "Nome é obrigatório")
    String name,

    @NotBlank(message = "Email é obrigatório")
    @Email(message = "Email inválido")
    String email,

    @NotBlank(message = "Senha é obrigatória")
    @Size(min = 6, message = "Senha deve ter no mínimo 6 caracteres")
    String password,

    @AssertTrue(message = "Você deve aceitar os termos de uso")
    Boolean termsAccepted
) {}
