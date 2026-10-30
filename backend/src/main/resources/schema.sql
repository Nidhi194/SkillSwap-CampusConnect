-- SkillSwap Campus schema. Idempotent: safe to run on every startup.
CREATE TABLE IF NOT EXISTS users (
    user_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(150) NOT NULL,
    password   VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    year       INT NOT NULL,
    bio        TEXT NULL,
    role       VARCHAR(20) NOT NULL DEFAULT 'STUDENT',
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS skills (
    skill_id   BIGINT AUTO_INCREMENT PRIMARY KEY,
    skill_name VARCHAR(100) NOT NULL,
    CONSTRAINT uq_skills_name UNIQUE (skill_name)
);

CREATE TABLE IF NOT EXISTS user_skills (
    user_skill_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT NOT NULL,
    skill_id      BIGINT NOT NULL,
    skill_type    VARCHAR(10) NOT NULL,
    CONSTRAINT uq_user_skill UNIQUE (user_id, skill_id),
    CONSTRAINT fk_us_user  FOREIGN KEY (user_id)  REFERENCES users(user_id)   ON DELETE CASCADE,
    CONSTRAINT fk_us_skill FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE CASCADE
);

-- status: PENDING | ACCEPTED | REJECTED | CANCELLED | DISCONNECTED (VARCHAR, not ENUM, so new states need no ALTER)
CREATE TABLE IF NOT EXISTS swap_requests (
    request_id       BIGINT AUTO_INCREMENT PRIMARY KEY,
    sender_id        BIGINT NOT NULL,
    receiver_id      BIGINT NOT NULL,
    skill_id         BIGINT NULL,
    offered_skill_id BIGINT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at       DATE NULL,
    CONSTRAINT fk_sr_sender   FOREIGN KEY (sender_id)        REFERENCES users(user_id)   ON DELETE CASCADE,
    CONSTRAINT fk_sr_receiver FOREIGN KEY (receiver_id)      REFERENCES users(user_id)   ON DELETE CASCADE,
    CONSTRAINT fk_sr_skill    FOREIGN KEY (skill_id)         REFERENCES skills(skill_id) ON DELETE SET NULL,
    CONSTRAINT fk_sr_offered  FOREIGN KEY (offered_skill_id) REFERENCES skills(skill_id) ON DELETE SET NULL
);

INSERT IGNORE INTO skills (skill_name) VALUES
    ('Java'), ('Python'), ('JavaScript'), ('SQL'), ('UI/UX Design'),
    ('Public Speaking'), ('Data Structures'), ('Machine Learning');
