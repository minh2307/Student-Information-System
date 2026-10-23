-- ====================================================================
-- Rikkei EduPortal - Massive Academic Data Seed
-- Comprehensive Course Catalog, Lecturers, Semesters, Sections & Exams
-- ====================================================================

-- 1. Ensure Standard Academic Semesters
INSERT INTO semesters (semester_code, semester_name, academic_year, is_active, is_registration_open, start_date, end_date) VALUES
('2023-24_SEM1', 'Học kỳ 1 (2023-2024)', '2023-2024', FALSE, FALSE, '2023-09-01', '2024-01-15'),
('2023-24_SEM2', 'Học kỳ 2 (2023-2024)', '2023-2024', FALSE, FALSE, '2024-02-01', '2024-06-30'),
('2024-25_SEM1', 'Học kỳ 1 (2024-2025)', '2024-2025', FALSE, FALSE, '2024-09-01', '2025-01-15'),
('2024-25_SEM2', 'Học kỳ 2 (2024-2025) [Hiện tại]', '2024-2025', TRUE, TRUE, '2025-02-01', '2025-06-30'),
('2025-26_SEM1', 'Học kỳ 1 (2025-2026 - Mở ĐK)', '2025-2026', FALSE, TRUE, '2025-09-01', '2026-01-15'),
('2025-26_SEM2', 'Học kỳ 2 (2025-2026)', '2025-2026', FALSE, FALSE, '2026-02-01', '2026-06-30'),
('2026-27_SEM1', 'Học kỳ 1 (2026-2027)', '2026-2027', FALSE, FALSE, '2026-09-01', '2027-01-15')
ON CONFLICT (semester_code) DO UPDATE SET
  semester_name = EXCLUDED.semester_name,
  is_active = EXCLUDED.is_active,
  is_registration_open = EXCLUDED.is_registration_open;

-- 2. Insert Additional Distinguished Lecturers (Users + Lecturer Profiles)
INSERT INTO users (username, email, password_hash, full_name, role, avatar_url, status) VALUES
('gv003', 'lehoanglong@rikkei.edu.vn', '$2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu', 'PGS. TS. Lê Hoàng Long', 'LECTURER', '/images/avatars/gyj-6.jpg', 'ACTIVE'),
('gv004', 'phamminhtuan@rikkei.edu.vn', '$2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu', 'TS. Phạm Minh Tuấn', 'LECTURER', '/images/avatars/gyj-7.jpg', 'ACTIVE'),
('gv005', 'hoangbichngoc@rikkei.edu.vn', '$2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu', 'ThS. Hoàng Bích Ngọc', 'LECTURER', '/images/avatars/gyj-8.jpg', 'ACTIVE'),
('gv006', 'vutrongkhoi@rikkei.edu.vn', '$2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu', 'TS. Vũ Trọng Khôi', 'LECTURER', '/images/avatars/gyj-9.jpg', 'ACTIVE'),
('gv007', 'dothuytrang@rikkei.edu.vn', '$2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu', 'ThS. Đỗ Thùy Trang', 'LECTURER', '/images/avatars/gyj-10.jpg', 'ACTIVE'),
('gv008', 'trinhhoainam@rikkei.edu.vn', '$2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu', 'ThS. Trịnh Hoài Nam', 'LECTURER', '/images/avatars/gyj-11.jpg', 'ACTIVE'),
('gv009', 'dinhquangvinh@rikkei.edu.vn', '$2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu', 'PGS. TS. Đinh Quang Vinh', 'LECTURER', '/images/avatars/gyj-12.jpg', 'ACTIVE'),
('gv010', 'buiphuongnam@rikkei.edu.vn', '$2a$10$978WITv9p0eXOOmtcn9XsuW7oD6Z1320b/uCqH1yHAgDz14jnP.xu', 'TS. Bùi Phương Nam', 'LECTURER', '/images/avatars/gyj-13.jpg', 'ACTIVE')
ON CONFLICT (username) DO NOTHING;

