-- CodePath Academy baseline schema.
-- Written for PostgreSQL 18. Application-assigned UUIDs keep the migration portable
-- across PostgreSQL and the H2 PostgreSQL-compatibility test profile.

CREATE TABLE app_user (
    id                  UUID PRIMARY KEY,
    email               VARCHAR(320) NOT NULL,
    email_normalized    VARCHAR(320) NOT NULL,
    password_hash       VARCHAR(100) NOT NULL,
    full_name           VARCHAR(160) NOT NULL,
    role                VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT', 'ADMIN')),
    status              VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED')),
    interests           VARCHAR(500),
    failed_attempts     INTEGER NOT NULL DEFAULT 0,
    locked_until        TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ux_app_user_email_normalized ON app_user (email_normalized);
CREATE INDEX ix_app_user_status ON app_user (status);
CREATE INDEX ix_app_user_role_status ON app_user (role, status);

CREATE TABLE registration_request (
    id              UUID PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by_id  UUID REFERENCES app_user (id),
    review_notes    VARCHAR(1000),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at     TIMESTAMP WITH TIME ZONE,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ux_registration_request_user ON registration_request (user_id);
CREATE INDEX ix_registration_request_status ON registration_request (status, created_at);

CREATE TABLE learning_path (
    id              UUID PRIMARY KEY,
    slug            VARCHAR(120) NOT NULL,
    name            VARCHAR(160) NOT NULL,
    summary         VARCHAR(500) NOT NULL,
    description     TEXT,
    accent_color    VARCHAR(7),
    display_order   INTEGER NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ux_learning_path_slug ON learning_path (slug);
CREATE INDEX ix_learning_path_status_order ON learning_path (status, display_order);

CREATE TABLE course (
    id                  UUID PRIMARY KEY,
    learning_path_id    UUID NOT NULL REFERENCES learning_path (id) ON DELETE RESTRICT,
    slug                VARCHAR(140) NOT NULL,
    title               VARCHAR(200) NOT NULL,
    summary             VARCHAR(600) NOT NULL,
    description         TEXT,
    level               VARCHAR(30) NOT NULL DEFAULT 'BEGINNER'
                        CHECK (level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
    estimated_hours     INTEGER,
    status              VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    source_repository   VARCHAR(200),
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ux_course_slug ON course (slug);
CREATE INDEX ix_course_path_status ON course (learning_path_id, status);
CREATE INDEX ix_course_status ON course (status);

CREATE TABLE course_prerequisite (
    course_id           UUID NOT NULL REFERENCES course (id) ON DELETE CASCADE,
    prerequisite_id     UUID NOT NULL REFERENCES course (id) ON DELETE CASCADE,
    PRIMARY KEY (course_id, prerequisite_id),
    CONSTRAINT ck_course_prerequisite_not_self CHECK (course_id <> prerequisite_id)
);

CREATE TABLE course_module (
    id              UUID PRIMARY KEY,
    course_id       UUID NOT NULL REFERENCES course (id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    summary         VARCHAR(600),
    display_order   INTEGER NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_course_module_course_order ON course_module (course_id, display_order);

CREATE TABLE lesson (
    id                  UUID PRIMARY KEY,
    module_id           UUID NOT NULL REFERENCES course_module (id) ON DELETE CASCADE,
    slug                VARCHAR(160) NOT NULL,
    title               VARCHAR(240) NOT NULL,
    summary             VARCHAR(600),
    body_markdown       TEXT NOT NULL,
    display_order       INTEGER NOT NULL DEFAULT 0,
    status              VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    content_hash        VARCHAR(64) NOT NULL,
    source_repository   VARCHAR(200),
    source_path         VARCHAR(500),
    source_commit       VARCHAR(40),
    source_hash         VARCHAR(64),
    edited_by_admin     BOOLEAN NOT NULL DEFAULT FALSE,
    published_at        TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ux_lesson_module_slug ON lesson (module_id, slug);
CREATE INDEX ix_lesson_module_order ON lesson (module_id, display_order);
CREATE INDEX ix_lesson_status ON lesson (status);
CREATE UNIQUE INDEX ux_lesson_source_hash
    ON lesson (source_repository, source_path, source_hash)
    WHERE source_hash IS NOT NULL;

CREATE TABLE lesson_resource (
    id              UUID PRIMARY KEY,
    lesson_id       UUID NOT NULL REFERENCES lesson (id) ON DELETE CASCADE,
    kind            VARCHAR(30) NOT NULL CHECK (kind IN ('IMAGE', 'FILE', 'LINK', 'VIDEO')),
    title           VARCHAR(240) NOT NULL,
    location        VARCHAR(1000) NOT NULL,
    mime_type       VARCHAR(120),
    size_bytes      BIGINT,
    checksum        VARCHAR(64),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_lesson_resource_lesson ON lesson_resource (lesson_id);

CREATE TABLE course_enrollment (
    id                      UUID PRIMARY KEY,
    course_id               UUID NOT NULL REFERENCES course (id) ON DELETE CASCADE,
    student_id              UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by_id          UUID REFERENCES app_user (id),
    review_notes            VARCHAR(1000),
    requested_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at             TIMESTAMP WITH TIME ZONE,
    last_accessed_at        TIMESTAMP WITH TIME ZONE,
    last_accessed_lesson_id UUID,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ux_course_enrollment_course_student ON course_enrollment (course_id, student_id);
CREATE INDEX ix_course_enrollment_student_status ON course_enrollment (student_id, status);
CREATE INDEX ix_course_enrollment_course_status ON course_enrollment (course_id, status, requested_at);

CREATE TABLE lesson_progress (
    id              UUID PRIMARY KEY,
    student_id      UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    lesson_id       UUID NOT NULL REFERENCES lesson (id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS'
                    CHECK (status IN ('IN_PROGRESS', 'COMPLETED')),
    completed_at    TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ux_lesson_progress_student_lesson ON lesson_progress (student_id, lesson_id);
CREATE INDEX ix_lesson_progress_student ON lesson_progress (student_id, last_accessed_at DESC);

CREATE TABLE assessment (
    id                  UUID PRIMARY KEY,
    course_id           UUID NOT NULL REFERENCES course (id) ON DELETE CASCADE,
    module_id           UUID REFERENCES course_module (id) ON DELETE SET NULL,
    title               VARCHAR(240) NOT NULL,
    description         VARCHAR(2000),
    pass_score_percent  INTEGER NOT NULL DEFAULT 70 CHECK (pass_score_percent BETWEEN 0 AND 100),
    max_attempts        INTEGER NOT NULL DEFAULT 1 CHECK (max_attempts > 0),
    time_limit_minutes  INTEGER CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0),
    display_order       INTEGER NOT NULL DEFAULT 0,
    status              VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_assessment_course_status ON assessment (course_id, status, display_order);

CREATE TABLE assessment_question (
    id              UUID PRIMARY KEY,
    assessment_id   UUID NOT NULL REFERENCES assessment (id) ON DELETE CASCADE,
    question_type   VARCHAR(30) NOT NULL
                    CHECK (question_type IN ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'MULTI_ANSWER', 'SHORT_ANSWER')),
    prompt          TEXT NOT NULL,
    explanation     TEXT,
    points          INTEGER NOT NULL DEFAULT 1 CHECK (points > 0),
    display_order   INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_assessment_question_assessment ON assessment_question (assessment_id, display_order);

CREATE TABLE assessment_option (
    id              UUID PRIMARY KEY,
    question_id     UUID NOT NULL REFERENCES assessment_question (id) ON DELETE CASCADE,
    option_text     TEXT NOT NULL,
    is_correct      BOOLEAN NOT NULL DEFAULT FALSE,
    display_order   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX ix_assessment_option_question ON assessment_option (question_id, display_order);

CREATE TABLE assessment_attempt (
    id              UUID PRIMARY KEY,
    assessment_id   UUID NOT NULL REFERENCES assessment (id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    attempt_number  INTEGER NOT NULL CHECK (attempt_number > 0),
    status          VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS'
                    CHECK (status IN ('IN_PROGRESS', 'SUBMITTED')),
    started_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at    TIMESTAMP WITH TIME ZONE,
    score           INTEGER,
    max_score       INTEGER,
    passed          BOOLEAN,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ux_assessment_attempt_unique UNIQUE (assessment_id, student_id, attempt_number)
);

CREATE INDEX ix_assessment_attempt_student ON assessment_attempt (student_id, submitted_at DESC);

CREATE TABLE assessment_answer (
    id              UUID PRIMARY KEY,
    attempt_id      UUID NOT NULL REFERENCES assessment_attempt (id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES assessment_question (id) ON DELETE CASCADE,
    answer_text     TEXT,
    is_correct      BOOLEAN,
    points_awarded  INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ux_assessment_answer_attempt_question ON assessment_answer (attempt_id, question_id);

CREATE TABLE assessment_answer_option (
    answer_id   UUID NOT NULL REFERENCES assessment_answer (id) ON DELETE CASCADE,
    option_id   UUID NOT NULL REFERENCES assessment_option (id) ON DELETE CASCADE,
    PRIMARY KEY (answer_id, option_id)
);

CREATE TABLE announcement (
    id              UUID PRIMARY KEY,
    title           VARCHAR(240) NOT NULL,
    body_markdown   TEXT NOT NULL,
    audience        VARCHAR(20) NOT NULL DEFAULT 'STUDENTS'
                    CHECK (audience IN ('STUDENTS', 'ALL')),
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    published_at    TIMESTAMP WITH TIME ZONE,
    created_by_id   UUID REFERENCES app_user (id),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_announcement_status ON announcement (status, published_at DESC);

CREATE TABLE notification (
    id              UUID PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    type            VARCHAR(60) NOT NULL,
    title           VARCHAR(240) NOT NULL,
    body            VARCHAR(2000),
    link_path       VARCHAR(500),
    read_at         TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_notification_user_created ON notification (user_id, created_at DESC);
CREATE INDEX ix_notification_user_unread ON notification (user_id) WHERE read_at IS NULL;

CREATE TABLE content_import (
    id                  UUID PRIMARY KEY,
    source_repository   VARCHAR(200) NOT NULL,
    source_commit       VARCHAR(40) NOT NULL,
    source_path         VARCHAR(500) NOT NULL,
    source_hash         VARCHAR(64) NOT NULL,
    target_lesson_id    UUID REFERENCES lesson (id) ON DELETE SET NULL,
    status              VARCHAR(30) NOT NULL
                        CHECK (status IN ('IMPORTED', 'UNCHANGED', 'CONFLICT', 'FAILED')),
    message             VARCHAR(2000),
    imported_by_id      UUID REFERENCES app_user (id),
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ux_content_import_source ON content_import (source_repository, source_path, source_hash);
CREATE INDEX ix_content_import_created ON content_import (created_at DESC);

CREATE TABLE audit_log (
    id              UUID PRIMARY KEY,
    actor_user_id   UUID REFERENCES app_user (id) ON DELETE SET NULL,
    action          VARCHAR(120) NOT NULL,
    entity_type     VARCHAR(80) NOT NULL,
    entity_id       VARCHAR(80),
    details         TEXT,
    ip_address      VARCHAR(60),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_audit_log_created ON audit_log (created_at DESC);
CREATE INDEX ix_audit_log_actor ON audit_log (actor_user_id, created_at DESC);
CREATE INDEX ix_audit_log_entity ON audit_log (entity_type, entity_id);

-- Spring Session JDBC: restart-safe, database-backed browser sessions.
CREATE TABLE SPRING_SESSION (
    PRIMARY_ID            VARCHAR(36) NOT NULL,
    SESSION_ID            VARCHAR(36) NOT NULL,
    CREATION_TIME         BIGINT NOT NULL,
    LAST_ACCESS_TIME      BIGINT NOT NULL,
    MAX_INACTIVE_INTERVAL INTEGER NOT NULL,
    EXPIRY_TIME           BIGINT NOT NULL,
    PRINCIPAL_NAME        VARCHAR(100),
    CONSTRAINT SPRING_SESSION_PK PRIMARY KEY (PRIMARY_ID)
);

CREATE UNIQUE INDEX SPRING_SESSION_IX1 ON SPRING_SESSION (SESSION_ID);
CREATE INDEX SPRING_SESSION_IX2 ON SPRING_SESSION (EXPIRY_TIME);
CREATE INDEX SPRING_SESSION_IX3 ON SPRING_SESSION (PRINCIPAL_NAME);

CREATE TABLE SPRING_SESSION_ATTRIBUTES (
    SESSION_PRIMARY_ID VARCHAR(36) NOT NULL,
    ATTRIBUTE_NAME     VARCHAR(200) NOT NULL,
    ATTRIBUTE_BYTES    BYTEA NOT NULL,
    CONSTRAINT SPRING_SESSION_ATTRIBUTES_PK PRIMARY KEY (SESSION_PRIMARY_ID, ATTRIBUTE_NAME),
    CONSTRAINT SPRING_SESSION_ATTRIBUTES_FK FOREIGN KEY (SESSION_PRIMARY_ID)
        REFERENCES SPRING_SESSION (PRIMARY_ID) ON DELETE CASCADE
);
