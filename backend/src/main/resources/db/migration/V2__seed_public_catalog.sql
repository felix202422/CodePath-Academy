-- Phase 4 public catalog seed.
--
-- Real metadata from the read-only CodePath-Masterclass clone pinned to the
-- audited commit 62afa4143c26c036169429810fe8bc0b4e9a4de6 (MIT). Titles,
-- summaries, descriptions, and prerequisite chains are taken from the subject
-- README files of that commit. Lesson content is deliberately NOT seeded here:
-- lessons arrive later through the source-aware importer with administrator
-- review (docs/CONTENT-INTEGRATION.md).
--
-- Path assignment follows the mapping in docs/CONTENT-INTEGRATION.md. Where a
-- subject maps to more than one candidate path, one primary path is chosen and
-- the overlap is noted below:
--   03 Developer Tools     -> Backend Development (also candidate for Software Engineering)
--   10 Database Engineering -> Database Engineering (also candidate for Backend Development)
--   15 Application Security -> Cybersecurity (also candidate for Backend Development)
--   06 Internet and Web    -> Frontend Development (also candidate for Computer Networking)
--   16-17                  -> DevOps and Cloud (also candidate for Computer Networking)
-- 00 Start Here (orientation) and 21 Reference Library (lookup shelf) are not
-- study-in-order courses, so they are not seeded as courses.
--
-- Fixed UUIDs keep the seed deterministic across dev, test, and CI databases.

-- Ordering columns used by the public read API (curriculum order).
ALTER TABLE course ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE course_prerequisite ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
CREATE INDEX ix_course_status_display_order ON course (status, display_order);

-- ---------------------------------------------------------------------------
-- Learning paths
-- ---------------------------------------------------------------------------
INSERT INTO learning_path (id, slug, name, summary, description, accent_color, display_order, status) VALUES
('10000000-0000-4000-8000-000000000001', 'software-engineering', 'Software Engineering',
 'The broad core track: foundations, programming, Java, data structures, architecture, testing, and professional practice.',
 'Built from audited curriculum subjects 01-05, 13-14, and 19-20, ordered by prerequisite. Each subject is its own course; the Project Laboratory closes the path with graded projects and a capstone.',
 '#2563eb', 10, 'PUBLISHED'),

('10000000-0000-4000-8000-000000000002', 'frontend-development', 'Frontend Development',
 'Internet and web foundations through HTML/CSS, JavaScript and TypeScript, and professional React engineering.',
 'Built from audited curriculum subjects 06-09 in prerequisite order: how the web works, what pages are made of, how they behave, and how React structures professional frontend work.',
 '#db2777', 20, 'PUBLISHED'),

('10000000-0000-4000-8000-000000000003', 'backend-development', 'Backend Development',
 'Developer tools and backend engineering in Java with Spring Boot: HTTP APIs, persistence, authorization, and tests.',
 'Built from audited curriculum subjects 03 and 11, with subject 10 tracked as the dedicated Database Engineering path. Java, Spring Boot, PostgreSQL, and the test discipline behind a real API.',
 '#0f766e', 30, 'PUBLISHED'),

('10000000-0000-4000-8000-000000000004', 'database-engineering', 'Database Engineering',
 'Relational modelling, SQL, PostgreSQL, transactions, and the design discipline that keeps data correct.',
 'Built from audited curriculum subject 10: modelling, SQL from SELECT through joins and aggregation, keys, constraints, normalization, and transactions executed against a real PostgreSQL server.',
 '#7c3aed', 40, 'PUBLISHED'),

('10000000-0000-4000-8000-000000000005', 'mobile-development', 'Mobile Development',
 'Cross-platform mobile development with Dart and Flutter, from language basics to store release.',
 'Built from audited curriculum subject 12: Dart, Flutter, platform differences, offline realities, and the security expectations that separate a demo from a product.',
 '#ea580c', 50, 'PUBLISHED'),

