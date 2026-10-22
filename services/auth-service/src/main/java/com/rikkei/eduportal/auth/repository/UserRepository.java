package com.rikkei.eduportal.auth.repository;

import com.rikkei.eduportal.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * Repository tối thiểu để xác thực người dùng - cần merge với bản của Vinh.
 */
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
}
