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

-- 8. Table tuition_fees (Quản lý Học phí & Công nợ)
CREATE TABLE IF NOT EXISTS tuition_fees (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    semester_name VARCHAR(30) NOT NULL,
    total_credits INT NOT NULL DEFAULT 0,
    credit_unit_price NUMERIC(12,2) DEFAULT 450000.00,
    facility_fee NUMERIC(12,2) DEFAULT 300000.00,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PAID', 'PARTIAL')),
    due_date DATE,
    payment_date TIMESTAMP,
    transaction_code VARCHAR(100),
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_semester_tuition UNIQUE (student_id, semester_name)
);

-- 9. Table announcements (Bảng tin Đào tạo)
CREATE TABLE IF NOT EXISTS announcements (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'HỌC VỤ',
    content TEXT NOT NULL,
    author VARCHAR(100) DEFAULT 'Phòng Đào tạo',
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Table notifications (Chuông thông báo người dùng)
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'GENERAL',
    is_read BOOLEAN DEFAULT FALSE,
    link_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Table exam_schedules (Lịch thi & Phòng thi)
CREATE TABLE IF NOT EXISTS exam_schedules (
    id BIGSERIAL PRIMARY KEY,
    class_section_id BIGINT NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
    exam_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_name VARCHAR(50) NOT NULL,
    exam_type VARCHAR(50) NOT NULL DEFAULT 'TỰ LUẬN',
    notes VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Table audit_logs (Nhật ký kiểm toán hệ thống - auth-service)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    actor_username VARCHAR(50) NOT NULL,
    actor_role VARCHAR(30),
    target_entity VARCHAR(50) NOT NULL,
    target_id VARCHAR(50),
    summary VARCHAR(255) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_username);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);

-- 13. Table attendance_sessions (Phiên điểm danh QR động - lecturer-service)
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id BIGSERIAL PRIMARY KEY,
    class_section_id BIGINT NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
    lecturer_id BIGINT NOT NULL REFERENCES lecturer_profiles(id) ON DELETE RESTRICT,
    session_name VARCHAR(150),
    session_secret VARCHAR(100) NOT NULL,
    step_seconds INT NOT NULL DEFAULT 15,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    total_attendees INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_section ON attendance_sessions(class_section_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_lecturer ON attendance_sessions(lecturer_id);

-- 14. Table attendance_records (Bản ghi điểm danh của sinh viên - lecturer-service)
CREATE TABLE IF NOT EXISTS attendance_records (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    enrollment_id BIGINT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    device_info VARCHAR(255),
    CONSTRAINT uq_session_student UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON attendance_records(student_id);

