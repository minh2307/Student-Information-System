-- ====================================================================
-- Migration 05: Synchronize all students transcripts and grades (TASK-UNIFY-CREDITS)
-- Ensures all 5 students have authentic, completed transcripts matching
-- exactly their profile credits_earned and current_cgpa.
-- ====================================================================
BEGIN;

-- 1. Ensure 2022-2023 Semesters exist for Year 3 / Semester 6 students
INSERT INTO semesters (semester_code, semester_name, academic_year, is_active, is_registration_open, start_date, end_date) VALUES
('2022-23_SEM1', 'Học kỳ 1 (2022-2023)', '2022-2023', FALSE, FALSE, '2022-09-01', '2023-01-15'),
('2022-23_SEM2', 'Học kỳ 2 (2022-2023)', '2022-2023', FALSE, FALSE, '2023-02-01', '2023-06-30')
ON CONFLICT (semester_code) DO NOTHING;

-- 2. Insert Additional Past Class Sections across earlier semesters
INSERT INTO class_sections (section_code, course_id, lecturer_id, semester_name, day_of_week, start_time, end_time, room_name, max_capacity, current_enrolled, status) VALUES
-- 2022-23_SEM1
('CS101-221-01', (SELECT id FROM courses WHERE course_code = 'CS101'), 1, '2022-23_SEM1', 'MON', '07:30', '09:00', 'P.A-101', 40, 38, 'CLOSED'),
('MATH101-221-01', (SELECT id FROM courses WHERE course_code = 'MATH101'), 10, '2022-23_SEM1', 'TUE', '09:15', '10:45', 'P.A-201', 40, 40, 'CLOSED'),
('MATH102-221-01', (SELECT id FROM courses WHERE course_code = 'MATH102'), 10, '2022-23_SEM1', 'WED', '07:30', '09:00', 'P.B-101', 40, 39, 'CLOSED'),
('ENG101-221-01', (SELECT id FROM courses WHERE course_code = 'ENG101'), 7, '2022-23_SEM1', 'THU', '13:00', '14:30', 'P.B-201', 35, 35, 'CLOSED'),
('JAP101-221-01', (SELECT id FROM courses WHERE course_code = 'JAP101'), 7, '2022-23_SEM1', 'FRI', '09:15', '10:45', 'P.A-301', 30, 28, 'CLOSED'),
('DS201-221-01', (SELECT id FROM courses WHERE course_code = 'DS201'), 4, '2022-23_SEM1', 'SAT', '07:30', '09:00', 'Lab AI-1', 35, 32, 'CLOSED'),

-- 2022-23_SEM2
('CS102-222-01', (SELECT id FROM courses WHERE course_code = 'CS102'), 1, '2022-23_SEM2', 'MON', '09:15', '10:45', 'Lab IT-1', 40, 37, 'CLOSED'),
('MATH201-222-01', (SELECT id FROM courses WHERE course_code = 'MATH201'), 10, '2022-23_SEM2', 'TUE', '13:00', '14:30', 'P.A-202', 40, 39, 'CLOSED'),
('CS202-222-01', (SELECT id FROM courses WHERE course_code = 'CS202'), 3, '2022-23_SEM2', 'WED', '09:15', '10:45', 'P.B-102', 40, 36, 'CLOSED'),
('ENG102-222-01', (SELECT id FROM courses WHERE course_code = 'ENG102'), 7, '2022-23_SEM2', 'THU', '14:45', '16:15', 'P.B-202', 35, 34, 'CLOSED'),
('JAP102-222-01', (SELECT id FROM courses WHERE course_code = 'JAP102'), 7, '2022-23_SEM2', 'FRI', '13:00', '14:30', 'P.A-302', 30, 29, 'CLOSED'),
('SEC201-222-01', (SELECT id FROM courses WHERE course_code = 'SEC201'), 5, '2022-23_SEM2', 'SAT', '09:15', '10:45', 'Lab Sec-1', 40, 35, 'CLOSED'),

