-- ====================================================================
-- Rikkei EduPortal - Initial Seed Data
-- Default password for all seed accounts is: 123456
-- BCrypt hash: $2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu
-- ====================================================================

-- 1. Insert Users
INSERT INTO users (id, username, email, password_hash, full_name, role, avatar_url, status) VALUES
(1, 'admin', 'admin@rikkei.edu.vn', '$2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu', 'Quản trị viên Hệ thống', 'ADMIN', 'https://api.dicebear.com/7.x/bottts/svg?seed=admin', 'ACTIVE'),
(2, 'gv001', 'nguyenvana@rikkei.edu.vn', '$2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu', 'TS. Nguyễn Văn A', 'LECTURER', 'https://api.dicebear.com/7.x/bottts/svg?seed=gv001', 'ACTIVE'),
(3, 'gv002', 'tranthib@rikkei.edu.vn', '$2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu', 'ThS. Trần Thị B', 'LECTURER', 'https://api.dicebear.com/7.x/bottts/svg?seed=gv002', 'ACTIVE'),
(4, 'sv2024001', 'nguyenvanc@rikkei.edu.vn', '$2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu', 'Nguyễn Văn C', 'STUDENT', 'https://api.dicebear.com/7.x/bottts/svg?seed=sv2024001', 'ACTIVE'),
(5, 'sv2024002', 'lethid@rikkei.edu.vn', '$2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu', 'Lê Thị D', 'STUDENT', 'https://api.dicebear.com/7.x/bottts/svg?seed=sv2024002', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- 2. Insert Profiles
INSERT INTO lecturer_profiles (id, user_id, lecturer_code, department, degree) VALUES
(1, 2, 'GV001', 'Khoa Công nghệ Thông tin', 'Tiến sĩ'),
(2, 3, 'GV002', 'Khoa Hệ thống Thông tin', 'Thạc sĩ')
ON CONFLICT (id) DO NOTHING;

SELECT setval('lecturer_profiles_id_seq', (SELECT MAX(id) FROM lecturer_profiles));

INSERT INTO student_profiles (id, user_id, student_code, major, current_semester, credits_earned, total_required_credits, current_cgpa, previous_cgpa) VALUES
(1, 4, 'SV2024001', 'B.Tech - Computer Science', 6, 84, 160, 8.74, 8.62),
(2, 5, 'SV2024002', 'B.Tech - Software Engineering', 4, 52, 160, 8.15, 8.05)
ON CONFLICT (id) DO NOTHING;

SELECT setval('student_profiles_id_seq', (SELECT MAX(id) FROM student_profiles));

-- 2b. Insert Semesters
INSERT INTO semesters (semester_code, semester_name, academic_year, is_active, is_registration_open, start_date, end_date) VALUES
('2024-25_SEM1', 'Học kỳ 1 (2024-2025)', '2024-2025', FALSE, FALSE, '2024-09-01', '2025-01-15'),
('2024-25_SEM2', 'Học kỳ 2 (2024-2025)', '2024-2025', TRUE, TRUE, '2025-02-01', '2025-06-30'),
('2025-26_SEM1', 'Học kỳ 1 (2025-2026 - Kỳ tới)', '2025-2026', FALSE, TRUE, '2025-09-01', '2026-01-15'),
('2025-26_SEM2', 'Học kỳ 2 (2025-2026)', '2025-2026', FALSE, FALSE, '2026-02-01', '2026-06-30')
ON CONFLICT (semester_code) DO NOTHING;

-- 3. Insert Courses
INSERT INTO courses (id, course_code, name, credits, weekly_hours, syllabus_description, prerequisite_course_id) VALUES
(1, 'CS101', 'Introduction to Programming', 3, 4, 'Nhập môn lập trình căn bản với C/C++ và tư duy giải thuật cơ bản.', NULL),
(2, 'CS201', 'Data Structures and Algorithms', 3, 4, 'Cấu trúc dữ liệu nâng cao (Tree, Graph) và các thuật toán sắp xếp, tìm kiếm tối ưu.', 1),
(3, 'CS301', 'Database Management Systems', 3, 4, 'Mô hình CSDL quan hệ, thiết kế chuẩn hóa và ngôn ngữ truy vấn SQL chuyên sâu.', NULL),
(4, 'CS401', 'Web Application Development', 3, 4, 'Xây dựng ứng dụng web hiện đại fullstack với Spring Boot và ReactJS.', 2),
(5, 'CS402', 'Software Engineering & Agile', 3, 3, 'Quy trình phát triển phần mềm, quản lý dự án Scrum/Agile và CI/CD.', NULL),
(6, 'AI101', 'Artificial Intelligence Basics', 3, 4, 'Tổng quan về trí tuệ nhân tạo, Machine Learning và các mô hình ngôn ngữ lớn LLM.', 2)
ON CONFLICT (id) DO NOTHING;

SELECT setval('courses_id_seq', (SELECT MAX(id) FROM courses));

-- 4. Insert Class Sections (Semester: 2024-25_SEM2)
INSERT INTO class_sections (id, section_code, course_id, lecturer_id, semester_name, day_of_week, start_time, end_time, room_name, max_capacity, current_enrolled, version, status) VALUES
(1, 'CS201-2025-01', 2, 1, '2024-25_SEM2', 'MON', '09:00:00', '10:30:00', 'Room A-204', 40, 2, 0, 'OPEN'),
(2, 'CS301-2025-01', 3, 2, '2024-25_SEM2', 'TUE', '07:30:00', '09:00:00', 'Room B-101', 40, 1, 0, 'OPEN'),
(3, 'CS401-2025-01', 4, 1, '2024-25_SEM2', 'WED', '13:30:00', '15:00:00', 'Lab 3', 35, 1, 0, 'OPEN'),
(4, 'CS402-2025-01', 5, 2, '2024-25_SEM2', 'THU', '09:00:00', '10:30:00', 'Room A-301', 40, 0, 0, 'OPEN'),
(5, 'AI101-2025-01', 6, 1, '2024-25_SEM2', 'FRI', '15:15:00', '16:45:00', 'Lab 1', 30, 0, 0, 'OPEN')
ON CONFLICT (id) DO NOTHING;

SELECT setval('class_sections_id_seq', (SELECT MAX(id) FROM class_sections));

-- 5. Insert Enrollments for student SV2024001 (student_profile_id = 1)
INSERT INTO enrollments (id, student_id, class_section_id, status, has_conflict, attendance_rate, registered_at) VALUES
(1, 1, 1, 'REGISTERED', FALSE, 95.00, CURRENT_TIMESTAMP - INTERVAL '10 days'),
(2, 1, 2, 'REGISTERED', FALSE, 100.00, CURRENT_TIMESTAMP - INTERVAL '9 days'),
(3, 1, 3, 'PENDING', FALSE, 100.00, CURRENT_TIMESTAMP - INTERVAL '1 day'),
(4, 2, 1, 'REGISTERED', FALSE, 90.00, CURRENT_TIMESTAMP - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

SELECT setval('enrollments_id_seq', (SELECT MAX(id) FROM enrollments));

-- 6. Insert Grades for finished assessments
INSERT INTO grades (id, enrollment_id, attendance_score, midterm_score, final_score, total_score, letter_grade, is_locked) VALUES
(1, 1, 9.5, 8.5, 8.8, 8.78, 'A', FALSE),
(2, 2, 10.0, 9.0, 8.5, 8.80, 'A', FALSE)
ON CONFLICT (id) DO NOTHING;

SELECT setval('grades_id_seq', (SELECT MAX(id) FROM grades));