('10000000-0000-4000-8000-000000000006', 'cybersecurity', 'Cybersecurity',
 'Application security: threat modeling, secure sessions, access control, vulnerability classes, and verified controls.',
 'Built from audited curriculum subject 15, with related material in the backend and infrastructure subjects. Labs are local only; the path stays under review for completeness before it grows.',
 '#dc2626', 60, 'PUBLISHED'),

('10000000-0000-4000-8000-000000000007', 'devops-and-cloud', 'DevOps and Cloud',
 'Containers, CI/CD, cloud platforms, production operations, and advanced engineering practice.',
 'Built from audited curriculum subjects 16-18: infrastructure and delivery, the cloud platform your software runs on, and the senior-level engineering decisions that follow.',
 '#16a34a', 70, 'PUBLISHED'),

-- Draft only: the audited source has no dedicated end-to-end networking
-- subject, so this path is never exposed by the public API until validated
-- material exists (docs/CONTENT-INTEGRATION.md).
('10000000-0000-4000-8000-000000000008', 'computer-networking', 'Computer Networking',
 'Networking coverage drawn from internet foundations and infrastructure subjects.',
 'No dedicated end-to-end networking subject exists in the audited source yet, so this path stays in draft until validated material is available. Related content lives in Internet and Web Foundations and DevOps and Infrastructure.',
 '#475569', 80, 'DRAFT');

-- ---------------------------------------------------------------------------
-- Courses (one per audited subject 01-20, in curriculum order)
-- source_repository records provenance for every row.
-- ---------------------------------------------------------------------------
INSERT INTO course (id, learning_path_id, slug, title, summary, description, level, status, source_repository, display_order) VALUES
('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'computer-foundations', 'Computer Foundations',
 'Before writing programs, you need a working mental model of the machine running them.',
 'Before writing programs, you need a working mental model of the machine running them. This subject builds that model: what a computer is made of, what an operating system does, how files and processes work, how numbers and text are stored in binary, what Boolean logic is, where memory ends and storage begins, and how a program turns into executed instructions.' || E'\n\n' || 'Source: CodePath-Masterclass subject 01-COMPUTER-FOUNDATIONS (MIT), commit 62afa4143c26c036169429810fe8bc0b4e9a4de6.',
 'BEGINNER', 'PUBLISHED', 'https://github.com/felix202422/CodePath-Masterclass', 1),

('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'programming-fundamentals', 'Programming Fundamentals',
 'This subject teaches programming itself, in a language-agnostic way: how to take a plain-language problem and turn it into a running program made of variables, conditions, loops, functions, and arrays - and how to find the bugs when it inevitably misbehaves.',
 'This subject teaches programming itself, in a language-agnostic way: how to take a plain-language problem and turn it into a running program made of variables, conditions, loops, functions, and arrays - and how to find the bugs when it inevitably misbehaves.' || E'\n\n' || 'Source: CodePath-Masterclass subject 02-PROGRAMMING-FUNDAMENTALS (MIT), commit 62afa4143c26c036169429810fe8bc0b4e9a4de6.',
 'BEGINNER', 'PUBLISHED', 'https://github.com/felix202422/CodePath-Masterclass', 2),

('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'developer-tools', 'Developer Tools',
 'Professional developers live in the terminal and keep everything under version control.',
 'Professional developers live in the terminal and keep everything under version control. This subject makes you one of them: command-line fluency on Windows and Linux, editors and IDEs, package managers, environment variables, and the full Git/GitHub workflow including branching, pull requests, and code review.' || E'\n\n' || 'Source: CodePath-Masterclass subject 03-DEVELOPER-TOOLS (MIT), commit 62afa4143c26c036169429810fe8bc0b4e9a4de6.',
 'BEGINNER', 'PUBLISHED', 'https://github.com/felix202422/CodePath-Masterclass', 3),

('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'java-programming', 'Java Programming',
 'Java is the language of this curriculum''s backend track and one of the most widely used languages in industry.',
 'Java is the language of this curriculum''s backend track and one of the most widely used languages in industry. It is also an excellent teaching language: its type system makes your mistakes loud and early, and its object model is explicit. This subject takes you from your first class to streams, concurrency, and an understanding of what the JVM is doing underneath you.' || E'\n\n' || 'Source: CodePath-Masterclass subject 04-JAVA-PROGRAMMING (MIT), commit 62afa4143c26c036169429810fe8bc0b4e9a4de6.',
 'INTERMEDIATE', 'PUBLISHED', 'https://github.com/felix202422/CodePath-Masterclass', 4),

