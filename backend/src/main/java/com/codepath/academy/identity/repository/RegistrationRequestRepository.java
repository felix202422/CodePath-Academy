package com.codepath.academy.identity.repository;

import com.codepath.academy.identity.model.RegistrationRequest;
import com.codepath.academy.identity.model.RegistrationStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RegistrationRequestRepository extends JpaRepository<RegistrationRequest, UUID> {

    List<RegistrationRequest> findByStatusOrderByCreatedAtAsc(RegistrationStatus status);

    Optional<RegistrationRequest> findByUserId(UUID userId);

    @Query("select r from RegistrationRequest r join fetch r.user where r.id = :id")
    Optional<RegistrationRequest> findByIdWithUser(UUID id);
}
