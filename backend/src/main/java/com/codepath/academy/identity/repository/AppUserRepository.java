package com.codepath.academy.identity.repository;

import com.codepath.academy.identity.model.AppUser;
import com.codepath.academy.identity.model.UserRole;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {

    Optional<AppUser> findByEmailNormalized(String emailNormalized);

    boolean existsByEmailNormalized(String emailNormalized);

    boolean existsByRole(UserRole role);
}
