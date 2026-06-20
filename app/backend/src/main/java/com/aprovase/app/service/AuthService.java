package com.aprovase.app.service;

import com.aprovase.app.dto.AuthResponse;
import com.aprovase.app.dto.LoginRequest;
import com.aprovase.app.dto.RegisterRequest;
import com.aprovase.app.entity.PasswordResetToken;
import com.aprovase.app.repository.PasswordResetTokenRepository;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import com.aprovase.app.entity.User;
import com.aprovase.app.entity.UserPreferences;
import com.aprovase.app.repository.UserPreferencesRepository;
import com.aprovase.app.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final UserPreferencesRepository preferencesRepository;
    private final ExamPlanService examPlanService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final EmailService emailService;

    @Value("${app.reset-password.url:http://localhost:5173/reset-password}")
    private String resetPasswordUrl;

    public AuthService(UserRepository userRepository,
                       UserPreferencesRepository preferencesRepository,
                       ExamPlanService examPlanService,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       PasswordResetTokenRepository resetTokenRepository,
                       EmailService emailService) {
        this.userRepository = userRepository;
        this.preferencesRepository = preferencesRepository;
        this.examPlanService = examPlanService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.resetTokenRepository = resetTokenRepository;
        this.emailService = emailService;
    }

    public AuthResponse register(RegisterRequest req) {
        if (req.termsAccepted() == null || !req.termsAccepted()) {
            throw new IllegalArgumentException("Você deve aceitar os Termos de Uso e Privacidade.");
        }
        if (userRepository.existsByEmail(req.email())) {
            throw new IllegalArgumentException("Email já cadastrado.");
        }
        User user = new User();
        user.setName(req.name());
        user.setEmail(req.email());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setTermsAcceptedAt(LocalDateTime.now());
        userRepository.save(user);

        UserPreferences prefs = new UserPreferences();
        prefs.setUser(user);
        preferencesRepository.save(prefs);

        // auto-import all available exam plans for the new user
        examPlanService.importAllForUser(user);

        String token = jwtService.generateToken(user);
        return toResponse(token, user);
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email())
            .orElseThrow(() -> new BadCredentialsException("Email ou senha inválidos."));
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Email ou senha inválidos.");
        }
        String token = jwtService.generateToken(user);
        return toResponse(token, user);
    }

    public void forgotPassword(String email) {
        // Always return success to avoid email enumeration
        userRepository.findByEmail(email).ifPresent(user -> {
            resetTokenRepository.deleteByUserId(user.getId());
            String token = UUID.randomUUID().toString();
            PasswordResetToken prt = new PasswordResetToken(token, user, LocalDateTime.now().plusHours(1));
            resetTokenRepository.save(prt);
            emailService.sendPasswordReset(email, resetPasswordUrl + "?token=" + token);
        });
    }

    public void resetPassword(String token, String newPassword) {
        if (newPassword == null || newPassword.length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A senha deve ter pelo menos 6 caracteres.");
        }
        PasswordResetToken prt = resetTokenRepository.findByToken(token)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Link inválido ou expirado."));
        if (prt.isUsed() || prt.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Link inválido ou expirado.");
        }
        User user = prt.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        prt.setUsed(true);
        resetTokenRepository.save(prt);
    }

    public Map<String, Object> updateProfile(User user, String name) {
        if (name != null && !name.isBlank()) {
            user.setName(name.trim());
            userRepository.save(user);
        }
        return Map.of("id", user.getId(), "name", user.getName(), "email", user.getEmail());
    }

    private AuthResponse toResponse(String token, User user) {
        return new AuthResponse(token, new AuthResponse.UserDto(user.getId(), user.getName(), user.getEmail()));
    }
}