-- 2023-24_SEM1 Additional
('CS201-231-01', (SELECT id FROM courses WHERE course_code = 'CS201'), 1, '2023-24_SEM1', 'MON', '13:00', '14:30', 'Lab IT-2', 40, 38, 'CLOSED'),
('CS301-231-01', (SELECT id FROM courses WHERE course_code = 'CS301'), 2, '2023-24_SEM1', 'TUE', '07:30', '09:00', 'P.A-203', 40, 39, 'CLOSED'),
('CS302-231-01', (SELECT id FROM courses WHERE course_code = 'CS302'), 3, '2023-24_SEM1', 'WED', '13:00', '14:30', 'P.B-203', 40, 36, 'CLOSED'),
('IS201-231-01', (SELECT id FROM courses WHERE course_code = 'IS201'), 8, '2023-24_SEM1', 'THU', '09:15', '10:45', 'P.B-103', 40, 35, 'CLOSED'),
('DS201-231-01', (SELECT id FROM courses WHERE course_code = 'DS201'), 4, '2023-24_SEM1', 'FRI', '14:45', '16:15', 'Lab AI-1', 35, 34, 'CLOSED'),

-- 2023-24_SEM2 Additional
('CS303-232-01', (SELECT id FROM courses WHERE course_code = 'CS303'), 3, '2023-24_SEM2', 'MON', '07:30', '09:00', 'P.A-204', 40, 38, 'CLOSED'),
('CS305-232-01', (SELECT id FROM courses WHERE course_code = 'CS305'), 1, '2023-24_SEM2', 'TUE', '09:15', '10:45', 'P.A-205', 35, 34, 'CLOSED'),
('CS402-232-01', (SELECT id FROM courses WHERE course_code = 'CS402'), 2, '2023-24_SEM2', 'WED', '07:30', '09:00', 'P.B-204', 40, 39, 'CLOSED'),
('AI101-232-01', (SELECT id FROM courses WHERE course_code = 'AI101'), 4, '2023-24_SEM2', 'THU', '09:15', '10:45', 'Lab AI-2', 40, 37, 'CLOSED'),
('BA201-232-01', (SELECT id FROM courses WHERE course_code = 'BA201'), 8, '2023-24_SEM2', 'FRI', '07:30', '09:00', 'P.B-104', 40, 36, 'CLOSED'),
('SEC301-232-01', (SELECT id FROM courses WHERE course_code = 'SEC301'), 5, '2023-24_SEM2', 'SAT', '13:00', '14:30', 'Lab Sec-2', 40, 35, 'CLOSED'),

