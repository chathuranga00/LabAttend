package com.labattend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.nio.charset.StandardCharsets;

@SpringBootApplication
public class LabAttendApplication {

    public static void main(String[] args) {
        loadDotenv();
        SpringApplication.run(LabAttendApplication.class, args);
    }

    /**
     * Automatically loads .env file properties into JVM System properties for local development
     * if they are not already set in the operating system environment.
     */
    private static void loadDotenv() {
        File[] candidatePaths = {
                new File(".env"),
                new File("backend/.env"),
                new File("../backend/.env"),
                new File("../.env")
        };

        for (File candidate : candidatePaths) {
            if (candidate.exists() && candidate.isFile()) {
                try (BufferedReader reader = new BufferedReader(new FileReader(candidate, StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        line = line.trim();
                        if (line.isEmpty() || line.startsWith("#") || !line.contains("=")) {
                            continue;
                        }
                        int eqIndex = line.indexOf('=');
                        String key = line.substring(0, eqIndex).trim();
                        String value = line.substring(eqIndex + 1).trim();
                        if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
                            value = value.substring(1, value.length() - 1);
                        }
                        if (System.getProperty(key) == null && System.getenv(key) == null) {
                            System.setProperty(key, value);
                        }
                    }
                } catch (Exception ignored) {
                }
                break;
            }
        }
    }
}
