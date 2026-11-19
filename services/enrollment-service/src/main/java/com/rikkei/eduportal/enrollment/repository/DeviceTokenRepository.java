package com.rikkei.eduportal.enrollment.repository;

import com.rikkei.eduportal.enrollment.entity.DeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {

    Optional<DeviceToken> findByToken(String token);

    List<DeviceToken> findByUserIdAndIsActiveTrue(Long userId);

    List<DeviceToken> findByUserUsernameAndIsActiveTrue(String username);

    Optional<DeviceToken> findByTokenAndUserId(String token, Long userId);

    @Modifying
    @Query("UPDATE DeviceToken d SET d.isActive = false, d.updatedAt = CURRENT_TIMESTAMP WHERE d.token = :token")
    void deactivateToken(@Param("token") String token);

    @Modifying
    @Query("UPDATE DeviceToken d SET d.isActive = false, d.updatedAt = CURRENT_TIMESTAMP WHERE d.token = :token AND d.user.id = :userId")
    int deactivateTokenByUser(@Param("token") String token, @Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM DeviceToken d WHERE d.token = :token AND d.user.id = :userId")
    int deleteByTokenAndUserId(@Param("token") String token, @Param("userId") Long userId);
}
