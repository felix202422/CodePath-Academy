package com.codepath.academy.contact.api;

import com.codepath.academy.contact.api.dto.ContactMessageRequest;
import com.codepath.academy.contact.api.dto.ContactMessageResponse;
import com.codepath.academy.contact.api.dto.ContactSubmitResponse;
import com.codepath.academy.contact.service.ContactService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Anonymous public contact form. Route rule permits unauthenticated access;
 * CSRF still applies (the SPA echoes its readable XSRF cookie), and the
 * validation constraints mirror the V6 columns so bad input never reaches
 * the database.
 */
@RestController
@RequestMapping("/api/v1/contact")
public class ContactController {

    private final ContactService contactService;

    public ContactController(ContactService contactService) {
        this.contactService = contactService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ContactSubmitResponse submit(@Valid @RequestBody ContactMessageRequest request) {
        contactService.submit(request);
        return ContactSubmitResponse.stored();
    }
}