INSERT INTO lecturer_profiles (user_id, lecturer_code, department, degree)
SELECT u.id, 'GV003', 'Khoa Khoa học Máy tính', 'Phó Giáo sư, Tiến sĩ' FROM users u WHERE u.username = 'gv003' ON CONFLICT (lecturer_code) DO NOTHING;
INSERT INTO lecturer_profiles (user_id, lecturer_code, department, degree)
SELECT u.id, 'GV004', 'Khoa Trí tuệ Nhân tạo & DS', 'Tiến sĩ' FROM users u WHERE u.username = 'gv004' ON CONFLICT (lecturer_code) DO NOTHING;
INSERT INTO lecturer_profiles (user_id, lecturer_code, department, degree)
SELECT u.id, 'GV005', 'Khoa An toàn Thông tin', 'Thạc sĩ' FROM users u WHERE u.username = 'gv005' ON CONFLICT (lecturer_code) DO NOTHING;
INSERT INTO lecturer_profiles (user_id, lecturer_code, department, degree)
SELECT u.id, 'GV006', 'Khoa Kỹ nghệ Phần mềm & Cloud', 'Tiến sĩ' FROM users u WHERE u.username = 'gv006' ON CONFLICT (lecturer_code) DO NOTHING;
INSERT INTO lecturer_profiles (user_id, lecturer_code, department, degree)
SELECT u.id, 'GV007', 'Bộ môn Ngoại ngữ CNTT', 'Thạc sĩ' FROM users u WHERE u.username = 'gv007' ON CONFLICT (lecturer_code) DO NOTHING;
INSERT INTO lecturer_profiles (user_id, lecturer_code, department, degree)
SELECT u.id, 'GV008', 'Khoa Hệ thống Thông tin Doanh nghiệp', 'Thạc sĩ' FROM users u WHERE u.username = 'gv008' ON CONFLICT (lecturer_code) DO NOTHING;
INSERT INTO lecturer_profiles (user_id, lecturer_code, department, degree)
SELECT u.id, 'GV009', 'Viện Nghiên cứu Rikkei AI Lab', 'Phó Giáo sư, Tiến sĩ' FROM users u WHERE u.username = 'gv009' ON CONFLICT (lecturer_code) DO NOTHING;
INSERT INTO lecturer_profiles (user_id, lecturer_code, department, degree)
SELECT u.id, 'GV010', 'Bộ môn Khoa học Cơ bản & Toán', 'Tiến sĩ' FROM users u WHERE u.username = 'gv010' ON CONFLICT (lecturer_code) DO NOTHING;

-- 3. Comprehensive Course Catalog (30 Courses across all disciplines)
INSERT INTO courses (course_code, name, credits, weekly_hours, syllabus_description) VALUES
-- Lập trình & Kỹ nghệ Phần mềm
('CS102', 'Lập trình Hướng đối tượng Java', 3, 4, 'Nguyên lý OOP: Encapsulation, Inheritance, Polymorphism, Abstraction và Design Patterns cơ bản.'),
('CS202', 'Kiến trúc Máy tính & Vi xử lý', 3, 3, 'Tổ chức phần cứng, tập lệnh Assembly x86/ARM, Pipeline và phân cấp bộ nhớ Cache.'),
('CS302', 'Hệ Điều hành & Lập trình Hệ thống', 3, 4, 'Tiến trình, luồng (threads), lập lịch CPU, đồng bộ hóa bộ nhớ và lập trình Shell Linux.'),
('CS303', 'Mạng Máy tính & Giao thức Mạng', 3, 4, 'Mô hình OSI/TCP-IP, định tuyến IP, TCP/UDP sockets, DNS, HTTP/2 và bảo mật mạng cơ bản.'),
('CS305', 'Phân tích & Thiết kế Thuật toán Nâng cao', 3, 3, 'Quy hoạch động, đồ thị luồng mạng (Network Flow), giải thuật xấp xỉ và NP-Complete.'),
('CS403', 'Lập trình Ứng dụng Di động Flutter & React Native', 3, 4, 'Phát triển ứng dụng Mobile đa nền tảng iOS/Android với State Management hiện đại.'),
('CS405', 'Điện toán Đám mây & Thực hành DevOps', 4, 4, 'Containerization Docker, Kubernetes Orchestration, CI/CD Pipeline và dịch vụ AWS Cloud.'),
('CS408', 'Kiến trúc Vi dịch vụ Microservices', 4, 4, 'Thiết kế Domain-Driven Design (DDD), API Gateway, Event-Driven Architecture với Kafka và RabbitMQ.'),
('CS490', 'Đồ án Tốt nghiệp Kỹ sư CNTT', 10, 10, 'Thực hiện đề tài nghiên cứu hoặc sản phẩm công nghệ phần mềm thực tế theo chuẩn doanh nghiệp.'),

-- Trí tuệ Nhân tạo & Khoa học Dữ liệu
('AI201', 'Học máy Cơ bản & Khai phá Dữ liệu', 4, 4, 'Supervised & Unsupervised Learning: Hồi quy tuyến tính, SVM, Random Forest, K-Means và Scikit-Learn.'),
('AI301', 'Học sâu & Thị giác Máy tính', 4, 4, 'Mạng CNN, ResNet, YOLO Object Detection, Phân đoạn ảnh y tế với PyTorch.'),
('AI302', 'Xử lý Ngôn ngữ Tự nhiên & LLM', 4, 4, 'Transformer Architecture, BERT, GPT, Fine-tuning mô hình ngôn ngữ lớn và RAG với Vector DB.'),
('AI401', 'Học Tăng cường & Robot Thông minh', 3, 3, 'Markov Decision Process, Q-Learning, Policy Gradient và điều khiển tự động hóa tác tử.'),
('DS201', 'Thống kê Ứng dụng & Phân tích Dữ liệu', 3, 3, 'Xác suất thống kê, kiểm định giả thuyết A/B testing, EDA với Pandas và Seaborn.'),
('DS301', 'Kỹ nghệ Dữ liệu Lớn với Spark', 4, 4, 'Xử lý dữ liệu phân tán quy mô Terabyte với Apache Spark, PySpark và Data Lakehouse.'),