('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'data-structures-and-algorithms', 'Data Structures and Algorithms',
 'This subject teaches you to choose how data is stored and to reason about what your code costs.',
 'This subject teaches you to choose how data is stored and to reason about what your code costs. It is the difference between code that works and code that keeps working as data grows.' || E'\n\n' || 'Source: CodePath-Masterclass subject 05-DATA-STRUCTURES-AND-ALGORITHMS (MIT), commit 62afa4143c26c036169429810fe8bc0b4e9a4de6.',
 'INTERMEDIATE', 'PUBLISHED', 'https://github.com/felix202422/CodePath-Masterclass', 5),

('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000002', 'internet-and-web-foundations', 'Internet and Web Foundations',
 'Everything you build from here on is a participant in a network.',
 'Everything you build from here on is a participant in a network. This subject makes the network visible: what happens between typing an address and seeing a page, and what guarantees you are actually being given.' || E'\n\n' || 'Source: CodePath-Masterclass subject 06-INTERNET-AND-WEB-FOUNDATIONS (MIT), commit 62afa4143c26c036169429810fe8bc0b4e9a4de6.',
 'BEGINNER', 'PUBLISHED', 'https://github.com/felix202422/CodePath-Masterclass', 6),

('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000002', 'html-and-css', 'HTML and CSS',
 'The two languages every web developer uses every day, and the two most often learned badly.',
 'The two languages every web developer uses every day, and the two most often learned badly. HTML gives a page structure and meaning; CSS gives it presentation and layout. This subject teaches both as the design systems they really are, not as tag-and-color collection.' || E'\n\n' || 'Source: CodePath-Masterclass subject 07-HTML-AND-CSS (MIT), commit 62afa4143c26c036169429810fe8bc0b4e9a4de6.',
 'BEGINNER', 'PUBLISHED', 'https://github.com/felix202422/CodePath-Masterclass', 7),

('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000002', 'javascript-and-typescript', 'JavaScript and TypeScript',
 'JavaScript makes a page behave; TypeScript makes that behavior accountable.',
 'JavaScript makes a page behave; TypeScript makes that behavior accountable. This subject covers both in order - modern JavaScript first (values, functions, the DOM, modules, asynchrony, errors), then the type system that has become the industry''s default way to write it.' || E'\n\n' || 'Source: CodePath-Masterclass subject 08-JAVASCRIPT-AND-TYPESCRIPT (MIT), commit 62afa4143c26c036169429810fe8bc0b4e9a4de6.',
 'BEGINNER', 'PUBLISHED', 'https://github.com/felix202422/CodePath-Masterclass', 8),

('20000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000002', 'frontend-engineering', 'Frontend Engineering',
 'This subject teaches professional frontend development with React - built directly on the HTML, CSS, JavaScript, and TypeScript you already have.',
 'This subject teaches professional frontend development with React - built directly on the HTML, CSS, JavaScript, and TypeScript you already have. React does not replace any of them; it structures how your behavior updates what the browser renders.' || E'\n\n' || 'Source: CodePath-Masterclass subject 09-FRONTEND-ENGINEERING (MIT), commit 62afa4143c26c036169429810fe8bc0b4e9a4de6.',
 'INTERMEDIATE', 'PUBLISHED', 'https://github.com/felix202422/CodePath-Masterclass', 9),

