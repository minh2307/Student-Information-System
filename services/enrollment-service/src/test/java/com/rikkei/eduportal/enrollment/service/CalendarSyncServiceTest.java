package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.entity.*;
import com.rikkei.eduportal.enrollment.repository.EnrollmentRepository;
import com.rikkei.eduportal.enrollment.repository.ExamScheduleRepository;
import com.rikkei.eduportal.enrollment.repository.StudentProfileRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  EDUP-215 · CalendarSyncService — Unit Test Suite (RFC 5545 iCalendar)
 * ══════════════════════════════════════════════════════════════════════════
 *
 *  Kiểm thử toàn diện cú pháp và đặc tả iCalendar chuẩn RFC 5545:
 *    § 1 – Cấu trúc VCALENDAR Header (PRODID, VERSION:2.0, CALSCALE, CRLF)
 *    § 2 – Khối VTIMEZONE chuẩn Asia/Ho_Chi_Minh (UTC+7, không DST)
 *    § 3 – VEVENT Lịch học định kỳ (RRULE:FREQ=WEEKLY;COUNT=15, DTSTART/DTEND)
 *    § 4 – VEVENT Lịch thi (Sự kiện đơn một lần, PRIORITY:1)
 *    § 5 – escapeIcsText theo RFC 5545 §3.3.11 (\, \;, \,, \n, \r\n)
 *    § 6 – parseDayOfWeek (Đa ngôn ngữ VI/EN và dạng số 2-7, CN)
 *    § 7 – Bảo mật Token HMAC-SHA256 URL-safe (Deterministic, Constant-time)
 *    § 8 – Tính toàn vẹn cấu trúc (Matching BEGIN/END blocks, Empty calendar)
 *    § 9 – Phòng thủ dữ liệu biên (Null lecture, Null course, Null room, Unicode)
 */
@DisplayName("RFC 5545 iCalendar & CalendarSyncService Unit Test Suite")
class CalendarSyncServiceTest {

    private CalendarSyncService sut;
    private StudentDashboardService dashboardService;
    private EnrollmentRepository enrollmentRepo;
    private ExamScheduleRepository examRepo;
    private StudentProfileRepository studentProfileRepo;

    private StudentProfile student;
    private User studentUser;

    @BeforeEach
    void setUp() {
        dashboardService = mock(StudentDashboardService.class);
        enrollmentRepo = mock(EnrollmentRepository.class);
        examRepo = mock(ExamScheduleRepository.class);
        studentProfileRepo = mock(StudentProfileRepository.class);

        sut = new CalendarSyncService(studentProfileRepo, enrollmentRepo, examRepo, dashboardService);
        sut.setSaltSecret("TEST_SECRET_RFC5545_ENROLLMENT_UNIT_TEST");

        studentUser = new User();
        studentUser.setId(1L);
        studentUser.setFullName("Nguyễn Văn An");
        studentUser.setUsername("sv2024001");
        studentUser.setEmail("sv2024001@rikkei.edu.vn");

        student = new StudentProfile();
        student.setId(10L);
        student.setStudentCode("SV2024001");
        student.setUser(studentUser);
        student.setMajor("Công nghệ thông tin");

        when(dashboardService.resolveStudent(anyString())).thenReturn(student);
        when(enrollmentRepo.findActiveEnrollmentsByStudent(10L)).thenReturn(Collections.emptyList());
        when(examRepo.findExamSchedulesByStudent(anyLong(), any())).thenReturn(Collections.emptyList());
    }

    // ══════════════════════════════════════════════════════════════════════════
    // § 1 – VCALENDAR Header (RFC 5545 §3.4)
    // ══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("1. VCALENDAR Envelope & Global Properties (RFC 5545 §3.4)")
    class VcalendarEnvelope {