-- An toàn Thông tin
('SEC201', 'Cơ sở An toàn & Bảo mật Thông tin', 3, 3, 'Nguyên lý CIA Triad, kiểm soát truy cập AAA, phân tích mã độc và chính sách an ninh thông tin.'),
('SEC301', 'Mật mã học & Giao thức An toàn', 3, 3, 'Mật mã đối xứng AES, bất đối xứng RSA/ECC, chữ ký số, chứng chỉ SSL/TLS và Blockchain.'),
('SEC401', 'Kiểm thử Xâm nhập & Đánh giá Lỗ hổng', 3, 4, 'Kỹ thuật Ethical Hacking, kiểm thử OWASP Top 10, khai thác lỗ hổng với Burp Suite và Metasploit.'),
('SEC402', 'An toàn Điện toán Đám mây & SOC', 3, 3, 'Kiến trúc Zero Trust, Cloud IAM, giám sát an ninh SIEM/SOC và phản ứng sự cố Incident Response.'),

-- Hệ thống Thông tin & Quản trị Doanh nghiệp
('IS201', 'Phân tích & Thiết kế Hệ thống Thông tin', 3, 3, 'Mô hình hóa nghiệp vụ với UML, thiết kế CSDL thực thể quan hệ ERD và kiến trúc phần mềm.'),
('IS301', 'Hệ thống ERP Doanh nghiệp', 3, 3, 'Triển khai và tích hợp giải pháp quản trị tổng thể doanh nghiệp SAP/Odoo.'),
('IS401', 'Quản trị Dự án Công nghệ Thông tin', 3, 3, 'Phương pháp luận PMP, Agile Scrum, quản lý ngân sách, rủi ro và tiến độ dự án Jira.'),
('BA201', 'Phân tích Nghiệp vụ Phần mềm (Business Analysis)', 3, 3, 'Khai phá yêu cầu người dùng, viết User Story, tiêu chí chấp nhận Acceptance Criteria và BPMN.'),

-- Toán & Ngoại ngữ Chuyên ngành
('MATH101', 'Giải tích cho Kỹ thuật', 3, 3, 'Đạo hàm, tích phân nhiều biến, chuỗi Fourier và ứng dụng trong xử lý tín hiệu số.'),
('MATH102', 'Đại số Tuyến tính & Ứng dụng AI', 3, 3, 'Không gian vector, ma trận, trị riêng, SVD và ứng dụng trong nén ảnh và Machine Learning.'),
('MATH201', 'Toán Rời rạc & Lý thuyết Đồ thị', 3, 3, 'Logic mệnh đề, tập hợp, quan hệ, tổ hợp và các thuật toán đồ thị cơ bản.'),
('ENG101', 'Tiếng Anh Chuyên ngành CNTT 1', 3, 3, 'Từ vựng kỹ thuật, đọc hiểu tài liệu API, viết email và báo cáo kỹ thuật phần mềm.'),
('ENG102', 'Tiếng Anh Chuyên ngành CNTT 2', 3, 3, 'Thuyết trình sản phẩm công nghệ, phỏng vấn kỹ thuật và giao tiếp với khách hàng quốc tế.'),
('JAP101', 'Tiếng Nhật CNTT N5 & Văn hóa Rikkei', 3, 4, 'Bảng chữ cái, ngữ pháp sơ cấp, từ vựng kỹ thuật lập trình và tác phong làm việc chuẩn Nhật Bản.'),
('JAP102', 'Tiếng Nhật CNTT N4 Kỹ sư Cầu nối BrSE', 3, 4, 'Giao tiếp công sở IT Nhật, đọc hiểu spec dự án, dịch tài liệu thiết kế hệ thống và trao đổi khách hàng.')
ON CONFLICT (course_code) DO NOTHING;

-- Thiết lập điều kiện tiên quyết (Prerequisites)
UPDATE courses SET prerequisite_course_id = (SELECT id FROM courses WHERE course_code = 'CS101') WHERE course_code = 'CS102';
UPDATE courses SET prerequisite_course_id = (SELECT id FROM courses WHERE course_code = 'CS201') WHERE course_code = 'CS305';
UPDATE courses SET prerequisite_course_id = (SELECT id FROM courses WHERE course_code = 'CS201') WHERE course_code = 'AI201';
UPDATE courses SET prerequisite_course_id = (SELECT id FROM courses WHERE course_code = 'AI201') WHERE course_code = 'AI301';
UPDATE courses SET prerequisite_course_id = (SELECT id FROM courses WHERE course_code = 'AI201') WHERE course_code = 'AI302';
UPDATE courses SET prerequisite_course_id = (SELECT id FROM courses WHERE course_code = 'CS401') WHERE course_code = 'CS408';
UPDATE courses SET prerequisite_course_id = (SELECT id FROM courses WHERE course_code = 'SEC201') WHERE course_code = 'SEC401';
UPDATE courses SET prerequisite_course_id = (SELECT id FROM courses WHERE course_code = 'JAP101') WHERE course_code = 'JAP102';
UPDATE courses SET prerequisite_course_id = (SELECT id FROM courses WHERE course_code = 'ENG101') WHERE course_code = 'ENG102';

