-- Phase 14: privacy, consent, and contact — the contact-form inbox.
--
-- The academy has no SMTP integration by design: the public contact form
-- stores messages here and administrators read them from the admin inbox.
-- Nothing is emailed and no message content leaves the database.

CREATE TABLE contact_message (
    id         UUID PRIMARY KEY,
    name       VARCHAR(160)  NOT NULL,
    email      VARCHAR(320)  NOT NULL,
    subject    VARCHAR(200)  NOT NULL,
    message    VARCHAR(4000) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Set when an administrator first opens the message; null means unread.
    read_at    TIMESTAMP WITH TIME ZONE
);

-- Inbox reads are strictly newest-first.
CREATE INDEX ix_contact_message_created_at ON contact_message (created_at DESC);
