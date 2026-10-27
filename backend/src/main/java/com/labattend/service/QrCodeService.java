package com.labattend.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import com.labattend.dto.response.StudentResponse;
import com.labattend.entity.Student;
import com.labattend.entity.User;
import com.labattend.exception.BadRequestException;
import com.labattend.exception.ResourceNotFoundException;
import com.labattend.repository.StudentRepository;
import com.labattend.repository.UserRepository;
import com.labattend.util.HashUtils;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class QrCodeService {

    private static final Logger log = LoggerFactory.getLogger(QrCodeService.class);

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @Value("${app.qr.hmac-secret:c7b9e1a84f30d25e89a1c6b5d4e3f2a1087654321fedcba0123456789abcdef0}")
    private String hmacSecret;

    @Value("${app.qr.bulk-max-students:500}")
    private int bulkMaxStudents;

    @Value("${app.qr.bulk-rate-limit-per-minute:30}")
    private int bulkRateLimitPerMinute;

    private final ConcurrentHashMap<String, Deque<Long>> rateLimitMap = new ConcurrentHashMap<>();

    public QrCodeService(
            StudentRepository studentRepository,
            UserRepository userRepository,
            AuditLogService auditLogService
    ) {
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
    }

    /**
     * Startup initializer: backfills tokens and qr_version = 1 for any legacy student records.
     */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void backfillMissingTokensOnStartup() {
        try {
            List<Student> students = studentRepository.findAll();
            List<Student> toSave = new ArrayList<>();
            OffsetDateTime now = OffsetDateTime.now();
            for (Student s : students) {
                boolean needsUpdate = false;
                if (s.getQrVersion() == null) {
                    s.setQrVersion(1);
                    needsUpdate = true;
                }
                if (s.getQrGeneratedAt() == null) {
                    s.setQrGeneratedAt(now);
                    needsUpdate = true;
                }
                String token = generateToken(s.getId(), s.getQrVersion());
                String expectedHash = generateTokenHash(token);
                if (!expectedHash.equals(s.getQrTokenHash())) {
                    s.setQrTokenHash(expectedHash);
                    needsUpdate = true;
                }
                if (needsUpdate) {
                    toSave.add(s);
                }
            }
            if (!toSave.isEmpty()) {
                studentRepository.saveAll(toSave);
                log.info("Synchronized QR token hashes for {} existing student records", toSave.size());
            }
        } catch (Exception ex) {
            log.warn("Could not execute startup backfill: {}", ex.getMessage());
        }
    }

    /**
     * Generates the opaque cryptographic token:
     * token = Base64URL(HMAC-SHA256(server_secret, student_uuid + ":" + qr_version)) without padding.
     */
    public String generateToken(UUID studentId, int qrVersion) {
        if (studentId == null) {
            throw new IllegalArgumentException("Student ID cannot be null when generating QR token");
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(hmacSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            String payload = studentId.toString() + ":" + qrVersion;
            byte[] hmacBytes = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hmacBytes);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("Failed to compute HMAC-SHA256 token", e);
        }
    }

    /**
     * Calculates the token hash stored in students.qr_token_hash for indexed lookup.
     */
    public String generateTokenHash(String token) {
        return HashUtils.sha256Hex(token);
    }

    /**
     * Cryptographically verifies that the presented token matches the student and current qrVersion.
     */
    public boolean verifyToken(UUID studentId, int qrVersion, String presentedToken) {
        if (studentId == null || presentedToken == null || presentedToken.isBlank()) {
            return false;
        }
        String expectedToken = generateToken(studentId, qrVersion);
        return MessageDigest.isEqual(
                expectedToken.getBytes(StandardCharsets.UTF_8),
                presentedToken.trim().getBytes(StandardCharsets.UTF_8)
        );
    }

    /**
     * Ensures student has a valid token and hash initialized matching their persistent ID.
     */
    @Transactional
    public Student ensureStudentToken(Student student) {
        boolean changed = false;
        if (student.getQrVersion() == null) {
            student.setQrVersion(1);
            changed = true;
        }
        if (student.getQrGeneratedAt() == null) {
            student.setQrGeneratedAt(OffsetDateTime.now());
            changed = true;
        }
        String token = generateToken(student.getId(), student.getQrVersion());
        String expectedHash = generateTokenHash(token);
        if (!expectedHash.equals(student.getQrTokenHash())) {
            student.setQrTokenHash(expectedHash);
            changed = true;
        }
        if (changed) {
            return studentRepository.save(student);
        }
        return student;
    }

    /**
     * Generates a raw QR Code PNG image for the given token.
     */
    public byte[] generateQrPng(String token, int size) {
        try {
            Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
            hints.put(EncodeHintType.CHARACTER_SET, StandardCharsets.UTF_8.name());
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.H);
            hints.put(EncodeHintType.MARGIN, 2);

            BitMatrix bitMatrix = new QRCodeWriter().encode(token, BarcodeFormat.QR_CODE, size, size, hints);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", baos);
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate QR code PNG", e);
        }
    }

    /**
     * Generates a print-ready sticker layout PNG with the QR code and student metadata printed underneath.
     */
    public byte[] generateStickerPng(Student student, String token) {
        int width = 500;
        int height = 660;
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2 = image.createGraphics();

        try {
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

            // Background
            g2.setColor(Color.WHITE);
            g2.fillRect(0, 0, width, height);

            // Outer border
            g2.setColor(new Color(226, 232, 240)); // Slate 200
            g2.drawRoundRect(10, 10, width - 20, height - 20, 20, 20);

            // Institutional header banner
            g2.setColor(new Color(15, 23, 42)); // Slate 900
            g2.fillRoundRect(10, 10, width - 20, 48, 20, 20);
            g2.fillRect(10, 38, width - 20, 20); // Square off bottom corners of header

            g2.setColor(Color.WHITE);
            g2.setFont(new java.awt.Font(java.awt.Font.SANS_SERIF, java.awt.Font.BOLD, 14));
            FontMetrics fmHeader = g2.getFontMetrics();
            String headerText = "NSBM GREEN UNIVERSITY • LABATTEND";
            int headerX = (width - fmHeader.stringWidth(headerText)) / 2;
            g2.drawString(headerText, headerX, 38);

            // Centered QR Code
            int qrSize = 340;
            byte[] qrBytes = generateQrPng(token, qrSize);
            BufferedImage qrImage = ImageIO.read(new java.io.ByteArrayInputStream(qrBytes));
            int qrX = (width - qrSize) / 2;
            int qrY = 75;
            g2.drawImage(qrImage, qrX, qrY, null);

            // Divider line
            g2.setColor(new Color(241, 245, 249)); // Slate 100
            g2.drawLine(30, qrY + qrSize + 15, width - 30, qrY + qrSize + 15);

            // Student Full Name
            g2.setColor(new Color(15, 23, 42)); // Slate 900
            g2.setFont(new java.awt.Font(java.awt.Font.SANS_SERIF, java.awt.Font.BOLD, 20));
            FontMetrics fmName = g2.getFontMetrics();
            String name = student.getFullName();
            if (fmName.stringWidth(name) > width - 40) {
                while (name.length() > 3 && fmName.stringWidth(name + "...") > width - 40) {
                    name = name.substring(0, name.length() - 1);
                }
                name = name + "...";
            }
            int nameX = (width - fmName.stringWidth(name)) / 2;
            g2.drawString(name, nameX, qrY + qrSize + 48);

            // Student ID Badge Pill
            String studentIdText = student.getStudentId();
            g2.setFont(new java.awt.Font(java.awt.Font.MONOSPACED, java.awt.Font.BOLD, 17));
            FontMetrics fmId = g2.getFontMetrics();
            int idWidth = fmId.stringWidth(studentIdText) + 30;
            int idX = (width - idWidth) / 2;
            int idY = qrY + qrSize + 66;

            g2.setColor(new Color(236, 253, 245)); // Emerald 50
            g2.fillRoundRect(idX, idY, idWidth, 32, 12, 12);
            g2.setColor(new Color(16, 185, 129)); // Emerald 500
            g2.drawRoundRect(idX, idY, idWidth, 32, 12, 12);
            g2.setColor(new Color(4, 120, 87)); // Emerald 700
            g2.drawString(studentIdText, idX + 15, idY + 22);

            // Batch & Lab Group Metadata
            String batchCode = student.getBatch() != null ? student.getBatch().getBatchCode() : "N/A";
            String groupName = student.getLabGroup() != null ? "Group " + student.getLabGroup().getGroupName() : "Whole Batch";
            String metaText = "Cohort: " + batchCode + "  •  " + groupName;
            g2.setColor(new Color(71, 85, 105)); // Slate 600
            g2.setFont(new java.awt.Font(java.awt.Font.SANS_SERIF, java.awt.Font.PLAIN, 13));
            FontMetrics fmMeta = g2.getFontMetrics();
            int metaX = (width - fmMeta.stringWidth(metaText)) / 2;
            g2.drawString(metaText, metaX, idY + 56);

            // Security notice / instructions
            String securityNotice = "Official Student Badge • Scan for Attendance";
            g2.setColor(new Color(148, 163, 184)); // Slate 400
            g2.setFont(new java.awt.Font(java.awt.Font.SANS_SERIF, java.awt.Font.ITALIC, 11));
            FontMetrics fmSec = g2.getFontMetrics();
            int secX = (width - fmSec.stringWidth(securityNotice)) / 2;
            g2.drawString(securityNotice, secX, idY + 78);

        } catch (IOException e) {
            throw new RuntimeException("Failed to render sticker image", e);
        } finally {
            g2.dispose();
        }

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            ImageIO.write(image, "PNG", baos);
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to output sticker PNG", e);
        }
    }

    /**
     * Downloads an individual student's QR image (raw PNG or sticker layout).
     * Written to audit_logs.
     */
    @Transactional
    public byte[] getStudentQrImage(UUID studentId, boolean isSticker) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));

        ensureStudentToken(student);
        String token = generateToken(student.getId(), student.getQrVersion());

        byte[] pngBytes = isSticker ? generateStickerPng(student, token) : generateQrPng(token, 300);

        // Audit log single QR download
        auditLogService.logAction(
                "Student",
                student.getId(),
                "QR_DOWNLOAD",
                null,
                Map.of(
                        "studentId", student.getStudentId(),
                        "layout", isSticker ? "sticker" : "standard",
                        "qrVersion", student.getQrVersion()
                )
        );

        return pngBytes;
    }

    /**
     * Regenerates a student's QR token, incrementing qr_version and invalidating older tokens.
     */
    @Transactional
    public StudentResponse regenerateQrCode(UUID studentId, String reason) {
        if (reason == null || reason.trim().isBlank()) {
            throw new BadRequestException("A non-empty justification reason is required to regenerate a student QR token");
        }

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));

        int oldVersion = student.getQrVersion() != null ? student.getQrVersion() : 1;
        int newVersion = oldVersion + 1;
        OffsetDateTime now = OffsetDateTime.now();

        student.setQrVersion(newVersion);
        student.setQrGeneratedAt(now);

        String newToken = generateToken(student.getId(), newVersion);
        student.setQrTokenHash(generateTokenHash(newToken));

        Student saved = studentRepository.save(student);

        // Audit log regeneration
        auditLogService.logAction(
                "Student",
                saved.getId(),
                "QR_REGENERATE",
                Map.of("qrVersion", oldVersion),
                Map.of(
                        "qrVersion", newVersion,
                        "reason", reason.trim(),
                        "generatedAt", now.toString()
                )
        );

        return mapToResponse(saved);
    }

    private StudentResponse mapToResponse(Student s) {
        return StudentResponse.builder()
                .id(s.getId())
                .studentId(s.getStudentId())
                .fullName(s.getFullName())
                .email(s.getEmail())
                .degreeProgrammeId(s.getDegreeProgramme() != null ? s.getDegreeProgramme().getId() : null)
                .degreeProgrammeCode(s.getDegreeProgramme() != null ? s.getDegreeProgramme().getCode() : null)
                .degreeProgrammeName(s.getDegreeProgramme() != null ? s.getDegreeProgramme().getName() : null)
                .batchId(s.getBatch() != null ? s.getBatch().getId() : null)
                .batchCode(s.getBatch() != null ? s.getBatch().getBatchCode() : null)
                .batchAcademicYear(s.getBatch() != null ? s.getBatch().getAcademicYear() : null)
                .labGroupId(s.getLabGroup() != null ? s.getLabGroup().getId() : null)
                .labGroupName(s.getLabGroup() != null ? s.getLabGroup().getGroupName() : null)
                .qrTokenHash(s.getQrTokenHash())
                .hasQrToken(s.getQrTokenHash() != null && !s.getQrTokenHash().isBlank())
                .qrVersion(s.getQrVersion())
                .qrGeneratedAt(s.getQrGeneratedAt())
                .isActive(s.getIsActive())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }

    /**
     * Bulk QR Code ZIP Export: Returns a ZIP of PNGs named StudentID_Name.png.
     */
    @Transactional
    public byte[] generateBulkZip(UUID batchId, UUID groupId, List<UUID> studentIds, boolean isSticker) {
        checkRateLimit(resolveCurrentActorKey());

        List<Student> students = resolveStudentsForBulk(batchId, groupId, studentIds);
        if (students.isEmpty()) {
            throw new BadRequestException("No active students found matching the selected criteria");
        }
        if (students.size() > bulkMaxStudents) {
            throw new BadRequestException(String.format(
                    "Bulk QR export exceeds maximum limit of %d students (selected: %d). Please narrow by batch or lab group.",
                    bulkMaxStudents, students.size()
            ));
        }

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ZipOutputStream zos = new ZipOutputStream(baos)) {

            Set<String> entryNames = new HashSet<>();
            for (Student student : students) {
                ensureStudentToken(student);
                String token = generateToken(student.getId(), student.getQrVersion());
                byte[] imageBytes = isSticker ? generateStickerPng(student, token) : generateQrPng(token, 300);

                String baseName = sanitizeFileName(student.getStudentId()) + "_" + sanitizeFileName(student.getFullName());
                String entryName = baseName + ".png";
                int disambiguation = 1;
                while (entryNames.contains(entryName)) {
                    entryName = baseName + "_" + disambiguation + ".png";
                    disambiguation++;
                }
                entryNames.add(entryName);

                ZipEntry entry = new ZipEntry(entryName);
                zos.putNextEntry(entry);
                zos.write(imageBytes);
                zos.closeEntry();
            }

            zos.finish();

            // Audit log bulk download
            auditLogService.logAction(
                    "Student",
                    null,
                    "QR_BULK_DOWNLOAD",
                    null,
                    Map.of(
                            "format", "zip",
                            "studentCount", students.size(),
                            "batchId", batchId != null ? batchId.toString() : "all",
                            "groupId", groupId != null ? groupId.toString() : "all",
                            "layout", isSticker ? "sticker" : "standard"
                    )
            );

            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to create bulk QR ZIP archive", e);
        }
    }

    /**
     * Bulk QR Code PDF Export: Returns a printable PDF sheet (3x8 stickers per A4 page).
     */
    @Transactional
    public byte[] generateStickerSheetPdf(UUID batchId, UUID groupId, List<UUID> studentIds) {
        checkRateLimit(resolveCurrentActorKey());

        List<Student> students = resolveStudentsForBulk(batchId, groupId, studentIds);
        if (students.isEmpty()) {
            throw new BadRequestException("No active students found matching the selected criteria");
        }
        if (students.size() > bulkMaxStudents) {
            throw new BadRequestException(String.format(
                    "Bulk QR export exceeds maximum limit of %d students (selected: %d). Please narrow by batch or lab group.",
                    bulkMaxStudents, students.size()
            ));
        }

        Document document = new Document(PageSize.A4, 14, 14, 18, 18);
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PdfWriter.getInstance(document, out);
            document.open();

            Font idFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.BLACK);
            Font nameFont = FontFactory.getFont(FontFactory.HELVETICA, 7, Color.DARK_GRAY);
            Font metaFont = FontFactory.getFont(FontFactory.HELVETICA, 6, new Color(71, 85, 105));

            PdfPTable table = new PdfPTable(3);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1f, 1f, 1f});

            for (Student student : students) {
                ensureStudentToken(student);
                String token = generateToken(student.getId(), student.getQrVersion());
                byte[] qrPng = generateQrPng(token, 180);

                Image qrImage = Image.getInstance(qrPng);
                qrImage.scaleToFit(56, 56);
                qrImage.setAlignment(Element.ALIGN_CENTER);

                PdfPCell cell = new PdfPCell();
                cell.setFixedHeight(94f); // 8 rows on A4 page
                cell.setPadding(3f);
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setBorderColor(new Color(203, 213, 225)); // Slate 300 guide border

                cell.addElement(qrImage);

                Paragraph pId = new Paragraph(student.getStudentId(), idFont);
                pId.setAlignment(Element.ALIGN_CENTER);
                pId.setSpacingBefore(1f);
                cell.addElement(pId);

                String name = student.getFullName();
                if (name.length() > 24) {
                    name = name.substring(0, 22) + "..";
                }
                Paragraph pName = new Paragraph(name, nameFont);
                pName.setAlignment(Element.ALIGN_CENTER);
                cell.addElement(pName);

                String batchCode = student.getBatch() != null ? student.getBatch().getBatchCode() : "";
                String groupName = student.getLabGroup() != null ? "Gr " + student.getLabGroup().getGroupName() : "";
                Paragraph pMeta = new Paragraph(batchCode + (groupName.isEmpty() ? "" : " • " + groupName), metaFont);
                pMeta.setAlignment(Element.ALIGN_CENTER);
                cell.addElement(pMeta);

                table.addCell(cell);
            }

            table.completeRow();
            document.add(table);
            document.close();

            // Audit log bulk download
            auditLogService.logAction(
                    "Student",
                    null,
                    "QR_BULK_DOWNLOAD",
                    null,
                    Map.of(
                            "format", "pdf",
                            "studentCount", students.size(),
                            "batchId", batchId != null ? batchId.toString() : "all",
                            "groupId", groupId != null ? groupId.toString() : "all"
                    )
            );

            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF sticker sheet", e);
        }
    }

    private List<Student> resolveStudentsForBulk(UUID batchId, UUID groupId, List<UUID> studentIds) {
        if (studentIds != null && !studentIds.isEmpty()) {
            return studentRepository.findAllById(studentIds).stream()
                    .filter(s -> Boolean.TRUE.equals(s.getIsActive()))
                    .sorted(Comparator.comparing(Student::getStudentId))
                    .toList();
        } else if (batchId != null && groupId != null) {
            return studentRepository.findByBatchIdAndLabGroupIdAndIsActiveTrue(batchId, groupId);
        } else if (batchId != null) {
            return studentRepository.findByBatchIdAndIsActiveTrueOrderByStudentIdAsc(batchId);
        } else {
            return studentRepository.findAll().stream()
                    .filter(s -> Boolean.TRUE.equals(s.getIsActive()))
                    .sorted(Comparator.comparing(Student::getStudentId))
                    .toList();
        }
    }

    private String sanitizeFileName(String input) {
        if (input == null) return "student";
        return input.trim().replaceAll("[^a-zA-Z0-9_.-]", "_");
    }

    private void checkRateLimit(String key) {
        long now = System.currentTimeMillis();
        long windowStart = now - 60_000L;
        Deque<Long> timestamps = rateLimitMap.computeIfAbsent(key, k -> new ConcurrentLinkedDeque<>());
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && timestamps.peekFirst() < windowStart) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= bulkRateLimitPerMinute) {
                throw new BadRequestException("Bulk QR export rate limit exceeded (" + bulkRateLimitPerMinute + "/min). Please wait a moment before trying again.");
            }
            timestamps.addLast(now);
        }
    }

    private String resolveCurrentActorKey() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null) {
            return auth.getName();
        }
        return "anonymous";
    }
}