-- 4. Insert Massive Class Sections across all Semesters
-- Let's define a function or series of inserts
DO $$
DECLARE
    -- Course IDs
    c_cs101 BIGINT; c_cs102 BIGINT; c_cs201 BIGINT; c_cs202 BIGINT;
    c_cs301 BIGINT; c_cs302 BIGINT; c_cs303 BIGINT; c_cs305 BIGINT;
    c_cs401 BIGINT; c_cs402 BIGINT; c_cs403 BIGINT; c_cs405 BIGINT; c_cs408 BIGINT; c_cs490 BIGINT;
    c_ai101 BIGINT; c_ai201 BIGINT; c_ai301 BIGINT; c_ai302 BIGINT; c_ai401 BIGINT;
    c_ds201 BIGINT; c_ds301 BIGINT;
    c_sec201 BIGINT; c_sec301 BIGINT; c_sec401 BIGINT; c_sec402 BIGINT;
    c_is201 BIGINT; c_is301 BIGINT; c_is401 BIGINT; c_ba201 BIGINT;
    c_m101 BIGINT; c_m102 BIGINT; c_m201 BIGINT;
    c_eng101 BIGINT; c_eng102 BIGINT; c_jap101 BIGINT; c_jap102 BIGINT;

    -- Lecturer IDs
    l1 BIGINT; l2 BIGINT; l3 BIGINT; l4 BIGINT; l5 BIGINT;
    l6 BIGINT; l7 BIGINT; l8 BIGINT; l9 BIGINT; l10 BIGINT;