-- 2024-25_SEM1 Additional
('CS401-241-01', (SELECT id FROM courses WHERE course_code = 'CS401'), 1, '2024-25_SEM1', 'MON', '07:30', '09:00', 'Lab Web-1', 40, 39, 'CLOSED'),
('CS403-241-01', (SELECT id FROM courses WHERE course_code = 'CS403'), 6, '2024-25_SEM1', 'MON', '13:00', '14:30', 'Lab Mobile-1', 35, 34, 'CLOSED'),
('CS405-241-01', (SELECT id FROM courses WHERE course_code = 'CS405'), 6, '2024-25_SEM1', 'TUE', '09:15', '10:45', 'Lab Cloud-1', 40, 38, 'CLOSED'),
('CS408-241-01', (SELECT id FROM courses WHERE course_code = 'CS408'), 3, '2024-25_SEM1', 'WED', '14:45', '16:15', 'P.B-301', 35, 35, 'CLOSED'),
('AI201-241-01', (SELECT id FROM courses WHERE course_code = 'AI201'), 4, '2024-25_SEM1', 'THU', '07:30', '09:00', 'Lab AI-1', 35, 35, 'CLOSED'),
('IS301-241-01', (SELECT id FROM courses WHERE course_code = 'IS301'), 8, '2024-25_SEM1', 'THU', '13:00', '14:30', 'P.B-205', 40, 37, 'CLOSED'),
('IS401-241-01', (SELECT id FROM courses WHERE course_code = 'IS401'), 8, '2024-25_SEM1', 'FRI', '09:15', '10:45', 'P.A-206', 40, 38, 'CLOSED'),
('SEC401-241-01', (SELECT id FROM courses WHERE course_code = 'SEC401'), 5, '2024-25_SEM1', 'SAT', '07:30', '09:00', 'Lab Sec-1', 35, 34, 'CLOSED'),
('SEC402-241-01', (SELECT id FROM courses WHERE course_code = 'SEC402'), 5, '2024-25_SEM1', 'SAT', '13:00', '14:30', 'Lab Sec-2', 35, 33, 'CLOSED'),
('CS303-241-01', (SELECT id FROM courses WHERE course_code = 'CS303'), 3, '2024-25_SEM1', 'FRI', '13:00', '14:30', 'P.B-105', 40, 38, 'CLOSED'),
('CS305-241-01', (SELECT id FROM courses WHERE course_code = 'CS305'), 1, '2024-25_SEM1', 'WED', '09:15', '10:45', 'P.A-207', 35, 35, 'CLOSED'),
('CS402-241-01', (SELECT id FROM courses WHERE course_code = 'CS402'), 2, '2024-25_SEM1', 'TUE', '13:00', '14:30', 'P.B-206', 40, 39, 'CLOSED'),
('AI101-241-01', (SELECT id FROM courses WHERE course_code = 'AI101'), 4, '2024-25_SEM1', 'THU', '14:45', '16:15', 'Lab AI-2', 40, 38, 'CLOSED'),
('BA201-241-01', (SELECT id FROM courses WHERE course_code = 'BA201'), 8, '2024-25_SEM1', 'MON', '09:15', '10:45', 'P.B-207', 40, 37, 'CLOSED')
ON CONFLICT (section_code) DO NOTHING;

-- 3. Procedure to seed enrollments and grades safely
CREATE OR REPLACE FUNCTION seed_student_course_grade(
    p_student_code VARCHAR,
    p_section_code VARCHAR,
    p_att NUMERIC,
    p_mid NUMERIC,
    p_fin NUMERIC,
    p_tot NUMERIC,
    p_let VARCHAR
) RETURNS VOID AS $$
DECLARE
    v_student_id BIGINT;
    v_section_id BIGINT;
    v_enr_id BIGINT;
BEGIN
    SELECT id INTO v_student_id FROM student_profiles WHERE student_code = p_student_code;
    SELECT id INTO v_section_id FROM class_sections WHERE section_code = p_section_code;

    IF v_student_id IS NULL OR v_section_id IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO enrollments (student_id, class_section_id, status, has_conflict, attendance_rate, registered_at)
    VALUES (v_student_id, v_section_id, 'COMPLETED', FALSE, p_att * 10, '2023-01-10 08:00:00')
    ON CONFLICT (student_id, class_section_id) DO UPDATE SET status = 'COMPLETED'
    RETURNING id INTO v_enr_id;

    IF v_enr_id IS NULL THEN
        SELECT id INTO v_enr_id FROM enrollments WHERE student_id = v_student_id AND class_section_id = v_section_id;
    END IF;

    IF v_enr_id IS NOT NULL THEN
        INSERT INTO grades (enrollment_id, attendance_score, midterm_score, final_score, total_score, letter_grade, is_locked)
        VALUES (v_enr_id, p_att, p_mid, p_fin, p_tot, p_let, TRUE)
        ON CONFLICT (enrollment_id) DO UPDATE SET
            attendance_score = EXCLUDED.attendance_score,
            midterm_score = EXCLUDED.midterm_score,
            final_score = EXCLUDED.final_score,
            total_score = EXCLUDED.total_score,
            letter_grade = EXCLUDED.letter_grade,
            is_locked = TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Additional 14 courses for Student 1 (SV2024001) to reach 84 credits (GPA: 8.74)
