package com.codepath.academy.contact.api.dto;

/** Honest acknowledgement returned after a contact message is stored. */
public record ContactSubmitResponse(String message) {

    public static ContactSubmitResponse stored() {
        return new ContactSubmitResponse(
                "Your message has been recorded. An administrator will review it from the "
                        + "academy's message inbox.");
    }
}