BEGIN
    -- Resolve courses
    SELECT id INTO c_cs101 FROM courses WHERE course_code = 'CS101';
    SELECT id INTO c_cs102 FROM courses WHERE course_code = 'CS102';
    SELECT id INTO c_cs201 FROM courses WHERE course_code = 'CS201';
    SELECT id INTO c_cs202 FROM courses WHERE course_code = 'CS202';
    SELECT id INTO c_cs301 FROM courses WHERE course_code = 'CS301';
    SELECT id INTO c_cs302 FROM courses WHERE course_code = 'CS302';
    SELECT id INTO c_cs303 FROM courses WHERE course_code = 'CS303';
    SELECT id INTO c_cs305 FROM courses WHERE course_code = 'CS305';
    SELECT id INTO c_cs401 FROM courses WHERE course_code = 'CS401';
    SELECT id INTO c_cs402 FROM courses WHERE course_code = 'CS402';
    SELECT id INTO c_cs403 FROM courses WHERE course_code = 'CS403';
    SELECT id INTO c_cs405 FROM courses WHERE course_code = 'CS405';
    SELECT id INTO c_cs408 FROM courses WHERE course_code = 'CS408';
    SELECT id INTO c_cs490 FROM courses WHERE course_code = 'CS490';
    SELECT id INTO c_ai101 FROM courses WHERE course_code = 'AI101';
    SELECT id INTO c_ai201 FROM courses WHERE course_code = 'AI201';
    SELECT id INTO c_ai301 FROM courses WHERE course_code = 'AI301';
    SELECT id INTO c_ai302 FROM courses WHERE course_code = 'AI302';
    SELECT id INTO c_ai401 FROM courses WHERE course_code = 'AI401';
    SELECT id INTO c_ds201 FROM courses WHERE course_code = 'DS201';
    SELECT id INTO c_ds301 FROM courses WHERE course_code = 'DS301';
    SELECT id INTO c_sec201 FROM courses WHERE course_code = 'SEC201';
    SELECT id INTO c_sec301 FROM courses WHERE course_code = 'SEC301';
    SELECT id INTO c_sec401 FROM courses WHERE course_code = 'SEC401';
    SELECT id INTO c_sec402 FROM courses WHERE course_code = 'SEC402';
    SELECT id INTO c_is201 FROM courses WHERE course_code = 'IS201';
    SELECT id INTO c_is301 FROM courses WHERE course_code = 'IS301';
    SELECT id INTO c_is401 FROM courses WHERE course_code = 'IS401';
    SELECT id INTO c_ba201 FROM courses WHERE course_code = 'BA201';
    SELECT id INTO c_m101 FROM courses WHERE course_code = 'MATH101';
    SELECT id INTO c_m102 FROM courses WHERE course_code = 'MATH102';
    SELECT id INTO c_m201 FROM courses WHERE course_code = 'MATH201';
    SELECT id INTO c_eng101 FROM courses WHERE course_code = 'ENG101';
    SELECT id INTO c_eng102 FROM courses WHERE course_code = 'ENG102';
    SELECT id INTO c_jap101 FROM courses WHERE course_code = 'JAP101';
    SELECT id INTO c_jap102 FROM courses WHERE course_code = 'JAP102';

    -- Resolve lecturers
    SELECT id INTO l1 FROM lecturer_profiles WHERE lecturer_code = 'GV001';
    SELECT id INTO l2 FROM lecturer_profiles WHERE lecturer_code = 'GV002';
    SELECT id INTO l3 FROM lecturer_profiles WHERE lecturer_code = 'GV003';
    SELECT id INTO l4 FROM lecturer_profiles WHERE lecturer_code = 'GV004';
    SELECT id INTO l5 FROM lecturer_profiles WHERE lecturer_code = 'GV005';
    SELECT id INTO l6 FROM lecturer_profiles WHERE lecturer_code = 'GV006';
    SELECT id INTO l7 FROM lecturer_profiles WHERE lecturer_code = 'GV007';
    SELECT id INTO l8 FROM lecturer_profiles WHERE lecturer_code = 'GV008';
    SELECT id INTO l9 FROM lecturer_profiles WHERE lecturer_code = 'GV009';
    SELECT id INTO l10 FROM lecturer_profiles WHERE lecturer_code = 'GV010';

    -- Fallbacks
    IF l3 IS NULL THEN l3 := l1; END IF;
    IF l4 IS NULL THEN l4 := l2; END IF;
    IF l5 IS NULL THEN l5 := l1; END IF;
    IF l6 IS NULL THEN l6 := l2; END IF;
    IF l7 IS NULL THEN l7 := l1; END IF;
    IF l8 IS NULL THEN l8 := l2; END IF;
    IF l9 IS NULL THEN l9 := l1; END IF;
    IF l10 IS NULL THEN l10 := l2; END IF;

    -- =========================================================================
    -- HỌC KỲ 1 (2023-2024) - Lịch sử quá khứ
    -- =========================================================================
    INSERT INTO class_sections (section_code, course_id, lecturer_id, semester_name, day_of_week, start_time, end_time, room_name, max_capacity, current_enrolled, status) VALUES
    ('CS101-231-01', c_cs101, l1, '2023-24_SEM1', 'MON', '07:30', '09:00', 'P.A-101', 45, 42, 'CLOSED'),
    ('MATH101-231-01', c_m101, l10, '2023-24_SEM1', 'TUE', '09:15', '10:45', 'P.A-201', 50, 48, 'CLOSED'),
    ('MATH102-231-01', c_m102, l10, '2023-24_SEM1', 'WED', '07:30', '09:00', 'P.A-202', 45, 40, 'CLOSED'),
    ('ENG101-231-01', c_eng101, l7, '2023-24_SEM1', 'THU', '13:00', '14:30', 'P.B-105', 40, 39, 'CLOSED'),
    ('JAP101-231-01', c_jap101, l7, '2023-24_SEM1', 'FRI', '09:15', '10:45', 'P.B-201', 35, 33, 'CLOSED')
    ON CONFLICT (section_code) DO NOTHING;

    -- =========================================================================
    -- HỌC KỲ 2 (2023-2024) - Lịch sử quá khứ
    -- =========================================================================
    INSERT INTO class_sections (section_code, course_id, lecturer_id, semester_name, day_of_week, start_time, end_time, room_name, max_capacity, current_enrolled, status) VALUES
    ('CS102-232-01', c_cs102, l1, '2023-24_SEM2', 'MON', '09:15', '10:45', 'Lab IT-1', 40, 38, 'CLOSED'),
    ('MATH201-232-01', c_m201, l10, '2023-24_SEM2', 'TUE', '07:30', '09:00', 'P.A-102', 45, 44, 'CLOSED'),
    ('CS202-232-01', c_cs202, l3, '2023-24_SEM2', 'WED', '13:00', '14:30', 'P.A-301', 40, 37, 'CLOSED'),
    ('ENG102-232-01', c_eng102, l7, '2023-24_SEM2', 'THU', '14:45', '16:15', 'P.B-105', 35, 34, 'CLOSED'),
    ('JAP102-232-01', c_jap102, l7, '2023-24_SEM2', 'FRI', '13:00', '14:30', 'P.B-202', 30, 28, 'CLOSED')
    ON CONFLICT (section_code) DO NOTHING;

    -- =========================================================================
    -- HỌC KỲ 1 (2024-2025) - Vừa hoàn thành
    -- =========================================================================
    INSERT INTO class_sections (section_code, course_id, lecturer_id, semester_name, day_of_week, start_time, end_time, room_name, max_capacity, current_enrolled, status) VALUES
    ('CS201-241-01', c_cs201, l1, '2024-25_SEM1', 'MON', '09:15', '10:45', 'Lab IT-2', 40, 39, 'CLOSED'),
    ('CS301-241-01', c_cs301, l2, '2024-25_SEM1', 'TUE', '13:00', '14:30', 'P.B-204', 40, 38, 'CLOSED'),
    ('CS302-241-01', c_cs302, l3, '2024-25_SEM1', 'WED', '07:30', '09:00', 'P.A-205', 40, 35, 'CLOSED'),
    ('SEC201-241-01', c_sec201, l5, '2024-25_SEM1', 'THU', '09:15', '10:45', 'P.A-302', 45, 42, 'CLOSED'),
    ('DS201-241-01', c_ds201, l4, '2024-25_SEM1', 'FRI', '14:45', '16:15', 'Lab AI-1', 35, 33, 'CLOSED')
    ON CONFLICT (section_code) DO NOTHING;

    -- =========================================================================
    -- HỌC KỲ 2 (2024-2025) - [HIỆN TẠI - ĐANG MỞ ĐĂNG KÝ RỘNG RÃI]
    -- Rất nhiều lựa chọn đa dạng cho sinh viên
    -- =========================================================================
    INSERT INTO class_sections (section_code, course_id, lecturer_id, semester_name, day_of_week, start_time, end_time, room_name, max_capacity, current_enrolled, status) VALUES
    -- Web & Software Engineering
    ('CS401-242-01', c_cs401, l1, '2024-25_SEM2', 'MON', '07:30', '09:00', 'Lab Web-1', 40, 18, 'OPEN'),
    ('CS401-242-02', c_cs401, l6, '2024-25_SEM2', 'WED', '13:00', '14:30', 'Lab Web-2', 35, 12, 'OPEN'),
    ('CS402-242-01', c_cs402, l2, '2024-25_SEM2', 'THU', '09:15', '10:45', 'P.A-203', 45, 25, 'OPEN'),
    ('CS403-242-01', c_cs403, l6, '2024-25_SEM2', 'TUE', '14:45', '16:15', 'Lab Mobile-1', 35, 20, 'OPEN'),
    ('CS405-242-01', c_cs405, l6, '2024-25_SEM2', 'FRI', '07:30', '09:00', 'Lab Cloud-1', 40, 31, 'OPEN'),
    ('CS408-242-01', c_cs408, l3, '2024-25_SEM2', 'SAT', '09:15', '10:45', 'P.B-301', 35, 14, 'OPEN'),

    -- AI & Data Science
    ('AI101-242-01', c_ai101, l4, '2024-25_SEM2', 'MON', '13:00', '14:30', 'Lab AI-1', 40, 22, 'OPEN'),
    ('AI201-242-01', c_ai201, l4, '2024-25_SEM2', 'TUE', '09:15', '10:45', 'Lab AI-2', 35, 15, 'OPEN'),
    ('AI301-242-01', c_ai301, l9, '2024-25_SEM2', 'WED', '09:15', '10:45', 'Lab Vision-1', 30, 8, 'OPEN'),
    ('AI302-242-01', c_ai302, l9, '2024-25_SEM2', 'THU', '13:00', '14:30', 'Lab LLM-1', 35, 19, 'OPEN'),
    ('DS301-242-01', c_ds301, l4, '2024-25_SEM2', 'FRI', '13:00', '14:30', 'Lab BigData-1', 35, 11, 'OPEN'),

    -- Security & Infrastructure
    ('SEC301-242-01', c_sec301, l5, '2024-25_SEM2', 'MON', '14:45', '16:15', 'P.A-304', 40, 27, 'OPEN'),
    ('SEC401-242-01', c_sec401, l5, '2024-25_SEM2', 'TUE', '07:30', '09:00', 'Lab Security-1', 30, 29, 'OPEN'),
    ('CS303-242-01', c_cs303, l3, '2024-25_SEM2', 'WED', '14:45', '16:15', 'P.B-205', 45, 30, 'OPEN'),
    ('CS305-242-01', c_cs305, l1, '2024-25_SEM2', 'SAT', '07:30', '09:00', 'P.A-204', 35, 10, 'OPEN'),

    -- Business & Project Management
    ('IS201-242-01', c_is201, l8, '2024-25_SEM2', 'THU', '07:30', '09:00', 'P.B-101', 45, 16, 'OPEN'),
    ('IS401-242-01', c_is401, l8, '2024-25_SEM2', 'FRI', '09:15', '10:45', 'P.B-102', 40, 24, 'OPEN'),
    ('BA201-242-01', c_ba201, l8, '2024-25_SEM2', 'SAT', '13:00', '14:30', 'P.B-201', 40, 15, 'OPEN')
    ON CONFLICT (section_code) DO NOTHING;

    -- =========================================================================
    -- HỌC KỲ 1 (2025-2026) - [KỲ TỚI - MỞ ĐĂNG KÝ SỚM]
    -- =========================================================================
    INSERT INTO class_sections (section_code, course_id, lecturer_id, semester_name, day_of_week, start_time, end_time, room_name, max_capacity, current_enrolled, status) VALUES
    ('CS405-251-01', c_cs405, l6, '2025-26_SEM1', 'MON', '07:30', '09:00', 'Lab Cloud-1', 40, 5, 'OPEN'),
    ('CS408-251-01', c_cs408, l3, '2025-26_SEM1', 'MON', '09:15', '10:45', 'P.A-201', 40, 3, 'OPEN'),
    ('AI301-251-01', c_ai301, l9, '2025-26_SEM1', 'TUE', '09:15', '10:45', 'Lab Vision-1', 35, 7, 'OPEN'),
    ('AI302-251-01', c_ai302, l9, '2025-26_SEM1', 'TUE', '13:00', '14:30', 'Lab LLM-1', 35, 12, 'OPEN'),
    ('AI401-251-01', c_ai401, l4, '2025-26_SEM1', 'WED', '07:30', '09:00', 'Lab Robot-1', 30, 4, 'OPEN'),
    ('SEC401-251-01', c_sec401, l5, '2025-26_SEM1', 'WED', '13:00', '14:30', 'Lab Security-1', 30, 9, 'OPEN'),
    ('SEC402-251-01', c_sec402, l5, '2025-26_SEM1', 'THU', '09:15', '10:45', 'P.A-304', 35, 6, 'OPEN'),
    ('IS301-251-01', c_is301, l8, '2025-26_SEM1', 'THU', '14:45', '16:15', 'P.B-203', 40, 2, 'OPEN'),
    ('IS401-251-01', c_is401, l8, '2025-26_SEM1', 'FRI', '07:30', '09:00', 'P.B-103', 45, 8, 'OPEN'),
    ('BA201-251-01', c_ba201, l8, '2025-26_SEM1', 'FRI', '13:00', '14:30', 'P.B-202', 40, 5, 'OPEN'),
    ('CS490-251-01', c_cs490, l1, '2025-26_SEM1', 'SAT', '08:00', '11:00', 'Hội trường C-100', 50, 15, 'OPEN')
    ON CONFLICT (section_code) DO NOTHING;

    -- =========================================================================
    -- HỌC KỲ 2 (2025-2026) - KỲ DỰ KIẾN (CHƯA MỞ)
    -- =========================================================================
    INSERT INTO class_sections (section_code, course_id, lecturer_id, semester_name, day_of_week, start_time, end_time, room_name, max_capacity, current_enrolled, status) VALUES
    ('CS490-252-01', c_cs490, l3, '2025-26_SEM2', 'SAT', '08:00', '11:00', 'Hội trường C-100', 50, 0, 'OPEN'),
    ('AI401-252-01', c_ai401, l9, '2025-26_SEM2', 'MON', '09:15', '10:45', 'Lab Robot-1', 35, 0, 'OPEN'),
    ('SEC402-252-01', c_sec402, l5, '2025-26_SEM2', 'TUE', '13:00', '14:30', 'P.A-304', 35, 0, 'OPEN'),
    ('IS301-252-01', c_is301, l8, '2025-26_SEM2', 'WED', '09:15', '10:45', 'P.B-203', 40, 0, 'OPEN')
    ON CONFLICT (section_code) DO NOTHING;

