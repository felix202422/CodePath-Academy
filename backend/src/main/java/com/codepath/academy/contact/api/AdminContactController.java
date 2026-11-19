package com.codepath.academy.contact.api;

import com.codepath.academy.contact.api.dto.ContactMessageResponse;
import com.codepath.academy.contact.service.ContactService;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Administrator inbox for contact-form messages: newest-first listing and an
 * idempotent read marker. Route rules require ROLE_ADMIN; marking read is a
 * mutation, so it lands in the audit trail like every other admin write.
 */
@RestController
@RequestMapping("/api/v1/admin/contact-messages")
public class AdminContactController {

    private final ContactService contactService;

    public AdminContactController(ContactService contactService) {
        this.contactService = contactService;
    }

    @GetMapping
    public List<ContactMessageResponse> list() {
        return contactService.list();
    }

    @PostMapping("/{id}/read")
    public ContactMessageResponse markRead(@PathVariable UUID id) {
        return contactService.markRead(id);
    }
}