SELECT seed_student_course_grade('SV2024001', 'JAP101-231-01', 10.0, 8.5, 8.8, 8.8, 'A');
SELECT seed_student_course_grade('SV2024001', 'JAP102-232-01', 10.0, 8.5, 8.4, 8.6, 'A');
SELECT seed_student_course_grade('SV2024001', 'DS201-231-01', 10.0, 8.5, 8.6, 8.7, 'A');
SELECT seed_student_course_grade('SV2024001', 'CS303-232-01', 10.0, 8.5, 8.2, 8.5, 'A');
SELECT seed_student_course_grade('SV2024001', 'CS305-232-01', 10.0, 8.5, 9.0, 8.9, 'A');
SELECT seed_student_course_grade('SV2024001', 'AI101-232-01', 10.0, 8.5, 8.4, 8.6, 'A');
SELECT seed_student_course_grade('SV2024001', 'CS402-232-01', 10.0, 8.5, 8.6, 8.7, 'A');
SELECT seed_student_course_grade('SV2024001', 'CS403-241-01', 10.0, 8.5, 8.4, 8.6, 'A');
SELECT seed_student_course_grade('SV2024001', 'IS201-231-01', 10.0, 8.5, 8.2, 8.5, 'A');
SELECT seed_student_course_grade('SV2024001', 'IS301-241-01', 10.0, 8.5, 8.8, 8.8, 'A');
SELECT seed_student_course_grade('SV2024001', 'IS401-241-01', 10.0, 8.5, 8.4, 8.6, 'A');
SELECT seed_student_course_grade('SV2024001', 'BA201-232-01', 10.0, 8.5, 8.6, 8.7, 'A');
SELECT seed_student_course_grade('SV2024001', 'SEC401-241-01', 10.0, 8.5, 8.2, 8.5, 'A');
SELECT seed_student_course_grade('SV2024001', 'SEC402-241-01', 10.0, 8.5, 8.24, 8.52, 'A');

-- 5. Complete Transcript for Student 2 (SV2024002) - 52 credits (GPA: 8.15)
SELECT seed_student_course_grade('SV2024002', 'CS101-231-01', 9.5, 8.0, 8.1, 8.2, 'B+');
SELECT seed_student_course_grade('SV2024002', 'MATH101-231-01', 9.5, 8.0, 7.7, 8.0, 'B+');
SELECT seed_student_course_grade('SV2024002', 'MATH102-231-01', 9.5, 8.0, 8.3, 8.3, 'B+');
SELECT seed_student_course_grade('SV2024002', 'ENG101-231-01', 9.5, 8.0, 7.9, 8.1, 'B+');
SELECT seed_student_course_grade('SV2024002', 'JAP101-231-01', 9.5, 8.0, 8.5, 8.4, 'B+');
SELECT seed_student_course_grade('SV2024002', 'DS201-231-01', 9.5, 8.0, 7.5, 7.9, 'B');
SELECT seed_student_course_grade('SV2024002', 'CS102-232-01', 9.5, 8.0, 8.1, 8.2, 'B+');
SELECT seed_student_course_grade('SV2024002', 'MATH201-232-01', 9.5, 8.0, 7.7, 8.0, 'B+');
SELECT seed_student_course_grade('SV2024002', 'CS202-232-01', 9.5, 8.0, 8.3, 8.3, 'B+');
SELECT seed_student_course_grade('SV2024002', 'ENG102-232-01', 9.5, 8.0, 7.9, 8.1, 'B+');
SELECT seed_student_course_grade('SV2024002', 'JAP102-232-01', 9.5, 8.0, 8.1, 8.2, 'B+');
SELECT seed_student_course_grade('SV2024002', 'CS303-232-01', 9.5, 8.0, 7.7, 8.0, 'B+');
SELECT seed_student_course_grade('SV2024002', 'CS201-241-01', 9.5, 8.0, 8.3, 8.3, 'B+');
SELECT seed_student_course_grade('SV2024002', 'CS301-241-01', 9.5, 8.0, 7.9, 8.1, 'B+');
SELECT seed_student_course_grade('SV2024002', 'CS302-241-01', 9.5, 8.0, 8.1, 8.2, 'B+');
SELECT seed_student_course_grade('SV2024002', 'CS402-241-01', 9.5, 8.0, 7.9, 8.1, 'B+');
SELECT seed_student_course_grade('SV2024002', 'CS405-241-01', 9.5, 8.0, 8.0, 8.15, 'B+');