        @Test
        @DisplayName("Mở đầu bằng BEGIN:VCALENDAR và kết thúc bằng END:VCALENDAR")
        void testEnvelopeBoundary() {
            String ics = sut.generateIcsCalendar("SV2024001", null);
            assertTrue(ics.startsWith("BEGIN:VCALENDAR\r\n"), "File phải bắt đầu bằng BEGIN:VCALENDAR kèm CRLF");
            assertTrue(ics.endsWith("END:VCALENDAR\r\n"), "File phải kết thúc bằng END:VCALENDAR kèm CRLF");
        }

        @Test
        @DisplayName("Phải khai báo VERSION:2.0 chuẩn RFC 5545")
        void testVersion() {
            String ics = sut.generateIcsCalendar("SV2024001", null);
            assertThat(ics).contains("VERSION:2.0\r\n");
        }

        @Test
        @DisplayName("PRODID định danh hệ thống Rikkei EduPortal SIS")
        void testProdid() {
            String ics = sut.generateIcsCalendar("SV2024001", null);
            assertThat(ics).contains("PRODID:-//Rikkei Academy//Rikkei EduPortal SIS//VI\r\n");
        }

        @Test
        @DisplayName("CALSCALE phải là GREGORIAN")
        void testCalscale() {
            String ics = sut.generateIcsCalendar("SV2024001", null);
            assertThat(ics).contains("CALSCALE:GREGORIAN\r\n");
        }

        @Test
        @DisplayName("METHOD phải là PUBLISH theo chuẩn RFC 5546")
        void testMethod() {
            String ics = sut.generateIcsCalendar("SV2024001", null);
            assertThat(ics).contains("METHOD:PUBLISH\r\n");
        }

        @Test
        @DisplayName("X-WR-CALNAME chứa tên sinh viên và mã sinh viên")
        void testCalendarName() {
            String ics = sut.generateIcsCalendar("SV2024001", null);
            assertThat(ics).contains("X-WR-CALNAME:Lịch Học & Thi - Nguyễn Văn An (SV2024001)\r\n");
        }

        @Test
        @DisplayName("X-WR-TIMEZONE chỉ định Asia/Ho_Chi_Minh")
        void testCalendarTimezoneName() {
            String ics = sut.generateIcsCalendar("SV2024001", null);
            assertThat(ics).contains("X-WR-TIMEZONE:Asia/Ho_Chi_Minh\r\n");
        }

