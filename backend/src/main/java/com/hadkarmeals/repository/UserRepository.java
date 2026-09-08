package com.hadkarmeals.repository;

import com.hadkarmeals.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByPhoneNumber(String phoneNumber);
    Optional<User> findByEmail(String email);
    Optional<User> findByPhoneNumberOrEmail(String phoneNumber, String email);
    Optional<User> findByGoogleId(String googleId);
    boolean existsByPhoneNumber(String phoneNumber);
    boolean existsByEmail(String email);
}
