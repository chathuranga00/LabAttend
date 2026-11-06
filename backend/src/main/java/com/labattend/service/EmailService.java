package com.labattend.service;

public interface EmailService {

    /**
     * Sends an account activation invitation to the student with a one-time activation token.
     *
     * @param toEmail      Recipient student university email
     * @param studentName  Full name of the student
     * @param rawToken     One-time unhashed activation token
     */
    void sendActivationEmail(String toEmail, String studentName, String rawToken);

    /**
     * Sends a password reset email to the student with a one-time reset token.
     *
     * @param toEmail      Recipient student university email
     * @param studentName  Full name of the student
     * @param rawToken     One-time unhashed password reset token
     */
    void sendPasswordResetEmail(String toEmail, String studentName, String rawToken);
}