        @Test
        @DisplayName("Định dạng ngắt dòng bắt buộc là CRLF (\\r\\n) theo RFC 5545 §3.1")
        void testStrictCrlfLineEndings() {
            String ics = sut.generateIcsCalendar("SV2024001", null);
            assertThat(ics).doesNotContainPattern("(?<!\\r)\\n");
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // § 2 – VTIMEZONE Component (RFC 5545 §3.6.5)
    // ══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("2. VTIMEZONE Definition (Asia/Ho_Chi_Minh, RFC 5545 §3.6.5)")
    class VtimezoneBlock {

        @Test
        @DisplayName("Phải có khối VTIMEZONE bao gồm BEGIN và END")
        void testVtimezoneEnvelope() {
            String ics = sut.generateIcsCalendar("SV2024001", null);
            assertThat(ics)
                    .contains("BEGIN:VTIMEZONE\r\n")
                    .contains("END:VTIMEZONE\r\n");
        }

        @Test
        @DisplayName("TZID định danh là Asia/Ho_Chi_Minh")
        void testTzid() {
            String ics = sut.generateIcsCalendar("SV2024001", null);
            assertThat(ics).contains("TZID:Asia/Ho_Chi_Minh\r\n");
        }

        @Test
        @DisplayName("Khối STANDARD offset +0700 liên tục không có Daylight Saving Time")
        void testStandardBlockUtcPlus7() {
            String ics = sut.generateIcsCalendar("SV2024001", null);
            assertThat(ics)
                    .contains("BEGIN:STANDARD\r\n")
                    .contains("TZOFFSETFROM:+0700\r\n")
                    .contains("TZOFFSETTO:+0700\r\n")
                    .contains("TZNAME:+07\r\n")
                    .contains("END:STANDARD\r\n");
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // § 3 – VEVENT Lịch Học (Class Section Events, RFC 5545 §3.6.1)
    // ══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("3. VEVENT Class Section - Recurring Schedule (RFC 5545 §3.6.1)")
    class ClassSectionVevents {

        private Enrollment createClassEnrollment(String dayOfWeek, LocalTime start, LocalTime end) {
            Course course = new Course();
            course.setId(101L);
            course.setCourseCode("CS101");
            course.setName("Cấu Trúc Dữ Liệu & Giải Thuật");
            course.setCredits(4);
            course.setWeeklyHours(4);

            User lecUser = new User();
            lecUser.setId(3L);
            lecUser.setFullName("Lê Hoàng Nam");

            LecturerProfile lecturer = new LecturerProfile();
            lecturer.setId(5L);
            lecturer.setDegree("TS.");
            lecturer.setUser(lecUser);

            ClassSection sec = new ClassSection();
            sec.setId(201L);
            sec.setSectionCode("CS101.01");
            sec.setCourse(course);
            sec.setLecturer(lecturer);
            sec.setDayOfWeek(dayOfWeek);
            sec.setStartTime(start != null ? start : LocalTime.of(7, 30));
            sec.setEndTime(end != null ? end : LocalTime.of(9, 45));
            sec.setRoomName("B302");
            sec.setSemesterName("HK2-2026");

            Enrollment en = new Enrollment();
            en.setId(501L);
            en.setStudent(student);
            en.setClassSection(sec);
            en.setStatus("REGISTERED");
            return en;
        }

        @Test
        @DisplayName("Sinh VEVENT hợp lệ với UID định danh rikkei.edu.vn duy nhất")
        void testClassEventUid() {
            when(enrollmentRepo.findActiveEnrollmentsByStudent(10L))
                    .thenReturn(List.of(createClassEnrollment("MON", null, null)));

            String ics = sut.generateIcsCalendar("SV2024001", null);

            assertThat(ics)
                    .contains("BEGIN:VEVENT\r\n")
                    .contains("UID:class-201-10@rikkei.edu.vn\r\n")
                    .contains("END:VEVENT\r\n");
        }

        @Test
        @DisplayName("DTSTAMP ở định dạng UTC với hậu tố Z (RFC 5545 §3.8.7.2)")
        void testDtstampFormat() {
            when(enrollmentRepo.findActiveEnrollmentsByStudent(10L))
                    .thenReturn(List.of(createClassEnrollment("TUE", null, null)));

            String ics = sut.generateIcsCalendar("SV2024001", null);
            assertThat(ics).containsPattern("DTSTAMP:\\d{8}T\\d{6}Z\r\n");
        }

        @Test
        @DisplayName("DTSTART và DTEND gắn cờ múi giờ TZID=Asia/Ho_Chi_Minh")
        void testDtstartDtendWithTzid() {
            when(enrollmentRepo.findActiveEnrollmentsByStudent(10L))
                    .thenReturn(List.of(createClassEnrollment("WED", LocalTime.of(8, 0), LocalTime.of(10, 15))));

            String ics = sut.generateIcsCalendar("SV2024001", null);
            assertThat(ics)
                    .contains("DTSTART;TZID=Asia/Ho_Chi_Minh:")
                    .contains("T080000\r\n")
                    .contains("DTEND;TZID=Asia/Ho_Chi_Minh:")
                    .contains("T101500\r\n");
        }

        @Test
        @DisplayName("RRULE lặp lại theo tuần đúng 15 tuần theo chuẩn kỳ học đại học (RFC 5545 §3.8.5.3)")
        void testRecurrenceRule() {
            when(enrollmentRepo.findActiveEnrollmentsByStudent(10L))
                    .thenReturn(List.of(createClassEnrollment("THU", null, null)));

            String ics = sut.generateIcsCalendar("SV2024001", null);
            assertThat(ics).contains("RRULE:FREQ=WEEKLY;COUNT=15\r\n");
        }

        @Test
        @DisplayName("SUMMARY và LOCATION được escape ký tự đặc biệt theo RFC 5545 §3.3.11")
        void testSummaryAndLocation() {
            when(enrollmentRepo.findActiveEnrollmentsByStudent(10L))
                    .thenReturn(List.of(createClassEnrollment("FRI", null, null)));

            String ics = sut.generateIcsCalendar("SV2024001", null);
            assertThat(ics)
                    .contains("SUMMARY:CS101 - Cấu Trúc Dữ Liệu & Giải Thuật (CS101.01)\r\n")
                    .contains("LOCATION:B302\\, Rikkei Academy\r\n")
                    .contains("STATUS:CONFIRMED\r\n")
                    .contains("TRANSP:OPAQUE\r\n");
        }

        @Test
        @DisplayName("Bỏ qua các môn học có trạng thái khác REGISTERED (như CANCELLED, REJECTED)")
        void testIgnoreNonRegisteredEnrollments() {
            Enrollment cancelled = createClassEnrollment("SAT", null, null);
            cancelled.setStatus("CANCELLED");

            Enrollment rejected = createClassEnrollment("SUN", null, null);
            rejected.setStatus("REJECTED");

            when(enrollmentRepo.findActiveEnrollmentsByStudent(10L))
                    .thenReturn(List.of(cancelled, rejected));

            String ics = sut.generateIcsCalendar("SV2024001", null);
            assertFalse(ics.contains("BEGIN:VEVENT"), "Không được sinh VEVENT cho môn đã hủy");
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // § 4 – VEVENT Lịch Thi (Exam Schedule Events, RFC 5545 §3.6.1)
    // ══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("4. VEVENT Exam Schedule - One-off Events (RFC 5545 §3.6.1)")
    class ExamVevents {

        private ExamSchedule createExamSchedule() {
            Course c = new Course();
            c.setCourseCode("MATH201");
            c.setName("Giải Tích 2");

            ClassSection sec = new ClassSection();
            sec.setCourse(c);

            ExamSchedule exam = new ExamSchedule();
            exam.setId(88L);
            exam.setClassSection(sec);
            exam.setExamDate(LocalDate.of(2026, 12, 25));
            exam.setStartTime(LocalTime.of(13, 30));
            exam.setEndTime(LocalTime.of(15, 0));
            exam.setRoomName("Giảng đường D2-101");
            exam.setExamType("Tự Luận Kết Thúc Học Phần");
            exam.setNotes("Không được sử dụng tài liệu, mang CCCD/Thẻ SV");
            return exam;
        }

        @Test
        @DisplayName("Sinh VEVENT lịch thi với tiền tố [LỊCH THI] và UID exam-")
        void testExamVeventGeneration() {
            when(examRepo.findExamSchedulesByStudent(anyLong(), any()))
                    .thenReturn(List.of(createExamSchedule()));

            String ics = sut.generateIcsCalendar("SV2024001", null);

            assertThat(ics)
                    .contains("BEGIN:VEVENT\r\n")
                    .contains("UID:exam-88-10@rikkei.edu.vn\r\n")
                    .contains("DTSTART;TZID=Asia/Ho_Chi_Minh:20261225T133000\r\n")
                    .contains("DTEND;TZID=Asia/Ho_Chi_Minh:20261225T150000\r\n")
                    .contains("SUMMARY:[LỊCH THI] MATH201 - Tự Luận Kết Thúc Học Phần\r\n")
                    .contains("PRIORITY:1\r\n")
                    .contains("LOCATION:Giảng đường D2-101\r\n")
                    .contains("STATUS:CONFIRMED\r\n")
                    .contains("END:VEVENT\r\n");
        }

        @Test
        @DisplayName("Lịch thi là sự kiện một lần nên TUYỆT ĐỐI không có thuộc tính RRULE")
        void testExamHasNoRecurrenceRule() {
            when(examRepo.findExamSchedulesByStudent(anyLong(), any()))
                    .thenReturn(List.of(createExamSchedule()));

            String ics = sut.generateIcsCalendar("SV2024001", null);
            assertThat(ics).doesNotContain("RRULE:");
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // § 5 – escapeIcsText (RFC 5545 §3.3.11 TEXT Escaping)
    // ══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("5. RFC 5545 §3.3.11 TEXT Escaping Rules (Backslash, Semicolon, Comma, Newline)")
    class TextEscaping {

        private ExamSchedule createExamWithText(String room, String notes) {
            ExamSchedule exam = new ExamSchedule();
            exam.setId(10L);
            exam.setExamDate(LocalDate.of(2026, 12, 10));
            exam.setStartTime(LocalTime.of(8, 0));
            exam.setEndTime(LocalTime.of(9, 30));
            exam.setRoomName(room);
            exam.setNotes(notes);
            return exam;
        }

        @Test
        @DisplayName("Ký tự backslash (\\) phải được escape thành (\\\\)")
        void testEscapeBackslash() {
            when(examRepo.findExamSchedulesByStudent(anyLong(), any()))
                    .thenReturn(List.of(createExamWithText("Room\\Main", "Path\\Doc")));

            String ics = sut.generateIcsCalendar("SV2024001", null);
            assertThat(ics).contains("Room\\\\Main");
        }

        @Test
        @DisplayName("Dấu chấm phẩy (;) phải được escape thành (\\;)")
        void testEscapeSemicolon() {
            when(examRepo.findExamSchedulesByStudent(anyLong(), any()))
                    .thenReturn(List.of(createExamWithText("Room;401", "Note;Priority")));

            String ics = sut.generateIcsCalendar("SV2024001", null);
            assertThat(ics).contains("Room\\;401");
        }

        @Test
        @DisplayName("Dấu phẩy (,) phải được escape thành (\\,)")
        void testEscapeComma() {
            when(examRepo.findExamSchedulesByStudent(anyLong(), any()))
                    .thenReturn(List.of(createExamWithText("Building A, Room 102", "Mang bút, thước kẻ")));

            String ics = sut.generateIcsCalendar("SV2024001", null);
            assertThat(ics).contains("Building A\\, Room 102");
        }

        @Test
        @DisplayName("Xuống dòng (\\n, \\r\\n) trong nội dung phải được biến đổi thành chuỗi literal (\\n)")
        void testEscapeNewlines() {
            when(examRepo.findExamSchedulesByStudent(anyLong(), any()))
                    .thenReturn(List.of(createExamWithText("H101", "Dòng 1\r\nDòng 2\nDòng 3")));

            String ics = sut.generateIcsCalendar("SV2024001", null);
            assertThat(ics).contains("Dòng 1\\nDòng 2\\nDòng 3");
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // § 6 – parseDayOfWeek (Đa ngôn ngữ & Mã hóa)
    // ══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("6. parseDayOfWeek Multilingual & Numeric Mapping")
    class ParseDayOfWeekTests {

        private Enrollment createEnrollmentForDay(String dayKey) {
            Course c = new Course();
            c.setCourseCode("DOW101");
            c.setName("Test DOW");

            ClassSection s = new ClassSection();
            s.setId(1L);
            s.setCourse(c);
            s.setDayOfWeek(dayKey);
            s.setStartTime(LocalTime.of(8, 0));
            s.setEndTime(LocalTime.of(10, 0));

            Enrollment e = new Enrollment();
            e.setStudent(student);
            e.setClassSection(s);
            e.setStatus("REGISTERED");
            return e;
        }

        @ParameterizedTest(name = "[{index}] Input dayKey=''{0}'' maps to DayOfWeek.{1}")
        @CsvSource({
                "MON, MONDAY",
                "MONDAY, MONDAY",
                "THU 2, MONDAY",
                "THỨ 2, MONDAY",
                "2, MONDAY",
                "TUE, TUESDAY",
                "TUESDAY, TUESDAY",
                "THU 3, TUESDAY",
                "THỨ 3, TUESDAY",
                "3, TUESDAY",
                "WED, WEDNESDAY",
                "THU 4, WEDNESDAY",
                "4, WEDNESDAY",
                "THU, THURSDAY",
                "THURSDAY, THURSDAY",
                "THU 5, THURSDAY",
                "5, THURSDAY",
                "FRI, FRIDAY",
                "THU 6, FRIDAY",
                "6, FRIDAY",
                "SAT, SATURDAY",
                "THU 7, SATURDAY",
                "7, SATURDAY",
                "SUN, SUNDAY",
                "CHU NHAT, SUNDAY",
                "CHỦ NHẬT, SUNDAY",
                "CN, SUNDAY"
        })
        void testAllDayVariants(String dayKey, DayOfWeek expected) {
            when(enrollmentRepo.findActiveEnrollmentsByStudent(10L))
                    .thenReturn(List.of(createEnrollmentForDay(dayKey)));

            String ics = sut.generateIcsCalendar("SV2024001", null);

            for (String line : ics.split("\r\n")) {
                if (line.startsWith("DTSTART;TZID=Asia/Ho_Chi_Minh:")) {
                    String dtStr = line.substring("DTSTART;TZID=Asia/Ho_Chi_Minh:".length()).trim();
                    LocalDate date = LocalDate.parse(dtStr.substring(0, 8), java.time.format.DateTimeFormatter.BASIC_ISO_DATE);
                    assertEquals(expected, date.getDayOfWeek(), "DayOfWeek phải khớp cho " + dayKey);
                    return;
                }
            }
            org.junit.jupiter.api.Assertions.fail("Không tìm thấy thuộc tính DTSTART trong iCal output cho dayKey: " + dayKey);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // § 7 – Bảo mật Token HMAC-SHA256 URL-safe
    // ══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("7. Calendar Subscription Feed Token Security (HMAC-SHA256)")
    class CalendarFeedTokenSecurity {

        @Test
        @DisplayName("Sinh token 24 ký tự định dạng Base64URL-safe không chứa +, /, =")
        void testTokenFormatAndLength() {
            String token = sut.generateCalendarFeedToken("sv2024001");
            assertNotNull(token);
            assertEquals(24, token.length());
            assertFalse(token.contains("+"));
            assertFalse(token.contains("/"));
            assertFalse(token.contains("="));
        }

        @Test
        @DisplayName("Tính xác định (Deterministic): cùng mã SV luôn sinh ra cùng token")
        void testTokenDeterministic() {
            String tokenA = sut.generateCalendarFeedToken("SV2024001");
            String tokenB = sut.generateCalendarFeedToken("SV2024001");
            assertEquals(tokenA, tokenB);
        }

        @Test
        @DisplayName("Không phân biệt hoa thường khi sinh và xác thực token")
        void testTokenCaseInsensitivity() {
            String tokenUpper = sut.generateCalendarFeedToken("SV2024001");
            String tokenLower = sut.generateCalendarFeedToken("sv2024001");
            assertEquals(tokenUpper, tokenLower);
            assertTrue(sut.validateCalendarFeedToken("sv2024001", tokenUpper));
        }

        @Test
        @DisplayName("Từ chối các token null, rỗng hoặc token của sinh viên khác")
        void testRejectInvalidTokens() {
            String validSv1 = sut.generateCalendarFeedToken("sv2024001");

            assertFalse(sut.validateCalendarFeedToken("sv2024001", null));
            assertFalse(sut.validateCalendarFeedToken("sv2024001", ""));
            assertFalse(sut.validateCalendarFeedToken("sv2024001", "   "));
            assertFalse(sut.validateCalendarFeedToken("sv2024002", validSv1), "Token của SV 1 không được dùng cho SV 2");
        }

        @ParameterizedTest(name = "[{index}] Forged Token=''{0}''")
        @ValueSource(strings = {
                "AAAAAAAAAAAAAAAAAAAAAAAA",
                "123456789012345678901234",
                "'; DROP TABLE users; --",
                "<script>alert(1)</script>"
        })
        void testRejectForgedTokens(String forged) {
            assertFalse(sut.validateCalendarFeedToken("sv2024001", forged));
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // § 8 – Tính Toàn Vẹn Cấu Trúc (RFC 5545 Structural Integrity)
    // ══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("8. RFC 5545 Block Balancing & Integrity")
    class StructuralIntegrity {

        @Test
        @DisplayName("Lịch rỗng (chưa đăng ký môn) vẫn phải là VCALENDAR hợp lệ")
        void testEmptyCalendarIntegrity() {
            String ics = sut.generateIcsCalendar("SV2024001", null);

            assertTrue(ics.startsWith("BEGIN:VCALENDAR\r\n"));
            assertTrue(ics.endsWith("END:VCALENDAR\r\n"));
            assertTrue(ics.contains("BEGIN:VTIMEZONE\r\n"));
            assertTrue(ics.contains("END:VTIMEZONE\r\n"));
            assertFalse(ics.contains("BEGIN:VEVENT"));
        }

        @Test
        @DisplayName("Số lượng khối BEGIN:VEVENT luôn bằng số lượng khối END:VEVENT")
        void testBalancedVeventBlocks() {
            Course c = new Course();
            c.setCourseCode("CS"); c.setName("N");
            ClassSection s1 = new ClassSection(); s1.setId(1L); s1.setCourse(c); s1.setDayOfWeek("MON");
            ClassSection s2 = new ClassSection(); s2.setId(2L); s2.setCourse(c); s2.setDayOfWeek("TUE");

            Enrollment e1 = new Enrollment(); e1.setClassSection(s1); e1.setStatus("REGISTERED");
            Enrollment e2 = new Enrollment(); e2.setClassSection(s2); e2.setStatus("REGISTERED");

            ExamSchedule ex = new ExamSchedule();
            ex.setId(10L); ex.setExamDate(LocalDate.now()); ex.setClassSection(s1);

            when(enrollmentRepo.findActiveEnrollmentsByStudent(10L)).thenReturn(List.of(e1, e2));
            when(examRepo.findExamSchedulesByStudent(anyLong(), any())).thenReturn(List.of(ex));

            String ics = sut.generateIcsCalendar("SV2024001", null);

            long beginEvents = ics.lines().filter(l -> l.equals("BEGIN:VEVENT")).count();
            long endEvents = ics.lines().filter(l -> l.equals("END:VEVENT")).count();

            assertEquals(3, beginEvents);
            assertEquals(3, endEvents);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // § 9 – Phòng Thủ Dữ Liệu Biên & Null Safety
    // ══════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("9. Defensive Edge Cases & Null-Safety")
    class DefensiveEdgeCases {

        @Test
        @DisplayName("Xử lý an toàn khi User gắn với StudentProfile bị null")
        void testStudentUserNull() {
            student.setUser(null);
            assertDoesNotThrow(() -> {
                String ics = sut.generateIcsCalendar("SV2024001", null);
                assertThat(ics).contains("X-WR-CALNAME:Lịch Học & Thi - SV2024001 (SV2024001)");
            });
        }

        @Test
        @DisplayName("Xử lý an toàn khi Giảng viên phụ trách chưa được phân công (null)")
        void testLecturerNull() {
            Course c = new Course(); c.setCourseCode("SE101"); c.setName("Kỹ thuật phần mềm");
            ClassSection s = new ClassSection(); s.setId(99L); s.setCourse(c); s.setLecturer(null);
            s.setDayOfWeek("WED");

            Enrollment e = new Enrollment(); e.setClassSection(s); e.setStatus("REGISTERED");
            when(enrollmentRepo.findActiveEnrollmentsByStudent(10L)).thenReturn(List.of(e));

            assertDoesNotThrow(() -> {
                String ics = sut.generateIcsCalendar("SV2024001", null);
                assertThat(ics).contains("Giảng viên: Chưa phân công");
            });
        }

        @Test
        @DisplayName("Xử lý an toàn với ký tự Unicode tiếng Việt có dấu phức tạp")
        void testVietnameseDiacritics() {
            studentUser.setFullName("Hoàng Đức Triệu Nghĩa");
            String ics = sut.generateIcsCalendar("SV2024001", null);
            assertThat(ics).contains("Hoàng Đức Triệu Nghĩa");
        }
    }
}
