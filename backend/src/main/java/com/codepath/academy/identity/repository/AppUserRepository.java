package com.codepath.academy.identity.repository;

import com.codepath.academy.identity.model.AppUser;
import com.codepath.academy.identity.model.UserRole;
import com.codepath.academy.identity.model.UserStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {

    Optional<AppUser> findByEmailNormalized(String emailNormalized);

    boolean existsByEmailNormalized(String emailNormalized);

    boolean existsByRole(UserRole role);

    List<AppUser> findByRoleOrderByCreatedAtDesc(UserRole role);

    List<AppUser> findByRoleAndStatusOrderByCreatedAtDesc(UserRole role, UserStatus status);

    long countByRoleAndStatus(UserRole role, UserStatus status);
}
