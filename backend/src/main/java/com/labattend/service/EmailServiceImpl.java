package com.labattend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;

import java.util.Properties;

@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);

    @Value("${app.mail.host:}")
    private String mailHost;

    @Value("${app.mail.port:587}")
    private int mailPort;

    @Value("${app.mail.username:}")
    private String mailUsername;

    @Value("${app.mail.password:}")
    private String mailPassword;

    @Value("${app.mail.from:no-reply@labattend.nsbm.ac.lk}")
    private String mailFrom;

    @Value("${app.mail.student-site-url:http://localhost:5174}")
    private String studentSiteUrl;

    @Override
    public void sendActivationEmail(String toEmail, String studentName, String rawToken) {
        String trimmedBase = studentSiteUrl.endsWith("/")
                ? studentSiteUrl.substring(0, studentSiteUrl.length() - 1)
                : studentSiteUrl;
        String activationUrl = trimmedBase + "/activate?token=" + rawToken;

        String subject = "LabAttend Student Portal — Account Activation";
        String body = String.format(
                "Dear %s,\n\n" +
                "An official LabAttend student account has been provisioned for you.\n" +
                "Please activate your account and establish a secure password using the link below:\n\n" +
                "%s\n\n" +
                "Note: This activation link is strictly single-use and will expire in 24 hours.\n\n" +
                "Regards,\n" +
                "NSBM LabAttend Administration",
                studentName, activationUrl
        );

        // Always log the link to the backend console for development & audit
        log.info("================================================================================");
        log.info("[STUDENT ACTIVATION EMAIL]");
        log.info("To: {}", toEmail);
        log.info("Student: {}", studentName);
        log.info("Activation URL: {}", activationUrl);
        log.info("================================================================================");

        dispatchMailIfConfigured(toEmail, subject, body);
    }

    @Override
    public void sendPasswordResetEmail(String toEmail, String studentName, String rawToken) {
        String trimmedBase = studentSiteUrl.endsWith("/")
                ? studentSiteUrl.substring(0, studentSiteUrl.length() - 1)
                : studentSiteUrl;
        String resetUrl = trimmedBase + "/reset-password?token=" + rawToken;

        String subject = "LabAttend Student Portal — Password Reset Request";
        String body = String.format(
                "Dear %s,\n\n" +
                "We received a request to reset your password for the LabAttend Student Portal.\n" +
                "You can reset your password using the secure link below:\n\n" +
                "%s\n\n" +
                "Note: This link is strictly single-use and will expire in 24 hours. If you did not request this, please disregard this email.\n\n" +
                "Regards,\n" +
                "NSBM LabAttend Administration",
                studentName, resetUrl
        );

        log.info("================================================================================");
        log.info("[STUDENT PASSWORD RESET EMAIL]");
        log.info("To: {}", toEmail);
        log.info("Student: {}", studentName);
        log.info("Password Reset URL: {}", resetUrl);
        log.info("================================================================================");

        dispatchMailIfConfigured(toEmail, subject, body);
    }

    private void dispatchMailIfConfigured(String toEmail, String subject, String body) {
        if (mailHost == null || mailHost.isBlank()) {
            // Development / test fallback: mail host not configured, logging only
            log.debug("SMTP host not configured (app.mail.host is blank). Skipping physical email dispatch.");
            return;
        }

        try {
            JavaMailSender sender = createMailSender();
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);
            sender.send(message);
            log.info("Email successfully dispatched via SMTP ({}:{}) to {}", mailHost, mailPort, toEmail);
        } catch (Exception e) {
            log.error("Failed to send email via SMTP to {}: {}", toEmail, e.getMessage(), e);
        }
    }

    private JavaMailSender createMailSender() {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(mailHost);
        mailSender.setPort(mailPort);
        mailSender.setUsername(mailUsername);
        mailSender.setPassword(mailPassword);

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", String.valueOf(mailUsername != null && !mailUsername.isBlank()));
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.debug", "false");

        return mailSender;
    }
}