('20000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000004', 'database-engineering', 'Database Engineering',
 'This subject teaches how data is actually stored: relational modelling, the SQL language from SELECT through joins and aggregation, and the design discipline that keeps a database correct once real traffic and real mistakes arrive.',
 'This subject teaches how data is actually stored: relational modelling, the SQL language from SELECT through joins and aggregation, and the design discipline (keys, constraints, normalization, transactions) that keeps a database correct once real traffic and real mistakes arrive. Everything here runs against a real PostgreSQL server - the lessons'' value is in executed queries and their honest outputs, not in syntax shown on a slide.' || E'\n\n' || 'Source: CodePath-Masterclass subject 10-DATABASE-ENGINEERING (MIT), commit 62afa4143c26c036169429810fe8bc0b4e9a4de6.',
 'INTERMEDIATE', 'PUBLISHED', 'https://github.com/felix202422/CodePath-Masterclass', 10),

('20000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000003', 'backend-engineering', 'Backend Engineering',
 'This subject builds the server side of real applications in Java with Spring Boot and PostgreSQL: an HTTP API that validates its input, persists correctly, authenticates and authorizes callers, documents itself, logs usefully, and is proven by tests.',
 'This subject builds the server side of real applications in Java with Spring Boot and PostgreSQL: an HTTP API that validates its input, persists correctly, authenticates and authorizes callers, documents itself, logs usefully, and is proven by tests.' || E'\n\n' || 'Source: CodePath-Masterclass subject 11-BACKEND-ENGINEERING (MIT), commit 62afa4143c26c036169429810fe8bc0b4e9a4de6.',
 'INTERMEDIATE', 'PUBLISHED', 'https://github.com/felix202422/CodePath-Masterclass', 11),

('20000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000005', 'mobile-development', 'Mobile Development',
 'This subject teaches cross-platform mobile development with Dart and Flutter, from language basics to store release - including the platform differences, the offline realities, and the security expectations that separate a demo from a product.',
 'This subject teaches cross-platform mobile development with Dart and Flutter, from language basics to store release - including the platform differences, the offline realities, and the security expectations that separate a demo from a product.' || E'\n\n' || 'Source: CodePath-Masterclass subject 12-MOBILE-DEVELOPMENT (MIT), commit 62afa4143c26c036169429810fe8bc0b4e9a4de6.',
 'INTERMEDIATE', 'PUBLISHED', 'https://github.com/felix202422/CodePath-Masterclass', 12),

('20000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000001', 'software-engineering-and-architecture', 'Software Engineering and Architecture',
 'Architecture is not diagrams - it is the set of decisions that are expensive to reverse.',
 'Architecture is not diagrams - it is the set of decisions that are expensive to reverse. This subject teaches you to make those decisions deliberately: from requirements and the full development process, through SOLID and design patterns, to modular monoliths, clean architecture, event-driven systems, and the honest costs of distribution and microservices.' || E'\n\n' || 'Source: CodePath-Masterclass subject 13-SOFTWARE-ENGINEERING-AND-ARCHITECTURE (MIT), commit 62afa4143c26c036169429810fe8bc0b4e9a4de6.',
 'INTERMEDIATE', 'PUBLISHED', 'https://github.com/felix202422/CodePath-Masterclass', 13),

('20000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000001', 'testing-and-quality', 'Testing and Quality',
 'Tests are how a team keeps making changes without fear.',
 'Tests are how a team keeps making changes without fear. This subject teaches the test pyramid, test doubles, TDD, and the quality gates that put testing into a pipeline - with real examples in Java, React, and Flutter, and an honest treatment of what coverage does not tell you.' || E'\n\n' || 'Source: CodePath-Masterclass subject 14-TESTING-AND-QUALITY (MIT), commit 62afa4143c26c036169429810fe8bc0b4e9a4de6.',
 'INTERMEDIATE', 'PUBLISHED', 'https://github.com/felix202422/CodePath-Masterclass', 14),

('20000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000006', 'application-security', 'Application Security',
 'Security is a property of design, not a phase.',
 'Security is a property of design, not a phase. This subject teaches you to think like an attacker in order to build like a defender: model threats, secure passwords and sessions, enforce access control, prevent the vulnerability classes that dominate real breaches, and verify each control with a test - in local labs only.' || E'\n\n' || 'Source: CodePath-Masterclass subject 15-APPLICATION-SECURITY (MIT), commit 62afa4143c26c036169429810fe8bc0b4e9a4de6.',
 'ADVANCED', 'PUBLISHED', 'https://github.com/felix202422/CodePath-Masterclass', 15),

