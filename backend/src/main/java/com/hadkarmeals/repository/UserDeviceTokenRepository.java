package com.hadkarmeals.repository;

import com.hadkarmeals.entity.UserDeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface UserDeviceTokenRepository extends JpaRepository<UserDeviceToken, Long> {

    Optional<UserDeviceToken> findByUserIdAndFcmToken(Long userId, String fcmToken);

    List<UserDeviceToken> findByUserIdAndActiveTrue(Long userId);

    @Query("SELECT udt.fcmToken FROM UserDeviceToken udt WHERE udt.user.id = :userId AND udt.active = true")
    List<String> findActiveTokensByUserId(@Param("userId") Long userId);

    @Query("SELECT udt.fcmToken FROM UserDeviceToken udt JOIN Student s ON s.user.id = udt.user.id WHERE s.hostel.id = :hostelId AND udt.active = true")
    List<String> findActiveTokensByHostelId(@Param("hostelId") Long hostelId);

    @Query("SELECT udt.fcmToken FROM UserDeviceToken udt JOIN Student s ON s.user.id = udt.user.id WHERE s.id IN :studentIds AND udt.active = true")
    List<String> findActiveTokensByStudentIds(@Param("studentIds") List<Long> studentIds);

    @Query("SELECT udt.fcmToken FROM UserDeviceToken udt WHERE udt.active = true")
    List<String> findAllActiveTokens();

    void deleteByFcmToken(String fcmToken);
}