-- 6. Complete Transcript for Student 3 (SV2024003) - 48 credits (GPA: 8.40)
SELECT seed_student_course_grade('SV2024003', 'CS101-231-01', 10.0, 8.2, 8.24, 8.4, 'B+');
SELECT seed_student_course_grade('SV2024003', 'MATH101-231-01', 10.0, 8.2, 8.44, 8.5, 'A');
SELECT seed_student_course_grade('SV2024003', 'MATH102-231-01', 10.0, 8.2, 8.04, 8.3, 'B+');
SELECT seed_student_course_grade('SV2024003', 'ENG101-231-01', 10.0, 8.2, 8.64, 8.6, 'A');
SELECT seed_student_course_grade('SV2024003', 'DS201-231-01', 10.0, 8.2, 7.84, 8.2, 'B+');
SELECT seed_student_course_grade('SV2024003', 'CS102-232-01', 10.0, 8.2, 8.44, 8.5, 'A');
SELECT seed_student_course_grade('SV2024003', 'MATH201-232-01', 10.0, 8.2, 8.24, 8.4, 'B+');
SELECT seed_student_course_grade('SV2024003', 'CS202-232-01', 10.0, 8.2, 8.04, 8.3, 'B+');
SELECT seed_student_course_grade('SV2024003', 'ENG102-232-01', 10.0, 8.2, 8.44, 8.5, 'A');
SELECT seed_student_course_grade('SV2024003', 'AI101-232-01', 10.0, 8.2, 8.24, 8.4, 'B+');
SELECT seed_student_course_grade('SV2024003', 'CS201-241-01', 10.0, 8.2, 8.44, 8.5, 'A');
SELECT seed_student_course_grade('SV2024003', 'CS301-241-01', 10.0, 8.2, 8.04, 8.3, 'B+');
SELECT seed_student_course_grade('SV2024003', 'CS302-241-01', 10.0, 8.2, 8.24, 8.4, 'B+');
SELECT seed_student_course_grade('SV2024003', 'CS305-241-01', 10.0, 8.2, 8.44, 8.5, 'A');
SELECT seed_student_course_grade('SV2024003', 'SEC201-241-01', 10.0, 8.2, 8.04, 8.3, 'B+');
SELECT seed_student_course_grade('SV2024003', 'BA201-241-01', 10.0, 8.2, 8.04, 8.3, 'B+');