('20000000-0000-4000-8000-000000000016', '10000000-0000-4000-8000-000000000007', 'devops-and-infrastructure', 'DevOps and Infrastructure',
 'Software that cannot be deployed and operated is a prototype.',
 'Software that cannot be deployed and operated is a prototype. This subject covers the whole path from "it runs on my machine" to "it runs reliably in production": Linux operations, shell scripting, Docker, Compose, Nginx, TLS/DNS operations, infrastructure as code, CI/CD with GitHub Actions, deployment strategies, monitoring, and backups.' || E'\n\n' || 'Source: CodePath-Masterclass subject 16-DEVOPS-AND-INFRASTRUCTURE (MIT), commit 62afa4143c26c036169429810fe8bc0b4e9a4de6.',
 'ADVANCED', 'PUBLISHED', 'https://github.com/felix202422/CodePath-Masterclass', 16),

('20000000-0000-4000-8000-000000000017', '10000000-0000-4000-8000-000000000007', 'cloud-and-production', 'Cloud and Production',
 'This subject covers the platform your software runs on: compute, networking, storage, identity, scaling, observability, incidents, and the bill - taught cloud-agnostically with provider-neutral concepts and concrete examples.',
 'This subject covers the platform your software runs on: compute, networking, storage, identity, scaling, observability, incidents, and the bill - taught cloud-agnostically with provider-neutral concepts and concrete examples.' || E'\n\n' || 'Source: CodePath-Masterclass subject 17-CLOUD-AND-PRODUCTION (MIT), commit 62afa4143c26c036169429810fe8bc0b4e9a4de6.',
 'ADVANCED', 'PUBLISHED', 'https://github.com/felix202422/CodePath-Masterclass', 17),

('20000000-0000-4000-8000-000000000018', '10000000-0000-4000-8000-000000000007', 'advanced-engineering', 'Advanced Engineering',
 'This subject covers what senior engineers are actually paid for: making correct decisions under uncertainty, in systems where failure is distributed and expensive.',
 'This subject covers what senior engineers are actually paid for: making correct decisions under uncertainty, in systems where failure is distributed and expensive. Concurrency, messaging, data scaling, distributed patterns, design method, profiling, reliability, large-codebase work and recorded decisions - each taught with the failure it answers.' || E'\n\n' || 'Source: CodePath-Masterclass subject 18-ADVANCED-ENGINEERING (MIT), commit 62afa4143c26c036169429810fe8bc0b4e9a4de6.',
 'ADVANCED', 'PUBLISHED', 'https://github.com/felix202422/CodePath-Masterclass', 18),

('20000000-0000-4000-8000-000000000019', '10000000-0000-4000-8000-000000000001', 'professional-development', 'Professional Development',
 'Engineering is a team activity practised under constraints. By this point in the curriculum you can build software; this subject is about making that ability legible, reviewable, and sustainable in an organisation.',
 'Engineering is a team activity practised under constraints. By this point in the curriculum you can build software; this subject is about making that ability legible, reviewable, and sustainable in an organisation. Nine lessons cover the workflows, habits and communication that turn technical skill into work other people can trust.' || E'\n\n' || 'Source: CodePath-Masterclass subject 19-PROFESSIONAL-DEVELOPMENT (MIT), commit 62afa4143c26c036169429810fe8bc0b4e9a4de6.',
 'INTERMEDIATE', 'PUBLISHED', 'https://github.com/felix202422/CodePath-Masterclass', 19),

('20000000-0000-4000-8000-000000000020', '10000000-0000-4000-8000-000000000001', 'project-laboratory', 'Project Laboratory',
 'Lessons teach fragments; projects are where they become one skill.',
 'Lessons teach fragments; projects are where they become one skill. This laboratory contains seven graded projects and a capstone. Each brief is a real specification: problem, users, testable requirements, architecture and data model guidance, milestones, testing strategy, security requirements, deployment plan, acceptance criteria and extension challenges.' || E'\n\n' || 'Source: CodePath-Masterclass subject 20-PROJECT-LABORATORY (MIT), commit 62afa4143c26c036169429810fe8bc0b4e9a4de6.',
 'INTERMEDIATE', 'PUBLISHED', 'https://github.com/felix202422/CodePath-Masterclass', 20);

