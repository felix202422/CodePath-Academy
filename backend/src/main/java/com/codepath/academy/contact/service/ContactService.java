package com.codepath.academy.contact.service;

import com.codepath.academy.common.error.ApiException;
import com.codepath.academy.contact.api.dto.ContactMessageRequest;
import com.codepath.academy.contact.api.dto.ContactMessageResponse;
import com.codepath.academy.contact.model.ContactMessage;
import com.codepath.academy.contact.repository.ContactMessageRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Contact-form persistence. Submissions are anonymous by design (no account,
 * no session requirement); administrators list and mark messages read. There
 * is no email delivery — the inbox table is the delivery mechanism.
 */
@Service
public class ContactService {

    private final ContactMessageRepository repository;

    public ContactService(ContactMessageRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public ContactMessageResponse submit(ContactMessageRequest request) {
        ContactMessage message = new ContactMessage();
        message.setName(request.name().trim());
        message.setEmail(request.email().trim());
        message.setSubject(request.subject().trim());
        message.setMessage(request.message().trim());
        return ContactMessageResponse.from(repository.save(message));
    }

    @Transactional(readOnly = true)
    public List<ContactMessageResponse> list() {
        return repository.findTop100ByOrderByCreatedAtDesc().stream()
                .map(ContactMessageResponse::from)
                .toList();
    }

    /** Idempotent: the first open stamps readAt; later opens return the row unchanged. */
    @Transactional
    public ContactMessageResponse markRead(UUID id) {
        ContactMessage message = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("This message no longer exists."));
        if (message.getReadAt() == null) {
            message.setReadAt(Instant.now());
        }
        return ContactMessageResponse.from(repository.save(message));
    }
}