-- 7. Complete Transcript for Student 4 (SV2024004) - 78 credits (GPA: 8.55)
SELECT seed_student_course_grade('SV2024004', 'CS101-221-01', 9.5, 8.4, 8.58, 8.6, 'A');
SELECT seed_student_course_grade('SV2024004', 'MATH101-221-01', 9.5, 8.4, 8.38, 8.5, 'A');
SELECT seed_student_course_grade('SV2024004', 'MATH102-221-01', 9.5, 8.4, 8.78, 8.7, 'A');
SELECT seed_student_course_grade('SV2024004', 'ENG101-221-01', 9.5, 8.4, 8.18, 8.4, 'B+');
SELECT seed_student_course_grade('SV2024004', 'JAP101-221-01', 9.5, 8.4, 8.58, 8.6, 'A');
SELECT seed_student_course_grade('SV2024004', 'CS102-222-01', 9.5, 8.4, 8.38, 8.5, 'A');
SELECT seed_student_course_grade('SV2024004', 'MATH201-222-01', 9.5, 8.4, 8.98, 8.8, 'A');
SELECT seed_student_course_grade('SV2024004', 'CS202-222-01', 9.5, 8.4, 8.18, 8.4, 'B+');
SELECT seed_student_course_grade('SV2024004', 'ENG102-222-01', 9.5, 8.4, 8.38, 8.5, 'A');
SELECT seed_student_course_grade('SV2024004', 'JAP102-222-01', 9.5, 8.4, 8.58, 8.6, 'A');
SELECT seed_student_course_grade('SV2024004', 'CS201-231-01', 9.5, 8.4, 8.38, 8.5, 'A');
SELECT seed_student_course_grade('SV2024004', 'CS301-231-01', 9.5, 8.4, 8.78, 8.7, 'A');
SELECT seed_student_course_grade('SV2024004', 'CS302-231-01', 9.5, 8.4, 8.18, 8.4, 'B+');
SELECT seed_student_course_grade('SV2024004', 'SEC201-222-01', 9.5, 8.4, 8.58, 8.6, 'A');
SELECT seed_student_course_grade('SV2024004', 'DS201-221-01', 9.5, 8.4, 8.38, 8.5, 'A');
SELECT seed_student_course_grade('SV2024004', 'CS303-232-01', 9.5, 8.4, 8.58, 8.6, 'A');
SELECT seed_student_course_grade('SV2024004', 'CS305-232-01', 9.5, 8.4, 8.18, 8.4, 'B+');
SELECT seed_student_course_grade('SV2024004', 'CS402-232-01', 9.5, 8.4, 8.78, 8.7, 'A');
SELECT seed_student_course_grade('SV2024004', 'AI101-232-01', 9.5, 8.4, 8.38, 8.5, 'A');
SELECT seed_student_course_grade('SV2024004', 'SEC301-232-01', 9.5, 8.4, 8.58, 8.6, 'A');
SELECT seed_student_course_grade('SV2024004', 'CS401-241-01', 9.5, 8.4, 8.38, 8.5, 'A');
SELECT seed_student_course_grade('SV2024004', 'CS403-241-01', 9.5, 8.4, 8.58, 8.6, 'A');
SELECT seed_student_course_grade('SV2024004', 'SEC401-241-01', 9.5, 8.4, 8.38, 8.5, 'A');
SELECT seed_student_course_grade('SV2024004', 'SEC402-241-01', 9.5, 8.4, 8.58, 8.6, 'A');
SELECT seed_student_course_grade('SV2024004', 'IS201-231-01', 9.5, 8.4, 8.38, 8.5, 'A');
SELECT seed_student_course_grade('SV2024004', 'IS401-241-01', 9.5, 8.4, 8.38, 8.5, 'A');

