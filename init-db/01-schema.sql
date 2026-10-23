-- ====================================================================
-- Rikkei EduPortal - Database Schema (PostgreSQL)
-- Based on SRS PRJ-QUICK-REVIEW-PRE-OJT-03 Section 6
-- ====================================================================

-- 1. Table users (Tài khoản & Phân quyền)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT', 'LECTURER', 'ADMIN')),
    avatar_url VARCHAR(255),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOCKED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table student_profiles (Hồ sơ học vụ Sinh viên)
CREATE TABLE IF NOT EXISTS student_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_code VARCHAR(20) UNIQUE NOT NULL,
    major VARCHAR(100) NOT NULL,
    current_semester INT DEFAULT 1,
    credits_earned INT DEFAULT 0,
    total_required_credits INT DEFAULT 160,
    current_cgpa NUMERIC(4,2) DEFAULT 0.00,
    previous_cgpa NUMERIC(4,2) DEFAULT 0.00
);

-- 3. Table lecturer_profiles (Hồ sơ Giảng viên)
CREATE TABLE IF NOT EXISTS lecturer_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lecturer_code VARCHAR(20) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    degree VARCHAR(50)
);

-- 4. Table courses (Danh mục Môn học / Học phần)
CREATE TABLE IF NOT EXISTS courses (
    id BIGSERIAL PRIMARY KEY,
    course_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    credits INT NOT NULL,
    weekly_hours INT NOT NULL,
    syllabus_description TEXT,
    prerequisite_course_id BIGINT REFERENCES courses(id) ON DELETE SET NULL
);

-- 4b. Table semesters (Quản lý các Học kỳ)
CREATE TABLE IF NOT EXISTS semesters (
    id BIGSERIAL PRIMARY KEY,
    semester_code VARCHAR(30) UNIQUE NOT NULL,
    semester_name VARCHAR(100) NOT NULL,
    academic_year VARCHAR(30) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    is_registration_open BOOLEAN DEFAULT TRUE,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Table class_sections (Lớp học phần mở trong kỳ)
CREATE TABLE IF NOT EXISTS class_sections (
    id BIGSERIAL PRIMARY KEY,
    section_code VARCHAR(30) UNIQUE NOT NULL,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lecturer_id BIGINT NOT NULL REFERENCES lecturer_profiles(id) ON DELETE RESTRICT,
    semester_name VARCHAR(30) NOT NULL,
    day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_name VARCHAR(50) NOT NULL,
    max_capacity INT NOT NULL DEFAULT 40,
    current_enrolled INT NOT NULL DEFAULT 0,
    version INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED'))
);

-- 6. Table enrollments (Đăng ký học phần của Sinh viên)
CREATE TABLE IF NOT EXISTS enrollments (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    class_section_id BIGINT NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'REGISTERED' CHECK (status IN ('REGISTERED', 'PENDING', 'CANCELLED', 'REJECTED', 'COMPLETED')),
    has_conflict BOOLEAN DEFAULT FALSE,
    attendance_rate NUMERIC(5,2) DEFAULT 100.00,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_section UNIQUE (student_id, class_section_id)
);

-- 7. Table grades (Bảng điểm chi tiết)
CREATE TABLE IF NOT EXISTS grades (
    id BIGSERIAL PRIMARY KEY,
    enrollment_id BIGINT UNIQUE NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    attendance_score NUMERIC(4,2),
    midterm_score NUMERIC(4,2),
    final_score NUMERIC(4,2),
    total_score NUMERIC(4,2),
    letter_grade VARCHAR(5),
    is_locked BOOLEAN DEFAULT FALSE
);

-- Create Indexes for performance (NFR-01)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_student_user_id ON student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_lecturer_user_id ON lecturer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_class_sections_semester ON class_sections(semester_name);
CREATE INDEX IF NOT EXISTS idx_class_sections_course ON class_sections(course_id);
CREATE INDEX IF NOT EXISTS idx_class_sections_lecturer ON class_sections(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_section ON enrollments(class_section_id);
