package com.codepath.academy.contact.repository;

import com.codepath.academy.contact.model.ContactMessage;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContactMessageRepository extends JpaRepository<ContactMessage, UUID> {

    /** Administrator inbox: newest first, capped so the list stays bounded. */
    List<ContactMessage> findTop100ByOrderByCreatedAtDesc();
}
