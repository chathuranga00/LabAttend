package com.labattend.admin;

import com.google.zxing.BinaryBitmap;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.Result;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import com.labattend.dto.request.AttendanceScanRequest;
import com.labattend.dto.response.AttendanceScanResponse;
import com.labattend.dto.response.StudentResponse;
import com.labattend.entity.*;
import com.labattend.entity.enums.AttendanceStatus;
import com.labattend.entity.enums.Role;
import com.labattend.entity.enums.SessionStatus;
import com.labattend.exception.BadRequestException;
import com.labattend.repository.*;
import com.labattend.service.AttendanceService;
import com.labattend.service.AuditLogService;
import com.labattend.service.QrCodeService;
import com.labattend.service.StudentService;
import com.labattend.util.HashUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class QrCodeServiceTest {

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;

    @Mock
    private SessionStudentRepository sessionStudentRepository;

    @Mock
    private LabSessionRepository labSessionRepository;

    @Mock
    private LecturerRepository lecturerRepository;

    private QrCodeService qrCodeService;
    private AttendanceService attendanceService;

    private final String testHmacSecret = "test_hmac_secret_key_with_sufficient_entropy_for_unit_tests";
    private Student studentA;
    private Student studentB;
    private Batch batch;
    private LabGroup groupA;
    private LabSession activeSession;
    private Lecturer lecturer;
    private User lecturerUser;
    private UUID sessionId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        qrCodeService = new QrCodeService(
                studentRepository,
                userRepository,
                auditLogService
        );
        ReflectionTestUtils.setField(qrCodeService, "hmacSecret", testHmacSecret);
        ReflectionTestUtils.setField(qrCodeService, "bulkMaxStudents", 500);
        ReflectionTestUtils.setField(qrCodeService, "bulkRateLimitPerMinute", 30);

        attendanceService = new AttendanceService(
                attendanceRecordRepository,
                sessionStudentRepository,
                labSessionRepository,
                studentRepository,
                lecturerRepository,
                userRepository,
                auditLogService,
                qrCodeService
        );

        DegreeProgramme programme = DegreeProgramme.builder()
                .code("SE")
                .name("Software Engineering")
                .build();
        programme.setId(UUID.randomUUID());

        batch = Batch.builder()
                .batchCode("BATCH-2026-A")
                .degreeProgramme(programme)
                .build();
        batch.setId(UUID.randomUUID());

        groupA = LabGroup.builder()
                .groupName("A")
                .batch(batch)
                .isActive(true)
                .build();
        groupA.setId(UUID.randomUUID());

        studentA = Student.builder()
                .studentId("STU001")
                .fullName("Kamal Silva")
                .email("kamal.silva@nsbm.ac.lk")
                .degreeProgramme(programme)
                .batch(batch)
                .labGroup(groupA)
                .qrVersion(1)
                .qrGeneratedAt(OffsetDateTime.now())
                .isActive(true)
                .build();
        studentA.setId(UUID.randomUUID());
        studentA.setQrTokenHash(qrCodeService.generateTokenHash(qrCodeService.generateToken(studentA.getId(), 1)));

        studentB = Student.builder()
                .studentId("STU002")
                .fullName("Nimal Perera")
                .email("nimal.perera@nsbm.ac.lk")
                .degreeProgramme(programme)
                .batch(batch)
                .labGroup(groupA)
                .qrVersion(1)
                .qrGeneratedAt(OffsetDateTime.now())
                .isActive(true)
                .build();
        studentB.setId(UUID.randomUUID());
        studentB.setQrTokenHash(qrCodeService.generateTokenHash(qrCodeService.generateToken(studentB.getId(), 1)));

        userId = UUID.randomUUID();
        sessionId = UUID.randomUUID();

        lecturerUser = User.builder()
                .email("lecturer@nsbm.ac.lk")
                .fullName("Dr. Lecturer")
                .role(Role.LECTURER)
                .isActive(true)
                .build();
        lecturerUser.setId(userId);

        lecturer = Lecturer.builder()
                .user(lecturerUser)
                .staffId("LEC001")
                .build();
        lecturer.setId(UUID.randomUUID());

        activeSession = LabSession.builder()
                .sessionCode("SES-TEST-001")
                .lecturer(lecturer)
                .status(SessionStatus.ACTIVE)
                .sessionDate(LocalDate.now())
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(10, 0))
                .build();
        activeSession.setId(sessionId);
    }

    @Test
    @DisplayName("Token Determinism: same student and same qr_version yield identical HMAC tokens")
    void testTokenIsDeterministicForSameVersion() {
        String token1 = qrCodeService.generateToken(studentA.getId(), 1);
        String token2 = qrCodeService.generateToken(studentA.getId(), 1);

        assertNotNull(token1);
        assertFalse(token1.isBlank());
        assertEquals(token1, token2, "HMAC token must be deterministic for the same student ID and qr_version");
    }

    @Test
    @DisplayName("Token Uniqueness: different students yield completely different HMAC tokens")
    void testTokenDiffersBetweenStudents() {
        String tokenA = qrCodeService.generateToken(studentA.getId(), 1);
        String tokenB = qrCodeService.generateToken(studentB.getId(), 1);

        assertNotEquals(tokenA, tokenB, "Different students must have distinct cryptographic tokens");
    }

    @Test
    @DisplayName("QR Invalidation: regenerating QR increments version and immediately invalidates the old token")
    void testRegenerateInvalidatesOldToken() {
        String tokenV1 = qrCodeService.generateToken(studentA.getId(), 1);

        when(studentRepository.findById(studentA.getId())).thenReturn(Optional.of(studentA));
        when(studentRepository.save(any(Student.class))).thenAnswer(inv -> inv.getArgument(0));

        StudentResponse regeneratedResponse = qrCodeService.regenerateQrCode(studentA.getId(), "Student lost physical badge card");

        assertNotNull(regeneratedResponse);
        assertEquals(2, regeneratedResponse.getQrVersion(), "qr_version must increment to 2");

        // Old token verification must fail
        boolean isV1Valid = qrCodeService.verifyToken(studentA.getId(), studentA.getQrVersion(), tokenV1);
        assertFalse(isV1Valid, "Old token must be rejected when verified against new version");

        // New token verification must succeed
        String tokenV2 = qrCodeService.generateToken(studentA.getId(), 2);
        boolean isV2Valid = qrCodeService.verifyToken(studentA.getId(), studentA.getQrVersion(), tokenV2);
        assertTrue(isV2Valid, "New token must be accepted against version 2");

        verify(auditLogService, times(1)).logAction(
                eq("Student"),
                eq(studentA.getId()),
                eq("QR_REGENERATE"),
                any(),
                any()
        );
    }

    @Test
    @DisplayName("Scan Resolution: scan with new token succeeds, scan with old token is rejected")
    void testScanWithNewTokenWorksAndOldTokenRejected() {
        String tokenV1 = qrCodeService.generateToken(studentA.getId(), 1);
        String tokenV2 = qrCodeService.generateToken(studentA.getId(), 2);

        when(lecturerRepository.findByUserId(userId)).thenReturn(Optional.of(lecturer));
        when(labSessionRepository.findById(sessionId)).thenReturn(Optional.of(activeSession));
        when(userRepository.findById(userId)).thenReturn(Optional.of(lecturerUser));
        when(sessionStudentRepository.existsBySessionIdAndStudentId(sessionId, studentA.getId())).thenReturn(true);
        when(sessionStudentRepository.countBySessionId(sessionId)).thenReturn(40L);
        when(attendanceRecordRepository.countBySessionIdAndStatusIn(eq(sessionId), any())).thenReturn(1L);

        // 1. Initial state: student is at version 1
        when(studentRepository.findByQrTokenHash(qrCodeService.generateTokenHash(tokenV1))).thenReturn(Optional.of(studentA));

        AttendanceScanResponse responseV1 = attendanceService.scanQrAttendance(userId, sessionId, new AttendanceScanRequest(tokenV1));
        assertEquals("SUCCESS", responseV1.getResult());
        assertEquals("STU001", responseV1.getStudentId());

        // 2. Invalidate: student is regenerated to version 2
        studentA.setQrVersion(2);
        studentA.setQrTokenHash(qrCodeService.generateTokenHash(tokenV2));

        // When scanning with old tokenV1: hash lookup yields empty or HMAC fails
        when(studentRepository.findByQrTokenHash(qrCodeService.generateTokenHash(tokenV1))).thenReturn(Optional.empty());

        BadRequestException exOld = assertThrows(BadRequestException.class, () ->
                attendanceService.scanQrAttendance(userId, sessionId, new AttendanceScanRequest(tokenV1)));
        assertTrue(exOld.getMessage().contains("Invalid QR Code — Student Not Found"));

        // 3. Scanning with new tokenV2 succeeds
        when(studentRepository.findByQrTokenHash(qrCodeService.generateTokenHash(tokenV2))).thenReturn(Optional.of(studentA));
        when(attendanceRecordRepository.findBySessionIdAndStudentId(sessionId, studentA.getId()))
                .thenReturn(Optional.of(AttendanceRecord.builder()
                        .session(activeSession)
                        .student(studentA)
                        .status(AttendanceStatus.PRESENT)
                        .markedAt(OffsetDateTime.now())
                        .build()));

        AttendanceScanResponse responseV2 = attendanceService.scanQrAttendance(userId, sessionId, new AttendanceScanRequest(tokenV2));
        assertEquals("ALREADY_MARKED", responseV2.getResult());
    }

    @Test
    @DisplayName("Zero PII in QR: QR payload encodes strictly the opaque token with no personal data")
    void testQrContainsNoPersonalData() throws Exception {
        String token = qrCodeService.generateToken(studentA.getId(), studentA.getQrVersion());

        // Token string itself must not contain personal identifiers
        assertFalse(token.contains("Kamal"), "Token must not contain student name");
        assertFalse(token.contains("Silva"), "Token must not contain student surname");
        assertFalse(token.contains("STU001"), "Token must not contain student ID");
        assertFalse(token.contains("silva@nsbm.ac.lk"), "Token must not contain email");
        assertFalse(token.contains("@"), "Token must not contain email markers");

        // Generate actual QR PNG bytes
        byte[] qrPng = qrCodeService.generateQrPng(token, 300);
        assertNotNull(qrPng);
        assertTrue(qrPng.length > 0);

        // Decode the QR image with ZXing to verify decoded content
        BinaryBitmap bitmap = new BinaryBitmap(new HybridBinarizer(
                new BufferedImageLuminanceSource(ImageIO.read(new ByteArrayInputStream(qrPng)))
        ));
        Result decodedResult = new MultiFormatReader().decode(bitmap);

        assertNotNull(decodedResult);
        assertEquals(token, decodedResult.getText(), "Decoded QR matrix content must match ONLY the opaque token");
        assertFalse(decodedResult.getText().contains("STU001"), "Decoded QR must not leak student ID");
        assertFalse(decodedResult.getText().contains("Kamal"), "Decoded QR must not leak student name");
    }

    @Test
    @DisplayName("Bulk Export: ZIP contains one valid readable PNG per student")
    void testBulkZipContainsOneValidPngPerStudent() throws IOException {
        when(studentRepository.findByBatchIdAndLabGroupIdAndIsActiveTrue(batch.getId(), groupA.getId()))
                .thenReturn(List.of(studentA, studentB));

        byte[] zipBytes = qrCodeService.generateBulkZip(batch.getId(), groupA.getId(), null, false);
        assertNotNull(zipBytes);
        assertTrue(zipBytes.length > 0);

        Map<String, byte[]> zipEntries = new HashMap<>();
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(zipBytes))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                byte[] content = zis.readAllBytes();
                zipEntries.put(entry.getName(), content);
                zis.closeEntry();
            }
        }

        assertEquals(2, zipEntries.size(), "Bulk ZIP must contain exactly 2 student QR PNGs");

        assertTrue(zipEntries.keySet().stream().anyMatch(name -> name.startsWith("STU001_Kamal_Silva")));
        assertTrue(zipEntries.keySet().stream().anyMatch(name -> name.startsWith("STU002_Nimal_Perera")));

        // Verify each entry has valid PNG header magic bytes [0x89, 'P', 'N', 'G']
        for (byte[] fileContent : zipEntries.values()) {
            assertTrue(fileContent.length > 8);
            assertEquals((byte) 0x89, fileContent[0]);
            assertEquals((byte) 'P', fileContent[1]);
            assertEquals((byte) 'N', fileContent[2]);
            assertEquals((byte) 'G', fileContent[3]);
        }
    }

    @Test
    @DisplayName("Bulk PDF Sheet: produces printable A4 PDF sticker document")
    void testBulkPdfContainsValidDocument() {
        when(studentRepository.findByBatchIdAndLabGroupIdAndIsActiveTrue(batch.getId(), groupA.getId()))
                .thenReturn(List.of(studentA, studentB));

        byte[] pdfBytes = qrCodeService.generateStickerSheetPdf(batch.getId(), groupA.getId(), null);
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 100);

        // Verify standard PDF signature %PDF-
        assertEquals((byte) '%', pdfBytes[0]);
        assertEquals((byte) 'P', pdfBytes[1]);
        assertEquals((byte) 'D', pdfBytes[2]);
        assertEquals((byte) 'F', pdfBytes[3]);
    }
}
