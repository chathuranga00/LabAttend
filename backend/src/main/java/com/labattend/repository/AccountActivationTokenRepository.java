package com.labattend.repository;

import com.labattend.entity.AccountActivationToken;
import com.labattend.entity.enums.TokenPurpose;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccountActivationTokenRepository extends JpaRepository<AccountActivationToken, UUID> {

    Optional<AccountActivationToken> findByTokenHash(String tokenHash);

    Optional<AccountActivationToken> findByTokenHashAndPurpose(String tokenHash, TokenPurpose purpose);

    List<AccountActivationToken> findByUserIdAndPurposeAndUsedAtIsNull(UUID userId, TokenPurpose purpose);

    Optional<AccountActivationToken> findTopByUserIdAndPurposeOrderByCreatedAtDesc(UUID userId, TokenPurpose purpose);

    @Modifying
    @Query("UPDATE AccountActivationToken t SET t.usedAt = :now WHERE t.user.id = :userId AND t.purpose = :purpose AND t.usedAt IS NULL")
    void invalidateUnusedTokens(@Param("userId") UUID userId, @Param("purpose") TokenPurpose purpose, @Param("now") OffsetDateTime now);
}

