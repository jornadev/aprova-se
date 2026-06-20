package com.aprovase.app.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:noreply@aprova.se}")
    private String from;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendPasswordReset(String toEmail, String resetUrl) {
        if (mailUsername == null || mailUsername.isBlank()) {
            log.warn("Email não configurado. Link de redefinição de senha: {}", resetUrl);
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(toEmail);
            msg.setSubject("Redefinição de senha — Aprova.se");
            msg.setText("""
                    Olá,

                    Você solicitou a redefinição de senha na plataforma Aprova.se.

                    Clique no link abaixo para criar uma nova senha (válido por 1 hora):

                    %s

                    Se você não solicitou isso, ignore este e-mail. Sua senha permanece a mesma.

                    Equipe Aprova.se
                    """.formatted(resetUrl));
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("Falha ao enviar email de redefinição de senha para {}: {}", toEmail, e.getMessage());
        }
    }
}
