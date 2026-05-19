-- =========================================================
-- ONLINE EXAM / MOCK TEST PLATFORM DATABASE SCHEMA
-- DATABASE : PostgreSQL / MySQL Compatible Structure
-- =========================================================

-- =========================================================
-- USERS TABLE
-- Store all users/admins
-- =========================================================

CREATE TABLE users (
    id UUID PRIMARY KEY,

    email VARCHAR(150) UNIQUE NOT NULL,

    phone_number VARCHAR(20),

    full_name VARCHAR(200) NOT NULL,

    password_hash VARCHAR(255) NOT NULL,

    role INT DEFAULT 1,
    -- 1 = USER
    -- 2 = ADMIN
    -- 3 = SUPER_ADMIN

    is_verified BOOLEAN DEFAULT FALSE,

    subscription_id UUID,

    status BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- EXAM CATEGORIES
-- Example:
-- SSC
-- Railway
-- VYAPAM
-- =========================================================

CREATE TABLE exam_categories (
    id UUID PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    description VARCHAR(150),

    status BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- EXAM SUB CATEGORIES
-- Example:
-- SSC -> CGL
-- SSC -> MTS
-- VYAPAM -> SI
-- =========================================================

CREATE TABLE exam_sub_categories (
    id UUID PRIMARY KEY,

    category_id UUID NOT NULL,

    name VARCHAR(150) NOT NULL,

    description VARCHAR(150),

    status BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_exam_sub_category
        FOREIGN KEY (category_id)
        REFERENCES exam_categories(id)
);

-- =========================================================
-- SUBSCRIPTION PACKAGES
-- Example:
-- ₹100 -> 10 Tests
-- =========================================================

CREATE TABLE subscription (
    id UUID PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    price DECIMAL(10,2) NOT NULL,

    total_test INT DEFAULT 0,

    validity_days INT DEFAULT 30,

    description VARCHAR(150),

    status BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- USER SUBSCRIPTIONS
-- Store purchased subscription details
-- =========================================================

CREATE TABLE user_subscription (
    id UUID PRIMARY KEY,

    user_id UUID NOT NULL,

    subscription_id UUID NOT NULL,

    test_used INT DEFAULT 0,

    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    exapiry_date TIMESTAMP,

    status BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_subscription_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    CONSTRAINT fk_user_subscription_package
        FOREIGN KEY (subscription_id)
        REFERENCES subscription(id)
);

-- =========================================================
-- PAYMENT TABLE
-- Store payment transaction details
-- =========================================================

CREATE TABLE payment (
    id UUID PRIMARY KEY,

    user_id UUID NOT NULL,

    package_id UUID NOT NULL,

    amount DECIMAL(10,2) NOT NULL,

    payment_status INT DEFAULT 0,
    -- 0 = Pending
    -- 1 = Success
    -- 2 = Failed

    payment_method VARCHAR(150),

    transaction_id UUID,

    paid_at TIMESTAMP,

    status BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payment_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    CONSTRAINT fk_payment_package
        FOREIGN KEY (package_id)
        REFERENCES subscription(id)
);

-- =========================================================
-- TEST TABLE
-- ONLINE / OFFLINE TESTS
-- =========================================================

CREATE TABLE test (
    id UUID PRIMARY KEY,

    sub_category_id UUID NOT NULL,

    title VARCHAR(150) NOT NULL,

    description VARCHAR(150),

    total_questions INT DEFAULT 0,

    total_marks INT DEFAULT 0,

    positive_marks INT DEFAULT 1,

    negative_marks INT DEFAULT 0,

    duration_minutes INT DEFAULT 60,

    is_paid BOOLEAN DEFAULT TRUE,

    paper_file_id UUID,

    answer_file_id UUID,

    created_by UUID,

    status BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_test_subcategory
        FOREIGN KEY (sub_category_id)
        REFERENCES exam_sub_categories(id),

    CONSTRAINT fk_test_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
);

-- =========================================================
-- QUESTIONS TABLE
-- =========================================================

CREATE TABLE question (
    id UUID PRIMARY KEY,

    sub_category_id UUID NOT NULL,

    category_id UUID NOT NULL,

    question_title VARCHAR(1000) NOT NULL,

    question_type INT DEFAULT 1,
    -- 1 = MCQ
    -- 2 = TRUE_FALSE
    -- 3 = MULTI_SELECT

    question_level INT DEFAULT 1,
    -- 1 = EASY
    -- 2 = MEDIUM
    -- 3 = HARD

    explanation TEXT,

    created_by UUID,

    status BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_question_subcategory
        FOREIGN KEY (sub_category_id)
        REFERENCES exam_sub_categories(id),

    CONSTRAINT fk_question_category
        FOREIGN KEY (category_id)
        REFERENCES exam_categories(id),

    CONSTRAINT fk_question_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
);

-- =========================================================
-- QUESTION OPTIONS
-- Store answer options
-- =========================================================

CREATE TABLE question_options (
    id UUID PRIMARY KEY,

    question_id UUID NOT NULL,

    options TEXT,
    -- Example:
    -- ["A","B","C","D"]

    ansers TEXT,
    -- Example:
    -- ["A"]

    is_correct BOOLEAN DEFAULT FALSE,

    status BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_question_options_question
        FOREIGN KEY (question_id)
        REFERENCES question(id)
);

-- =========================================================
-- TEST QUESTIONS MAPPING
-- Map questions to tests
-- =========================================================

CREATE TABLE test_questions (
    id UUID PRIMARY KEY,

    question_id UUID NOT NULL,

    test_id UUID NOT NULL,

    question_order INT,

    status BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_test_questions_question
        FOREIGN KEY (question_id)
        REFERENCES question(id),

    CONSTRAINT fk_test_questions_test
        FOREIGN KEY (test_id)
        REFERENCES test(id)
);

-- =========================================================
-- TEST ATTEMPTS
-- Store user exam results
-- =========================================================

CREATE TABLE test_attempts (
    id UUID PRIMARY KEY,

    user_id UUID NOT NULL,

    test_id UUID NOT NULL,

    started_at TIMESTAMP,

    submited_at TIMESTAMP,

    total_ques INT,

    attempted_ques TEXT,
    -- Example:
    -- ["q1","q2"]

    correct_ans TEXT,

    wrong_ans TEXT,

    skipped_ans TEXT,

    score INT DEFAULT 0,

    accuracy INT DEFAULT 0,

    percentage INT DEFAULT 0,

    rank_postion INT,

    time_taken TIMESTAMP,

    status BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_test_attempts_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    CONSTRAINT fk_test_attempts_test
        FOREIGN KEY (test_id)
        REFERENCES test(id)
);

-- =========================================================
-- USER ANSWERS
-- Store selected answers
-- =========================================================

CREATE TABLE user_answers (
    id UUID PRIMARY KEY,

    attempt_id UUID NOT NULL,

    question_id UUID NOT NULL,

    option_id VARCHAR(1000),

    question_type INT,

    is_correct BOOLEAN DEFAULT FALSE,

    answered_at TIMESTAMP,

    status BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_answers_attempt
        FOREIGN KEY (attempt_id)
        REFERENCES test_attempts(id),

    CONSTRAINT fk_user_answers_question
        FOREIGN KEY (question_id)
        REFERENCES question(id)
);

-- =========================================================
-- TEST RANKING
-- Store leaderboard data
-- =========================================================

CREATE TABLE test_ranking (
    id UUID PRIMARY KEY,

    test_id UUID NOT NULL,

    user_id UUID NOT NULL,

    score VARCHAR(1000),

    rank_positon INT,

    percentile TIMESTAMP,

    status BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_test_ranking_test
        FOREIGN KEY (test_id)
        REFERENCES test(id),

    CONSTRAINT fk_test_ranking_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
);

-- =========================================================
-- INDEXES
-- Improve query performance
-- =========================================================

CREATE INDEX idx_users_email
ON users(email);

CREATE INDEX idx_test_attempts_user
ON test_attempts(user_id);

CREATE INDEX idx_test_attempts_test
ON test_attempts(test_id);

CREATE INDEX idx_questions_subcategory
ON question(sub_category_id);

CREATE INDEX idx_test_questions_test
ON test_questions(test_id);

-- =========================================================
-- END OF SCHEMA
-- =========================================================