END $$;

-- 5. Seed Historical Enrollments & Grades for SV2024001 (student_profile_id = 1) across past semesters
-- This gives SV2024001 an authentic transcript!
DO $$
DECLARE
    st1 BIGINT; -- SV2024001
    sec RECORD;
    enr_id BIGINT;
BEGIN
    SELECT id INTO st1 FROM student_profiles WHERE student_code = 'SV2024001';
    IF st1 IS NULL THEN RETURN; END IF;

    -- Past Sem 2023-24_SEM1
    FOR sec IN SELECT id, section_code FROM class_sections WHERE semester_name = '2023-24_SEM1' LIMIT 4 LOOP
        INSERT INTO enrollments (student_id, class_section_id, status, has_conflict, attendance_rate, registered_at)
        VALUES (st1, sec.id, 'COMPLETED', FALSE, 98.00, '2023-09-05 08:30:00')
        ON CONFLICT (student_id, class_section_id) DO NOTHING
        RETURNING id INTO enr_id;

        IF enr_id IS NOT NULL THEN
            INSERT INTO grades (enrollment_id, attendance_score, midterm_score, final_score, total_score, letter_grade, is_locked)
            VALUES (enr_id, 10.0, 9.0, 9.2, 9.14, 'A', TRUE)
            ON CONFLICT (enrollment_id) DO NOTHING;
        END IF;
    END LOOP;

    -- Past Sem 2023-24_SEM2
    FOR sec IN SELECT id, section_code FROM class_sections WHERE semester_name = '2023-24_SEM2' LIMIT 4 LOOP
        INSERT INTO enrollments (student_id, class_section_id, status, has_conflict, attendance_rate, registered_at)
        VALUES (st1, sec.id, 'COMPLETED', FALSE, 95.00, '2024-02-10 09:00:00')
        ON CONFLICT (student_id, class_section_id) DO NOTHING
        RETURNING id INTO enr_id;

        IF enr_id IS NOT NULL THEN
            INSERT INTO grades (enrollment_id, attendance_score, midterm_score, final_score, total_score, letter_grade, is_locked)
            VALUES (enr_id, 9.5, 8.5, 8.8, 8.78, 'A', TRUE)
            ON CONFLICT (enrollment_id) DO NOTHING;
        END IF;
    END LOOP;

    -- Past Sem 2024-25_SEM1
    FOR sec IN SELECT id, section_code FROM class_sections WHERE semester_name = '2024-25_SEM1' LIMIT 4 LOOP
        INSERT INTO enrollments (student_id, class_section_id, status, has_conflict, attendance_rate, registered_at)
        VALUES (st1, sec.id, 'COMPLETED', FALSE, 96.00, '2024-09-08 10:15:00')
        ON CONFLICT (student_id, class_section_id) DO NOTHING
        RETURNING id INTO enr_id;

        IF enr_id IS NOT NULL THEN
            INSERT INTO grades (enrollment_id, attendance_score, midterm_score, final_score, total_score, letter_grade, is_locked)
            VALUES (enr_id, 9.0, 8.5, 8.6, 8.61, 'B+', TRUE)
            ON CONFLICT (enrollment_id) DO NOTHING;
        END IF;
    END LOOP;

    -- Current Sem 2024-25_SEM2: Enroll in 2 more exciting subjects (CS405 Cloud, SEC301)
    FOR sec IN SELECT id FROM class_sections WHERE section_code IN ('CS405-242-01', 'SEC301-242-01') LOOP
        INSERT INTO enrollments (student_id, class_section_id, status, has_conflict, attendance_rate, registered_at)
        VALUES (st1, sec.id, 'REGISTERED', FALSE, 100.00, CURRENT_TIMESTAMP - INTERVAL '2 days')
        ON CONFLICT (student_id, class_section_id) DO NOTHING;
    END LOOP;

