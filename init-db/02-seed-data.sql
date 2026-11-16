-- ====================================================================
-- Rikkei EduPortal - Standard Seed Data (TASK-D07 Nghiệm Thu)
-- Dữ liệu khởi tạo chuẩn hóa phục vụ nghiệm thu hệ thống
-- Mật khẩu mặc định cho tất cả tài khoản demo: 123456
-- BCrypt hash: $2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu
-- ====================================================================

-- 1. Insert Users (Admin, Giảng viên, Sinh viên)
INSERT INTO users (id, username, email, password_hash, full_name, role, avatar_url, status) VALUES
-- Admin demo
(1, 'admin', 'admin@rikkei.edu.vn', '$2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu', 'Quản trị viên Hệ thống', 'ADMIN', 'https://api.dicebear.com/7.x/bottts/svg?seed=admin', 'ACTIVE'),

-- Giảng viên demo (5 Giảng viên phụ trách các chuyên ngành)
(2, 'gv001', 'nguyenvana@rikkei.edu.vn', '$2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu', 'TS. Nguyễn Văn A', 'LECTURER', 'https://api.dicebear.com/7.x/bottts/svg?seed=gv001', 'ACTIVE'),
(3, 'gv002', 'tranthib@rikkei.edu.vn', '$2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu', 'ThS. Trần Thị B', 'LECTURER', 'https://api.dicebear.com/7.x/bottts/svg?seed=gv002', 'ACTIVE'),
(6, 'gv003', 'lehoanglong@rikkei.edu.vn', '$2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu', 'PGS. TS. Lê Hoàng Long', 'LECTURER', 'https://api.dicebear.com/7.x/bottts/svg?seed=gv003', 'ACTIVE'),
(7, 'gv004', 'phamminhtuan@rikkei.edu.vn', '$2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu', 'TS. Phạm Minh Tuấn', 'LECTURER', 'https://api.dicebear.com/7.x/bottts/svg?seed=gv004', 'ACTIVE'),
(8, 'gv005', 'hoangbichngoc@rikkei.edu.vn', '$2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu', 'ThS. Hoàng Bích Ngọc', 'LECTURER', 'https://api.dicebear.com/7.x/bottts/svg?seed=gv005', 'ACTIVE'),