-- 8. Complete Transcript for Student 5 (SV2024005) - 88 credits (GPA: 8.92)
SELECT seed_student_course_grade('SV2024005', 'CS101-221-01', 10.0, 8.8, 8.96, 9.0, 'A+');
SELECT seed_student_course_grade('SV2024005', 'MATH101-221-01', 10.0, 8.8, 8.96, 9.0, 'A+');
SELECT seed_student_course_grade('SV2024005', 'MATH102-221-01', 10.0, 8.8, 8.96, 9.0, 'A+');
SELECT seed_student_course_grade('SV2024005', 'ENG101-221-01', 10.0, 8.8, 8.96, 9.0, 'A+');
SELECT seed_student_course_grade('SV2024005', 'JAP101-221-01', 10.0, 8.8, 8.96, 9.0, 'A+');
SELECT seed_student_course_grade('SV2024005', 'DS201-221-01', 10.0, 8.8, 8.88, 8.96, 'A');
SELECT seed_student_course_grade('SV2024005', 'CS102-222-01', 10.0, 8.8, 8.76, 8.9, 'A');
SELECT seed_student_course_grade('SV2024005', 'MATH201-222-01', 10.0, 8.8, 8.76, 8.9, 'A');
SELECT seed_student_course_grade('SV2024005', 'CS202-222-01', 10.0, 8.8, 8.76, 8.9, 'A');
SELECT seed_student_course_grade('SV2024005', 'ENG102-222-01', 10.0, 8.8, 8.76, 8.9, 'A');
SELECT seed_student_course_grade('SV2024005', 'JAP102-222-01', 10.0, 8.8, 8.76, 8.9, 'A');
SELECT seed_student_course_grade('SV2024005', 'SEC201-222-01', 10.0, 8.8, 8.76, 8.9, 'A');
SELECT seed_student_course_grade('SV2024005', 'CS201-231-01', 10.0, 8.8, 8.76, 8.9, 'A');
SELECT seed_student_course_grade('SV2024005', 'CS301-231-01', 10.0, 8.8, 8.76, 8.9, 'A');
SELECT seed_student_course_grade('SV2024005', 'CS302-231-01', 10.0, 8.8, 8.76, 8.9, 'A');
SELECT seed_student_course_grade('SV2024005', 'CS303-232-01', 10.0, 8.8, 8.76, 8.9, 'A');
SELECT seed_student_course_grade('SV2024005', 'IS201-231-01', 10.0, 8.8, 8.76, 8.9, 'A');
SELECT seed_student_course_grade('SV2024005', 'BA201-232-01', 10.0, 8.8, 8.76, 8.9, 'A');
SELECT seed_student_course_grade('SV2024005', 'CS305-232-01', 10.0, 8.8, 8.76, 8.9, 'A');
SELECT seed_student_course_grade('SV2024005', 'CS402-232-01', 10.0, 8.8, 8.76, 8.9, 'A');
SELECT seed_student_course_grade('SV2024005', 'AI101-232-01', 10.0, 8.8, 8.76, 8.9, 'A');
SELECT seed_student_course_grade('SV2024005', 'SEC301-232-01', 10.0, 8.8, 8.76, 8.9, 'A');
SELECT seed_student_course_grade('SV2024005', 'IS301-241-01', 10.0, 8.8, 8.76, 8.9, 'A');
SELECT seed_student_course_grade('SV2024005', 'CS401-241-01', 10.0, 8.8, 8.76, 8.9, 'A');
SELECT seed_student_course_grade('SV2024005', 'CS403-241-01', 10.0, 8.8, 8.76, 8.9, 'A');
SELECT seed_student_course_grade('SV2024005', 'IS401-241-01', 10.0, 8.8, 8.76, 8.9, 'A');
SELECT seed_student_course_grade('SV2024005', 'SEC401-241-01', 10.0, 8.8, 8.76, 8.9, 'A');
SELECT seed_student_course_grade('SV2024005', 'SEC402-241-01', 10.0, 8.8, 8.76, 8.9, 'A');
SELECT seed_student_course_grade('SV2024005', 'CS405-241-01', 10.0, 8.8, 8.8, 8.92, 'A');

-- 9. Cleanup helper function
DROP FUNCTION seed_student_course_grade;

-- 10. Update class_sections current_enrolled count
UPDATE class_sections cs
SET current_enrolled = (
    SELECT COUNT(*) FROM enrollments e 
    WHERE e.class_section_id = cs.id AND e.status IN ('REGISTERED', 'COMPLETED')
);

-- 11. Ensure ID Sequences are updated
SELECT setval('semesters_id_seq', (SELECT MAX(id) FROM semesters));
SELECT setval('class_sections_id_seq', (SELECT MAX(id) FROM class_sections));
SELECT setval('enrollments_id_seq', (SELECT MAX(id) FROM enrollments));
SELECT setval('grades_id_seq', (SELECT MAX(id) FROM grades));

COMMIT;