END $$;

-- 6. Seed Exam Schedules (Lịch thi) for current & future sections
INSERT INTO exam_schedules (class_section_id, exam_date, start_time, end_time, room_name, exam_type, notes)
SELECT 
    cs.id,
    DATE '2025-06-15' + ((ROW_NUMBER() OVER (ORDER BY cs.id) % 10)::int),
    TIME '08:00:00' + (((ROW_NUMBER() OVER (ORDER BY cs.id) % 4)::int) * INTERVAL '2 hours 30 minutes'),
    TIME '09:30:00' + (((ROW_NUMBER() OVER (ORDER BY cs.id) % 4)::int) * INTERVAL '2 hours 30 minutes'),
    cs.room_name,
    CASE WHEN cs.course_id IN (SELECT id FROM courses WHERE name ILIKE '%Thực hành%' OR name ILIKE '%Lập trình%') 
         THEN 'THI MÁY' 
         WHEN cs.course_id IN (SELECT id FROM courses WHERE name ILIKE '%Đồ án%') 
         THEN 'BẢO VỆ ĐỒ ÁN' 
         ELSE 'TỰ LUẬN' END,
    'Sinh viên mang theo thẻ sinh viên và có mặt trước 15 phút'
FROM class_sections cs
WHERE cs.semester_name IN ('2024-25_SEM2', '2025-26_SEM1')
  AND NOT EXISTS (SELECT 1 FROM exam_schedules es WHERE es.class_section_id = cs.id);

-- 7. Update current_enrolled count in class_sections based on actual active enrollments
UPDATE class_sections cs
SET current_enrolled = (
    SELECT COUNT(*) FROM enrollments e 
    WHERE e.class_section_id = cs.id AND e.status IN ('REGISTERED', 'COMPLETED')
);

-- 8. Reset all sequences to MAX(id)
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));
SELECT setval('lecturer_profiles_id_seq', COALESCE((SELECT MAX(id) FROM lecturer_profiles), 1));
SELECT setval('student_profiles_id_seq', COALESCE((SELECT MAX(id) FROM student_profiles), 1));
SELECT setval('courses_id_seq', COALESCE((SELECT MAX(id) FROM courses), 1));
SELECT setval('semesters_id_seq', COALESCE((SELECT MAX(id) FROM semesters), 1));
SELECT setval('class_sections_id_seq', COALESCE((SELECT MAX(id) FROM class_sections), 1));
SELECT setval('enrollments_id_seq', COALESCE((SELECT MAX(id) FROM enrollments), 1));
SELECT setval('grades_id_seq', COALESCE((SELECT MAX(id) FROM grades), 1));
SELECT setval('exam_schedules_id_seq', COALESCE((SELECT MAX(id) FROM exam_schedules), 1));