-- Sinh viên demo (5 Sinh viên thuộc các khoa CS, SE, AI, Security)
(4, 'sv2024001', 'nguyenvanc@rikkei.edu.vn', '$2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu', 'Nguyễn Văn C', 'STUDENT', 'https://api.dicebear.com/7.x/bottts/svg?seed=sv2024001', 'ACTIVE'),
(5, 'sv2024002', 'lethid@rikkei.edu.vn', '$2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu', 'Lê Thị D', 'STUDENT', 'https://api.dicebear.com/7.x/bottts/svg?seed=sv2024002', 'ACTIVE'),
(9, 'sv2024003', 'tranquanghuy@rikkei.edu.vn', '$2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu', 'Trần Quang Huy', 'STUDENT', 'https://api.dicebear.com/7.x/bottts/svg?seed=sv2024003', 'ACTIVE'),
(10, 'sv2024004', 'phammaianh@rikkei.edu.vn', '$2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu', 'Phạm Mai Anh', 'STUDENT', 'https://api.dicebear.com/7.x/bottts/svg?seed=sv2024004', 'ACTIVE'),
(11, 'sv2024005', 'hoangcuongcat@rikkei.edu.vn', '$2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu', 'Hoàng Cương Cát', 'STUDENT', 'https://api.dicebear.com/7.x/bottts/svg?seed=sv2024005', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- 2. Insert Profiles
-- 2a. Hồ sơ Giảng viên
INSERT INTO lecturer_profiles (id, user_id, lecturer_code, department, degree) VALUES
(1, 2, 'GV001', 'Khoa Công nghệ Thông tin', 'Tiến sĩ'),
(2, 3, 'GV002', 'Khoa Hệ thống Thông tin', 'Thạc sĩ'),
(3, 6, 'GV003', 'Khoa Khoa học Máy tính & KTPM', 'Phó Giáo sư, Tiến sĩ'),
(4, 7, 'GV004', 'Khoa Trí tuệ Nhân tạo & Khoa học Dữ liệu', 'Tiến sĩ'),
(5, 8, 'GV005', 'Khoa An toàn Thông tin & Mạng', 'Thạc sĩ')
ON CONFLICT (id) DO NOTHING;

SELECT setval('lecturer_profiles_id_seq', (SELECT MAX(id) FROM lecturer_profiles));

-- 2b. Hồ sơ Sinh viên
INSERT INTO student_profiles (id, user_id, student_code, major, current_semester, credits_earned, total_required_credits, current_cgpa, previous_cgpa) VALUES
(1, 4, 'SV2024001', 'B.Tech - Computer Science', 6, 84, 160, 8.74, 8.62),
(2, 5, 'SV2024002', 'B.Tech - Software Engineering', 4, 52, 160, 8.15, 8.05),
(3, 9, 'SV2024003', 'B.Tech - Artificial Intelligence', 4, 48, 160, 8.40, 8.25),
(4, 10, 'SV2024004', 'B.Tech - Information Security', 6, 78, 160, 8.55, 8.42),
(5, 11, 'SV2024005', 'B.Tech - Software Engineering', 6, 88, 160, 8.92, 8.80)
ON CONFLICT (id) DO NOTHING;

SELECT setval('student_profiles_id_seq', (SELECT MAX(id) FROM student_profiles));

-- 2c. Insert Semesters (Chuẩn 4 Học kỳ: Quá khứ, Hiện tại mở ĐK, Kỳ tới, Kế hoạch)
INSERT INTO semesters (semester_code, semester_name, academic_year, is_active, is_registration_open, start_date, end_date) VALUES
('2024-25_SEM1', 'Học kỳ 1 (2024-2025)', '2024-2025', FALSE, FALSE, '2024-09-01', '2025-01-15'),
('2024-25_SEM2', 'Học kỳ 2 (2024-2025)', '2024-2025', TRUE, TRUE, '2025-02-01', '2025-06-30'),
('2025-26_SEM1', 'Học kỳ 1 (2025-2026 - Kỳ tới)', '2025-2026', FALSE, TRUE, '2025-09-01', '2026-01-15'),
('2025-26_SEM2', 'Học kỳ 2 (2025-2026)', '2025-2026', FALSE, FALSE, '2026-02-01', '2026-06-30')
ON CONFLICT (semester_code) DO NOTHING;

-- 3. Insert Courses (10 Môn học Tiêu chuẩn với Tiên quyết & Mô tả chuyên sâu)
INSERT INTO courses (id, course_code, name, credits, weekly_hours, syllabus_description, prerequisite_course_id) VALUES
(1, 'CS101', 'Nhập môn Lập trình (Introduction to Programming)', 3, 4, 'Căn bản ngôn ngữ lập trình C/C++, kiểu dữ liệu, cấu trúc rẽ nhánh, vòng lặp, mảng, con trỏ, hàm và tư duy giải thuật cơ bản.', NULL),
(2, 'CS201', 'Cấu trúc Dữ liệu & Giải thuật (Data Structures and Algorithms)', 3, 4, 'Cấu trúc dữ liệu tuyến tính và phi tuyến (Danh sách liên kết, Stack, Queue, Tree, Heap, Graph) và các giải thuật sắp xếp, tìm kiếm tối ưu.', 1),
(3, 'CS301', 'Hệ Quản trị Cơ sở Dữ liệu (Database Management Systems)', 3, 4, 'Mô hình CSDL quan hệ, thiết kế thực thể liên kết ERD, chuẩn hóa 1NF-3NF/BCNF, ngôn ngữ SQL chuyên sâu và quản lý giao dịch ACID.', NULL),
(4, 'CS401', 'Phát triển Ứng dụng Web (Web Application Development)', 3, 4, 'Xây dựng ứng dụng web hiện đại fullstack với RESTful API Spring Boot, xác thực bảo mật JWT, ReactJS và kiến trúc SPA.', 2),
(5, 'CS402', 'Kỹ nghệ Phần mềm & Agile (Software Engineering & Agile)', 3, 3, 'Quy trình phát triển phần mềm chuẩn nghiệp, mô hình Scrum/Agile, quản lý yêu cầu Jira, CI/CD và kiểm thử tự động.', NULL),
(6, 'AI101', 'Trí tuệ Nhân tạo Cơ bản (Artificial Intelligence Basics)', 3, 4, 'Tổng quan về AI, thuật toán tìm kiếm A*, học máy cơ bản Supervised/Unsupervised Learning, Neural Networks và ứng dụng mô hình LLM.', 2),
(7, 'CS102', 'Lập trình Hướng đối tượng Java (Object-Oriented Programming)', 3, 4, '4 nguyên lý OOP (Encapsulation, Inheritance, Polymorphism, Abstraction), thiết kế Interface, Exception Handling, Collections và Design Patterns.', 1),
(8, 'CS303', 'Mạng Máy tính & Truyền thông (Computer Networks & Communications)', 3, 4, 'Mô hình OSI/TCP-IP, tầng ứng dụng HTTP/DNS, giao thức TCP/UDP sockets, định tuyến IP, phân đoạn mạng con CIDR và an ninh mạng cơ bản.', NULL),
(9, 'CS405', 'Điện toán Đám mây & Thực hành DevOps (Cloud Computing & DevOps)', 4, 4, 'Containerization với Docker, điều phối Kubernetes, xây dựng CI/CD Pipeline tự động hóa và triển khai kiến trúc microservices trên Cloud.', 4),
(10, 'SEC201', 'Cơ sở An toàn & Bảo mật Thông tin (Information Security Fundamentals)', 3, 3, 'Tam giác CIA, mật mã đối xứng AES, bất đối xứng RSA/ECC, chữ ký số, chứng chỉ SSL/TLS, kiểm soát truy cập AAA và bảo vệ lỗ hổng OWASP.', NULL)
ON CONFLICT (id) DO NOTHING;

SELECT setval('courses_id_seq', (SELECT MAX(id) FROM courses));

-- 4. Insert Class Sections (20 Lớp học phần: Ca Sáng & Ca Chiều phân bổ đều các thứ trong tuần)
-- Ca Sáng: kết thúc trước hoặc đúng 12:30 (07:30-09:00, 09:00-10:30, 09:15-10:45)
-- Ca Chiều: bắt đầu từ hoặc sau 12:00 (13:00-14:30, 13:30-15:00, 14:45-16:15, 15:15-16:45)
INSERT INTO class_sections (id, section_code, course_id, lecturer_id, semester_name, day_of_week, start_time, end_time, room_name, max_capacity, current_enrolled, version, status) VALUES
-- Lớp 1-5 (Các lớp cốt lõi tương thích test suite & postman)
(1, 'CS201-2025-01', 2, 1, '2024-25_SEM2', 'MON', '09:00:00', '10:30:00', 'Room A-204', 40, 2, 0, 'OPEN'),   -- Ca Sáng (Thứ 2)
(2, 'CS301-2025-01', 3, 2, '2024-25_SEM2', 'TUE', '07:30:00', '09:00:00', 'Room B-101', 40, 1, 0, 'OPEN'),   -- Ca Sáng (Thứ 3)
(3, 'CS401-2025-01', 4, 1, '2024-25_SEM2', 'WED', '13:30:00', '15:00:00', 'Lab 3',      35, 1, 0, 'OPEN'),   -- Ca Chiều (Thứ 4)
(4, 'CS402-2025-01', 5, 2, '2024-25_SEM2', 'THU', '09:00:00', '10:30:00', 'Room A-301', 40, 0, 0, 'OPEN'),   -- Ca Sáng (Thứ 5)
(5, 'AI101-2025-01', 6, 1, '2024-25_SEM2', 'FRI', '15:15:00', '16:45:00', 'Lab 1',      30, 0, 0, 'OPEN'),   -- Ca Chiều (Thứ 6)

-- Lớp 6-10 (Bổ sung đa dạng các ca học sáng/chiều)
(6, 'CS101-2025-01', 1, 1, '2024-25_SEM2', 'MON', '07:30:00', '09:00:00', 'Room A-102', 40, 0, 0, 'OPEN'),   -- Ca Sáng (Thứ 2)
(7, 'CS101-2025-02', 1, 3, '2024-25_SEM2', 'WED', '14:45:00', '16:15:00', 'Room A-102', 40, 0, 0, 'OPEN'),   -- Ca Chiều (Thứ 4)
(8, 'CS102-2025-01', 7, 3, '2024-25_SEM2', 'TUE', '09:15:00', '10:45:00', 'Lab 2',      35, 1, 0, 'OPEN'),   -- Ca Sáng (Thứ 3)
(9, 'CS102-2025-02', 7, 3, '2024-25_SEM2', 'THU', '13:00:00', '14:30:00', 'Lab 2',      35, 0, 0, 'OPEN'),   -- Ca Chiều (Thứ 5)
(10, 'CS201-2025-02', 2, 1, '2024-25_SEM2', 'WED', '09:15:00', '10:45:00', 'Room A-204', 40, 0, 0, 'OPEN'),  -- Ca Sáng (Thứ 4)

-- Lớp 11-15 (Các lớp chuyên sâu cơ sở dữ liệu, mạng máy tính, công nghệ web)
(11, 'CS301-2025-02', 3, 2, '2024-25_SEM2', 'FRI', '13:00:00', '14:30:00', 'Room B-101', 40, 0, 0, 'OPEN'),  -- Ca Chiều (Thứ 6)
(12, 'CS303-2025-01', 8, 5, '2024-25_SEM2', 'MON', '13:00:00', '14:30:00', 'Room B-205', 40, 2, 0, 'OPEN'),  -- Ca Chiều (Thứ 2)
(13, 'CS303-2025-02', 8, 5, '2024-25_SEM2', 'THU', '07:30:00', '09:00:00', 'Room B-205', 40, 0, 0, 'OPEN'),  -- Ca Sáng (Thứ 5)
(14, 'CS401-2025-02', 4, 3, '2024-25_SEM2', 'FRI', '09:15:00', '10:45:00', 'Lab 3',      35, 0, 0, 'OPEN'),  -- Ca Sáng (Thứ 6)
(15, 'CS402-2025-02', 5, 2, '2024-25_SEM2', 'TUE', '13:00:00', '14:30:00', 'Room A-301', 40, 0, 0, 'OPEN'),  -- Ca Chiều (Thứ 3)

-- Lớp 16-20 (Các lớp công nghệ mới: Cloud, AI nâng cao, Bảo mật an ninh mạng)
(16, 'CS405-2025-01', 9, 3, '2024-25_SEM2', 'TUE', '14:45:00', '16:15:00', 'Lab Cloud-1', 35, 1, 0, 'OPEN'), -- Ca Chiều (Thứ 3)
(17, 'CS405-2025-02', 9, 3, '2024-25_SEM2', 'SAT', '07:30:00', '09:00:00', 'Lab Cloud-1', 35, 0, 0, 'OPEN'), -- Ca Sáng (Thứ 7)
(18, 'AI101-2025-02', 6, 4, '2024-25_SEM2', 'MON', '14:45:00', '16:15:00', 'Lab AI-1',    30, 1, 0, 'OPEN'), -- Ca Chiều (Thứ 2)
(19, 'SEC201-2025-01', 10, 5, '2024-25_SEM2', 'WED', '07:30:00', '09:00:00', 'Room A-304', 40, 1, 0, 'OPEN'), -- Ca Sáng (Thứ 4)
(20, 'SEC201-2025-02', 10, 5, '2024-25_SEM2', 'SAT', '09:15:00', '10:45:00', 'Room A-304', 40, 0, 0, 'OPEN')  -- Ca Sáng (Thứ 7)
ON CONFLICT (id) DO NOTHING;

SELECT setval('class_sections_id_seq', (SELECT MAX(id) FROM class_sections));

-- 5. Insert Enrollments (Đăng ký học phần mẫu phục vụ demo & test suite)
INSERT INTO enrollments (id, student_id, class_section_id, status, has_conflict, attendance_rate, registered_at) VALUES
-- Sinh viên 1: SV2024001
(1, 1, 1, 'REGISTERED', FALSE, 95.00, CURRENT_TIMESTAMP - INTERVAL '10 days'),
(2, 1, 2, 'REGISTERED', FALSE, 100.00, CURRENT_TIMESTAMP - INTERVAL '9 days'),
(3, 1, 3, 'PENDING',    FALSE, 100.00, CURRENT_TIMESTAMP - INTERVAL '1 day'),

-- Sinh viên 2: SV2024002
(4, 2, 1, 'REGISTERED', FALSE, 90.00, CURRENT_TIMESTAMP - INTERVAL '8 days'),
(5, 2, 8, 'REGISTERED', FALSE, 100.00, CURRENT_TIMESTAMP - INTERVAL '7 days'),

-- Sinh viên 3: SV2024003 (Chuyên ngành AI)
(6, 3, 18, 'REGISTERED', FALSE, 98.00, CURRENT_TIMESTAMP - INTERVAL '6 days'),

-- Sinh viên 4: SV2024004 (Chuyên ngành An toàn Thông tin)
(7, 4, 12, 'REGISTERED', FALSE, 96.00, CURRENT_TIMESTAMP - INTERVAL '5 days'),
(8, 4, 19, 'REGISTERED', FALSE, 94.00, CURRENT_TIMESTAMP - INTERVAL '4 days'),

-- Sinh viên 5: SV2024005 (Hoàng Cương Cát - Chuyên ngành KTPM & PWA)
(9, 5, 1, 'REGISTERED', FALSE, 100.00, CURRENT_TIMESTAMP - INTERVAL '10 days'),
(10, 5, 12, 'REGISTERED', FALSE, 98.00, CURRENT_TIMESTAMP - INTERVAL '5 days'),
(11, 5, 16, 'REGISTERED', FALSE, 95.00, CURRENT_TIMESTAMP - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

SELECT setval('enrollments_id_seq', (SELECT MAX(id) FROM enrollments));

-- Đồng bộ số lượng sinh viên thực tế đã đăng ký vào class_sections
UPDATE class_sections cs
SET current_enrolled = (
    SELECT COUNT(*) FROM enrollments e 
    WHERE e.class_section_id = cs.id AND e.status IN ('REGISTERED', 'COMPLETED')
);

-- 6. Insert Grades (Bảng điểm mẫu cho sinh viên)
INSERT INTO grades (id, enrollment_id, attendance_score, midterm_score, final_score, total_score, letter_grade, is_locked) VALUES
(1, 1, 9.5, 8.5, 8.8, 8.78, 'A', FALSE),
(2, 2, 10.0, 9.0, 8.5, 8.80, 'A', FALSE),
(3, 9, 10.0, 9.5, 9.2, 9.38, 'A+', TRUE),
(4, 10, 9.5, 8.8, 9.0, 9.01, 'A', TRUE)
ON CONFLICT (id) DO NOTHING;

SELECT setval('grades_id_seq', (SELECT MAX(id) FROM grades));

-- 7. Insert Tuition Fees (Học phí chân thực phục vụ demo thanh toán VietQR / PayOS)
INSERT INTO tuition_fees (id, student_id, semester_name, total_credits, credit_unit_price, facility_fee, total_amount, paid_amount, status, due_date, payment_date, transaction_code, payment_method, payos_order_code, created_at) VALUES
(1, 1, '2024-25_SEM2', 6, 450000.00, 300000.00, 3000000.00, 0.00, 'UNPAID', '2025-03-31', NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '10 days'),
(2, 2, '2024-25_SEM2', 6, 450000.00, 300000.00, 3000000.00, 0.00, 'UNPAID', '2025-03-31', NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '8 days'),
(3, 5, '2024-25_SEM2', 10, 450000.00, 300000.00, 4800000.00, 4800000.00, 'PAID', '2025-03-31', CURRENT_TIMESTAMP - INTERVAL '2 days', 'TXN-PAYOS-20250215-001', 'PayOS VietQR (Tự động)', 8947219501, CURRENT_TIMESTAMP - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

SELECT setval('tuition_fees_id_seq', (SELECT MAX(id) FROM tuition_fees));

-- 8. Insert Announcements (Bảng tin Đào tạo sinh động cho trang chủ & Portal)
INSERT INTO announcements (id, title, category, content, author, is_pinned, created_at) VALUES
(1, 'Thông báo Kế hoạch Đăng ký Học phần Học kỳ 2 (2024-2025)', 'HỌC VỤ', 
 'Phòng Quản lý Đào tạo thông báo kế hoạch đăng ký học phần Học kỳ 2 năm học 2024-2025 cho toàn thể sinh viên các khóa. Hệ thống mở cổng đăng ký chính thức từ 08:00 ngày 15/02/2025 đến 23:59 ngày 28/02/2025. Sinh viên sử dụng tính năng Smart Schedule Optimizer để chọn lịch học tối ưu ca sáng hoặc ca chiều tránh xung đột thời khóa biểu.', 
 'Phòng Quản lý Đào tạo', TRUE, CURRENT_TIMESTAMP - INTERVAL '5 days'),

(2, 'Hướng dẫn Đóng Học phí và Xác thực Tự động qua Cổng VietQR / PayOS', 'TÀI CHÍNH', 
 'Học viện Rikkei đã triển khai thành công hệ thống thu nộp học phí trực tuyến liên thông ngân hàng qua chuẩn VietQR và cổng PayOS. Sinh viên truy cập phân hệ Học phí để xem chi tiết bảng kê tín chỉ và thực hiện thanh toán nhanh 24/7. Hệ thống tự động gạch nợ tức thì ngay khi giao dịch thành công mà không cần nộp giấy báo nợ.', 
 'Phòng Kế hoạch Tài chính', TRUE, CURRENT_TIMESTAMP - INTERVAL '4 days'),

(3, 'Lịch Thi Kết thúc Học phần và Quy định Phòng thi Chuẩn Quốc tế', 'KHẢO THÍ', 
 'Phòng Khảo thí & Đảm bảo Chất lượng công bố lịch thi học kỳ đợt 1. Sinh viên có mặt tại phòng thi trước giờ làm bài 15 phút, xuất trình Thẻ sinh viên hoặc Căn cước công dân gắn chip. Mọi trường hợp vi phạm quy chế thi sẽ bị xử lý kỷ luật nghiêm theo quy định đào tạo.', 
 'Phòng Khảo thí & ĐBCL', FALSE, CURRENT_TIMESTAMP - INTERVAL '3 days'),

(4, 'Chương trình Học bổng Khuyến khích Tài năng Công nghệ Rikkei 2025', 'HỌC BỔNG', 
 'Học viện Rikkei trao tặng 30 suất học bổng toàn phần và bán phần dành cho các bạn sinh viên có kết quả học tập xuất sắc (CGPA >= 8.5) và đạt giải thưởng trong các cuộc thi Olympic Tin học, Hackathon công nghệ. Hạn chót nhận hồ sơ xét duyệt là 20/03/2025.', 
 'Hội đồng Học bổng Rikkei', FALSE, CURRENT_TIMESTAMP - INTERVAL '2 days'),

(5, 'Hội thảo Định hướng Kỹ sư AI, Cloud Computing & Cơ hội Làm việc tại Nhật Bản', 'SỰ KIỆN', 
 'Trân trọng kính mời các bạn sinh viên tham dự buổi tọa đàm công nghệ chuyên sâu cùng Ban Lãnh đạo Tập đoàn Rikkei và các chuyên gia cấp cao từ Rikkei Japan. Nội dung: Xu hướng kiến trúc Microservices, Generative AI doanh nghiệp và lộ trình đào tạo Kỹ sư Cầu nối BrSE chuẩn quốc tế.', 
 'Ban Hợp tác Doanh nghiệp', FALSE, CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

SELECT setval('announcements_id_seq', (SELECT MAX(id) FROM announcements));

-- 9. Insert Notifications (Chuông thông báo người dùng)
INSERT INTO notifications (id, user_id, title, message, type, is_read, link_url, created_at) VALUES
(1, 4, 'Cổng Đăng ký Học phần đã mở', 'Học kỳ 2 (2024-2025) đã chính thức mở cổng đăng ký học phần. Vui lòng hoàn tất đăng ký trước hạn chót.', 'ENROLLMENT', FALSE, '/student/register', CURRENT_TIMESTAMP - INTERVAL '3 days'),
(2, 4, 'Bảng điểm Môn CS201 đã công bố', 'Giảng viên đã hoàn tất chấm điểm và công bố điểm môn Cấu trúc Dữ liệu & Giải thuật. Điểm tổng kết: 8.78 (Điểm A).', 'ACADEMIC', FALSE, '/student/grades', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(3, 4, 'Nhắc nhở Thời hạn Nộp Học phí', 'Phiếu báo học phí Học kỳ 2 đã sẵn sàng. Vui lòng thanh toán trước ngày 31/03/2025 qua VietQR.', 'TUITION', FALSE, '/student/tuition', CURRENT_TIMESTAMP - INTERVAL '1 day'),
(4, 11, 'Chào mừng Tân Sinh viên Xuất sắc', 'Chúc mừng bạn Hoàng Cương Cát đã đăng ký thành công vào hệ thống Rikkei EduPortal.', 'GENERAL', TRUE, '/student/dashboard', CURRENT_TIMESTAMP - INTERVAL '4 days'),
(5, 2, 'Lớp học phần mới được phân công', 'Bạn đã được phân công phụ trách giảng dạy lớp học phần CS201-2025-01 trong Học kỳ 2.', 'TEACHING', FALSE, '/lecturer/classes', CURRENT_TIMESTAMP - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

SELECT setval('notifications_id_seq', (SELECT MAX(id) FROM notifications));

-- 10. Insert Exam Schedules (Lịch thi các lớp học phần trong kỳ)
INSERT INTO exam_schedules (id, class_section_id, exam_date, start_time, end_time, room_name, exam_type, notes, created_at) VALUES
(1, 1, DATE '2025-06-16', '08:00:00', '09:30:00', 'Room A-204', 'THI MÁY', 'Sinh viên có mặt trước 15 phút, xuất trình thẻ sinh viên', CURRENT_TIMESTAMP - INTERVAL '7 days'),
(2, 2, DATE '2025-06-17', '09:45:00', '11:15:00', 'Room B-101', 'TỰ LUẬN', 'Được sử dụng 01 tờ tài liệu viết tay khổ A4', CURRENT_TIMESTAMP - INTERVAL '7 days'),
(3, 3, DATE '2025-06-18', '13:30:00', '15:00:00', 'Lab 3',      'THI MÁY', 'Thi thực hành lập trình trực tuyến trên máy chủ trường', CURRENT_TIMESTAMP - INTERVAL '7 days'),
(4, 4, DATE '2025-06-19', '08:00:00', '09:30:00', 'Room A-301', 'BẢO VỆ ĐỒ ÁN', 'Nộp báo cáo đồ án và slide trước giờ thi 24h', CURRENT_TIMESTAMP - INTERVAL '7 days'),
(5, 5, DATE '2025-06-20', '15:15:00', '16:45:00', 'Lab 1',      'THI MÁY', 'Thi trắc nghiệm và code test trên hệ thống Rikkei Code', CURRENT_TIMESTAMP - INTERVAL '7 days')
ON CONFLICT (id) DO NOTHING;

SELECT setval('exam_schedules_id_seq', (SELECT MAX(id) FROM exam_schedules));