-- ---------------------------------------------------------------------------
-- Prerequisites, taken from each subject README's Prerequisites section in the
-- order the source lists them. Subject 00 (orientation) is not a course, so
-- subject 01 has no seeded prerequisite.
-- ---------------------------------------------------------------------------
INSERT INTO course_prerequisite (course_id, prerequisite_id, display_order) VALUES
('20000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 1),

('20000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 1),

('20000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 1),
('20000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000003', 2),

('20000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000004', 1),
('20000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', 2),

('20000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', 1),
('20000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', 2),

('20000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000006', 1),

('20000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000007', 1),
('20000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000002', 2),

('20000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000008', 1),
('20000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000007', 2),

('20000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000002', 1),
('20000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000006', 2),

('20000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000004', 1),
('20000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000006', 2),
('20000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000010', 3),

('20000000-0000-4000-8000-000000000012', '20000000-0000-4000-8000-000000000002', 1),
('20000000-0000-4000-8000-000000000012', '20000000-0000-4000-8000-000000000011', 2),

('20000000-0000-4000-8000-000000000013', '20000000-0000-4000-8000-000000000004', 1),
('20000000-0000-4000-8000-000000000013', '20000000-0000-4000-8000-000000000009', 2),
('20000000-0000-4000-8000-000000000013', '20000000-0000-4000-8000-000000000011', 3),

('20000000-0000-4000-8000-000000000014', '20000000-0000-4000-8000-000000000004', 1),
('20000000-0000-4000-8000-000000000014', '20000000-0000-4000-8000-000000000009', 2),
('20000000-0000-4000-8000-000000000014', '20000000-0000-4000-8000-000000000011', 3),

('20000000-0000-4000-8000-000000000015', '20000000-0000-4000-8000-000000000006', 1),
('20000000-0000-4000-8000-000000000015', '20000000-0000-4000-8000-000000000011', 2),
('20000000-0000-4000-8000-000000000015', '20000000-0000-4000-8000-000000000014', 3),

('20000000-0000-4000-8000-000000000016', '20000000-0000-4000-8000-000000000003', 1),
('20000000-0000-4000-8000-000000000016', '20000000-0000-4000-8000-000000000011', 2),
('20000000-0000-4000-8000-000000000016', '20000000-0000-4000-8000-000000000015', 3),

('20000000-0000-4000-8000-000000000017', '20000000-0000-4000-8000-000000000016', 1),
('20000000-0000-4000-8000-000000000017', '20000000-0000-4000-8000-000000000006', 2),

('20000000-0000-4000-8000-000000000018', '20000000-0000-4000-8000-000000000013', 1),
('20000000-0000-4000-8000-000000000018', '20000000-0000-4000-8000-000000000016', 2),
('20000000-0000-4000-8000-000000000018', '20000000-0000-4000-8000-000000000017', 3),

('20000000-0000-4000-8000-000000000019', '20000000-0000-4000-8000-000000000018', 1),
('20000000-0000-4000-8000-000000000019', '20000000-0000-4000-8000-000000000014', 2),
('20000000-0000-4000-8000-000000000019', '20000000-0000-4000-8000-000000000013', 3),

('20000000-0000-4000-8000-000000000020', '20000000-0000-4000-8000-000000000002', 1),
('20000000-0000-4000-8000-000000000020', '20000000-0000-4000-8000-000000000003', 2),
('20000000-0000-4000-8000-000000000020', '20000000-0000-4000-8000-000000000010', 3),
('20000000-0000-4000-8000-000000000020', '20000000-0000-4000-8000-000000000011', 4),
('20000000-0000-4000-8000-000000000020', '20000000-0000-4000-8000-000000000014', 5),
('20000000-0000-4000-8000-000000000020', '20000000-0000-4000-8000-000000000019', 6);
