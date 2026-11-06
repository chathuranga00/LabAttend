package com.labattend.service;

import com.labattend.dto.response.StudentResponse;
import com.labattend.entity.AccountActivationToken;
import com.labattend.entity.Batch;
import com.labattend.entity.Student;
import com.labattend.entity.User;
import com.labattend.entity.enums.Role;
import com.labattend.entity.enums.TokenPurpose;
import com.labattend.exception.BadRequestException;
import com.labattend.exception.ResourceNotFoundException;
import com.labattend.repository.AccountActivationTokenRepository;
import com.labattend.repository.BatchRepository;
import com.labattend.repository.StudentRepository;
import com.labattend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class StudentAccountServiceTest {

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AccountActivationTokenRepository tokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private EmailService emailService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private BatchRepository batchRepository;

    @InjectMocks
    private StudentAccountService studentAccountService;

    private Student testStudent;
    private User testUser;
    private Batch testBatch;
    private UUID studentId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        studentId = UUID.randomUUID();
        userId = UUID.randomUUID();

        testBatch = Batch.builder()
                .batchCode("22.1")
                .academicYear("2022")
                .build();
        testBatch.setId(UUID.randomUUID());

        testStudent = Student.builder()
                .studentId("STU-1001")
                .fullName("Amali Perera")
                .email("amali@students.nsbm.ac.lk")
                .batch(testBatch)
                .isActive(true)
                .build();
        testStudent.setId(studentId);

        testUser = User.builder()
                .email("amali@students.nsbm.ac.lk")
                .fullName("Amali Perera")
                .role(Role.STUDENT)
                .passwordHash("encodedHash")
                .isActive(true)
                .mustChangePassword(true)
                .build();
        testUser.setId(userId);
    }

    @Test
    @DisplayName("Create Student Account -> Successfully creates User, links to Student, and stores HASHED token")
    void testCreateAccountSuccess() {
        when(studentRepository.findById(studentId)).thenReturn(Optional.of(testStudent));
        when(userRepository.existsByEmail("amali@students.nsbm.ac.lk")).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("randomDummyHash");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(studentRepository.save(any(Student.class))).thenAnswer(i -> i.getArgument(0));

        StudentResponse response = studentAccountService.createAccount(studentId);

        assertThat(response).isNotNull();
        assertThat(response.getHasAccount()).isTrue();
        assertThat(response.getAccountStatus()).isEqualTo("PENDING_ACTIVATION");

        // Verify token was stored HASHED, never plain
        ArgumentCaptor<AccountActivationToken> tokenCaptor = ArgumentCaptor.forClass(AccountActivationToken.class);
        verify(tokenRepository).save(tokenCaptor.capture());
        AccountActivationToken savedToken = tokenCaptor.getValue();

        assertThat(savedToken.getTokenHash()).isNotBlank();
        assertThat(savedToken.getTokenHash()).hasSize(64); // SHA-256 hex is exactly 64 chars
        assertThat(savedToken.getPurpose()).isEqualTo(TokenPurpose.ACTIVATION);
        assertThat(savedToken.getExpiresAt()).isAfter(OffsetDateTime.now());

        // Verify email was sent with unhashed raw token
        verify(emailService).sendActivationEmail(eq("amali@students.nsbm.ac.lk"), eq("Amali Perera"), anyString());
    }

    @Test
    @DisplayName("Create Student Account -> Fails if student has no university email")
    void testCreateAccountNoEmail() {
        testStudent.setEmail(null);
        when(studentRepository.findById(studentId)).thenReturn(Optional.of(testStudent));

        assertThatThrownBy(() -> studentAccountService.createAccount(studentId))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("registered university email");
    }

    @Test
    @DisplayName("Create Student Account -> Fails if student already has account")
    void testCreateAccountAlreadyExists() {
        testStudent.setUser(testUser);
        when(studentRepository.findById(studentId)).thenReturn(Optional.of(testStudent));

        assertThatThrownBy(() -> studentAccountService.createAccount(studentId))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("already has an active or provisioned account");
    }

    @Test
    @DisplayName("Activate Account -> Successfully sets password and marks token used")
    void testActivateAccountSuccess() {
        String rawToken = "raw-secret-token-abc";
        String tokenHash = StudentAccountService.hashToken(rawToken);

        AccountActivationToken token = AccountActivationToken.builder()
                .user(testUser)
                .tokenHash(tokenHash)
                .purpose(TokenPurpose.ACTIVATION)
                .expiresAt(OffsetDateTime.now().plusHours(24))
                .build();

        when(tokenRepository.findByTokenHashAndPurpose(tokenHash, TokenPurpose.ACTIVATION))
                .thenReturn(Optional.of(token));
        when(passwordEncoder.encode("StrongP@ssw0rd!")).thenReturn("newEncryptedHash");

        studentAccountService.activateAccount(rawToken, "StrongP@ssw0rd!");

        assertThat(token.getUsedAt()).isNotNull();
        assertThat(testUser.getPasswordHash()).isEqualTo("newEncryptedHash");
        assertThat(testUser.getMustChangePassword()).isFalse();
        verify(userRepository).save(testUser);
        verify(tokenRepository).save(token);
    }

    @Test
    @DisplayName("Activate Account -> Fails when token is expired")
    void testActivateAccountExpiredToken() {
        String rawToken = "expired-token-123";
        String tokenHash = StudentAccountService.hashToken(rawToken);

        AccountActivationToken token = AccountActivationToken.builder()
                .user(testUser)
                .tokenHash(tokenHash)
                .purpose(TokenPurpose.ACTIVATION)
                .expiresAt(OffsetDateTime.now().minusHours(2)) // EXPIRED
                .build();

        when(tokenRepository.findByTokenHashAndPurpose(tokenHash, TokenPurpose.ACTIVATION))
                .thenReturn(Optional.of(token));

        assertThatThrownBy(() -> studentAccountService.activateAccount(rawToken, "StrongP@ssw0rd!"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid, expired, or already used");
    }

    @Test
    @DisplayName("Activate Account -> Fails when token was already used")
    void testActivateAccountReusedToken() {
        String rawToken = "reused-token-123";
        String tokenHash = StudentAccountService.hashToken(rawToken);

        AccountActivationToken token = AccountActivationToken.builder()
                .user(testUser)
                .tokenHash(tokenHash)
                .purpose(TokenPurpose.ACTIVATION)
                .expiresAt(OffsetDateTime.now().plusHours(12))
                .usedAt(OffsetDateTime.now().minusMinutes(5)) // ALREADY USED
                .build();

        when(tokenRepository.findByTokenHashAndPurpose(tokenHash, TokenPurpose.ACTIVATION))
                .thenReturn(Optional.of(token));

        assertThatThrownBy(() -> studentAccountService.activateAccount(rawToken, "StrongP@ssw0rd!"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid, expired, or already used");
    }

    @Test
    @DisplayName("Password Policy -> Rejects weak passwords lacking uppercase, digit, or special char")
    void testPasswordPolicyValidation() {
        assertThatThrownBy(() -> studentAccountService.validatePasswordStrength("short"))
                .isInstanceOf(BadRequestException.class);

        assertThatThrownBy(() -> studentAccountService.validatePasswordStrength("lowercaseonly123!"))
                .isInstanceOf(BadRequestException.class);

        assertThatThrownBy(() -> studentAccountService.validatePasswordStrength("UPPERCASEONLY123!"))
                .isInstanceOf(BadRequestException.class);

        assertThatThrownBy(() -> studentAccountService.validatePasswordStrength("NoSpecialChar12345"))
                .isInstanceOf(BadRequestException.class);

        assertThatThrownBy(() -> studentAccountService.validatePasswordStrength("NoDigitsHere!@#$"))
                .isInstanceOf(BadRequestException.class);

        // Valid strong passwords should not throw
        studentAccountService.validatePasswordStrength("ValidPassword123!");
        studentAccountService.validatePasswordStrength("Str0ng!P@ss");
    }

    @Test
    @DisplayName("Toggle Account Status -> Toggles isActive")
    void testToggleAccountStatus() {
        testStudent.setUser(testUser);
        when(studentRepository.findById(studentId)).thenReturn(Optional.of(testStudent));

        StudentResponse res1 = studentAccountService.toggleAccountStatus(studentId);
        assertThat(testUser.getIsActive()).isFalse();

        StudentResponse res2 = studentAccountService.toggleAccountStatus(studentId);
        assertThat(testUser.getIsActive()).isTrue();
    }

    @Test
    @DisplayName("Reset Access -> Wipes password, invalidates tokens, issues new activation link")
    void testResetAccess() {
        testStudent.setUser(testUser);
        when(studentRepository.findById(studentId)).thenReturn(Optional.of(testStudent));
        when(passwordEncoder.encode(any())).thenReturn("newWipedDummyHash");

        StudentResponse res = studentAccountService.resetAccess(studentId);

        assertThat(res).isNotNull();
        assertThat(testUser.getMustChangePassword()).isTrue();
        verify(tokenRepository).invalidateUnusedTokens(eq(userId), eq(TokenPurpose.ACTIVATION), any());
        verify(tokenRepository).invalidateUnusedTokens(eq(userId), eq(TokenPurpose.PASSWORD_RESET), any());
        verify(emailService).sendActivationEmail(eq(testUser.getEmail()), eq("Amali Perera"), anyString());
    }

    @Test
    @DisplayName("Forgot Password -> Sends reset email if active STUDENT account exists")
    void testForgotPasswordKnownStudent() {
        when(userRepository.findByEmail("amali@students.nsbm.ac.lk")).thenReturn(Optional.of(testUser));

        studentAccountService.forgotPassword("amali@students.nsbm.ac.lk");

        verify(emailService).sendPasswordResetEmail(eq("amali@students.nsbm.ac.lk"), eq("Amali Perera"), anyString());
    }

    @Test
    @DisplayName("Forgot Password -> Silent no-op if email is unknown (generic defense)")
    void testForgotPasswordUnknownEmail() {
        when(userRepository.findByEmail("unknown@nowhere.com")).thenReturn(Optional.empty());

        studentAccountService.forgotPassword("unknown@nowhere.com");

        verifyNoInteractions(emailService);
    }

    @Test
    @DisplayName("Bulk Create Accounts -> Provisions accounts for cohort batch")
    void testBulkCreateAccountsForBatch() {
        Student s1 = Student.builder().studentId("S1").email("s1@nsbm.ac.lk").fullName("S1").build();
        s1.setId(UUID.randomUUID());
        Student s2 = Student.builder().studentId("S2").email("s2@nsbm.ac.lk").fullName("S2").build();
        s2.setId(UUID.randomUUID());

        when(studentRepository.findByBatchIdAndIsActiveTrue(testBatch.getId())).thenReturn(List.of(s1, s2));
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("dummyHash");
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> result = studentAccountService.bulkCreateAccounts(testBatch.getId(), null, null);

        assertThat(result.get("createdCount")).isEqualTo(2);
        assertThat(result.get("skippedCount")).isEqualTo(0);
        verify(emailService, times(2)).sendActivationEmail(anyString(), anyString(), anyString());
    }
}
