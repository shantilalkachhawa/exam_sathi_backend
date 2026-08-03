-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-------------------------------------------------
-- USERS
-------------------------------------------------
CREATE TABLE users (
    id  PRIMARY KEY ,
    full_name VARCHAR(200) NOT NULL,
    gender ENUM('male', 'female', 'other'),
    image_url TEXT,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE,
    password_hash TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    status ENUM('active', 'inactive', 'suspended','locked') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    id,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
    id  PRIMARY KEY ,
    user_id REFERENCES users(id) ON DELETE CASCADE,
    role_id REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'inactive') DEFAULT 'active',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

-------------------------------------------------
-- EXAM CATEGORIES
-------------------------------------------------
CREATE TABLE categories (
    id  PRIMARY KEY DEFAULT ,
    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-------------------------------------------------
-- EXAM SUB CATEGORIES
-------------------------------------------------
CREATE TABLE sub_categories (
    id  PRIMARY KEY DEFAULT,
    category_id  NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-------------------------------------------------
-- QUESTIONS
-------------------------------------------------
CREATE TABLE questions (
    id  PRIMARY KEY DEFAULT ,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    sub_category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type SMALLINT NOT NULL, -- 1=Single, 2=Multiple
    level SMALLINT DEFAULT 1, -- 1=Easy,2=Medium,3=Hard
    -- explanation TEXT,
    created_by  REFERENCES users(id),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-------------------------------------------------
-- QUESTION OPTIONS
-------------------------------------------------
CREATE TABLE question_options (
    id  PRIMARY KEY DEFAULT ,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    -- status ENUM('active', 'inactive') DEFAULT 'active',
    -- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-------------------------------------------------
-- TESTS
-------------------------------------------------
CREATE TABLE practice_tests (
    id  PRIMARY KEY DEFAULT ,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    sub_category_id UUID NOT NULL REFERENCES sub_categories(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    total_questions INT NOT NULL,
    total_marks INT NOT NULL,
    positive_marks INT DEFAULT 1,
    negative_marks FLOAT DEFAULT 0,
    duration_minutes INT NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE, // paid or free test
    -- paper_file_url TEXT,
    -- answer_file_url TEXT,
    created_by UUID REFERENCES users(id),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-------------------------------------------------
-- TEST QUESTIONS MAPPING
-------------------------------------------------
CREATE TABLE test_questions (
    id  PRIMARY KEY DEFAULT,
    practice_tests  NOT NULL REFERENCES practice_tests(id) ON DELETE CASCADE,
    question_id  NOT NULL REFERENCES questions(id) ON DELETE CASCADE,


);

-------------------------------------------------
-- SUBSCRIPTIONS
-------------------------------------------------
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    access_type VARCHAR(20) NOT NULL
        CHECK(access_type IN ('free','trial','paid')),
    plan_type VARCHAR(30) NOT NULL
        CHECK(plan_type IN (
            'monthly',
            'quarterly',
            'half_yearly',
            'yearly',
            'lifetime'
        )),
    price NUMERIC(10,2) DEFAULT 0,
    validity_days INT,
    total_test INT DEFAULT 0,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE subscription_access (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL
        REFERENCES subscriptions(id)
        ON DELETE CASCADE,
    access_type VARCHAR(30)
        CHECK(access_type IN (
            'category',
            'sub_category'
        )),
    access_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-------------------------------------------------
-- USER SUBSCRIPTIONS
-------------------------------------------------
CREATE TABLE user_subscriptions (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    subscription_id UUID REFERENCES subscriptions(id),
    amount_paid NUMERIC(10,2),
    purchased_at TIMESTAMP,
    expiry_date TIMESTAMP,
    test_used INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-------------------------------------------------
-- PAYMENTS
-------------------------------------------------
CREATE TABLE payments (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    subscription_id UUID REFERENCES subscriptions(id),
    amount NUMERIC(10,2),
    payment_status VARCHAR(20),
    payment_method VARCHAR(50),
    transaction_id VARCHAR(200),
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-------------------------------------------------
-- TEST ATTEMPTS
-------------------------------------------------
CREATE TABLE test_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pt_id UUID NOT NULL REFERENCES practice_tests(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    total_questions INT,
    attempted_questions INT DEFAULT 0,
    correct_answers INT DEFAULT 0,
    wrong_answers INT DEFAULT 0,
    skipped_answers INT DEFAULT 0,
    score NUMERIC(10,2),
    accuracy NUMERIC(5,2),
    percentage NUMERIC(5,2),
    rank_position INT,// highest and lowest score rank position
    time_taken INT, -- in seconds
    status enum('in progress', 'completed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-------------------------------------------------
-- USER ANSWERS
-------------------------------------------------
CREATE TABLE user_answers (
    id  PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id  NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
    question_id  NOT NULL REFERENCES questions(id),
    option_id  NOT NULL REFERENCES question_options(id), // flat data structure for user answers
    question_type SMALLINT,
    is_correct BOOLEAN DEFAULT FALSE,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status enum('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-------------------------------------------------
-- TEST RANKINGS
-------------------------------------------------
CREATE TABLE test_rankings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score NUMERIC(10,2),
    rank_position INT,
    percentile NUMERIC(5,2),
    status enum('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-------------------------------------------------
-- INDEXES
-------------------------------------------------
CREATE INDEX idx_questions_category ON questions(category_id);
CREATE INDEX idx_questions_subcategory ON questions(sub_category_id);
CREATE INDEX idx_test_questions_test ON test_questions(test_id);
CREATE INDEX idx_test_attempts_user ON test_attempts(user_id);
CREATE INDEX idx_test_attempts_test ON test_attempts(test_id);
CREATE INDEX idx_user_answers_attempt ON user_answers(attempt_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_user_subscriptions_user ON user_subscriptions(user_id);