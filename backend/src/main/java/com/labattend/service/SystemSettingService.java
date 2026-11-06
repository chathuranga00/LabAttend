package com.labattend.service;

import com.labattend.entity.SystemSetting;
import com.labattend.entity.User;
import com.labattend.exception.BadRequestException;
import com.labattend.repository.SystemSettingRepository;
import com.labattend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@Transactional
public class SystemSettingService {

    public static final String KEY_LOW_ATTENDANCE_THRESHOLD = "low_attendance_threshold";
    public static final double DEFAULT_THRESHOLD = 80.0;

    private final SystemSettingRepository systemSettingRepository;
    private final UserRepository userRepository;

    public SystemSettingService(SystemSettingRepository systemSettingRepository, UserRepository userRepository) {
        this.systemSettingRepository = systemSettingRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public double getLowAttendanceThreshold() {
        return systemSettingRepository.findByKey(KEY_LOW_ATTENDANCE_THRESHOLD)
                .map(setting -> {
                    try {
                        return Double.parseDouble(setting.getValue());
                    } catch (NumberFormatException e) {
                        return DEFAULT_THRESHOLD;
                    }
                })
                .orElse(DEFAULT_THRESHOLD);
    }

    public double setLowAttendanceThreshold(double threshold, UUID updatedByUserId) {
        if (threshold < 0.0 || threshold > 100.0) {
            throw new BadRequestException("Attendance threshold percentage must be between 0.0 and 100.0");
        }

        User user = updatedByUserId != null ? userRepository.findById(updatedByUserId).orElse(null) : null;

        SystemSetting setting = systemSettingRepository.findByKey(KEY_LOW_ATTENDANCE_THRESHOLD)
                .orElseGet(() -> SystemSetting.builder()
                        .key(KEY_LOW_ATTENDANCE_THRESHOLD)
                        .description("Threshold percentage below which attendance is considered low or at risk")
                        .build());

        setting.setValue(String.format(java.util.Locale.US, "%.1f", threshold));
        setting.setUpdatedAt(OffsetDateTime.now());
        setting.setUpdatedBy(user);

        systemSettingRepository.save(setting);
        return threshold;
    }
}
