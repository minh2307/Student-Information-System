package com.rikkei.eduportal.ai.service;

import com.rikkei.eduportal.ai.dto.*;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class AdvisorFallbackService {

    private final AcademicKnowledgeBase knowledgeBase;

    public AdvisorFallbackService(AcademicKnowledgeBase knowledgeBase) {
        this.knowledgeBase = knowledgeBase;
    }

    public AcademicAdvisorResponse generateFallback(AcademicAdvisorRequest request, String reason) {
        return generateFallback(request, null, reason);
    }

    public AcademicAdvisorResponse generateFallback(AcademicAdvisorRequest request, StudentAcademicContextDto context, String reason) {
        String query = request.getMessage() != null ? request.getMessage().toLowerCase().trim() : "";
        String category = detectCategory(query);

        AcademicAdvisorResponse response = new AcademicAdvisorResponse();
        response.setCategory(category);
        response.setFallbackUsed(true);
        response.setProvider("Offline Academic Rule Engine");
        response.setModel("rule-based-advisor-v2");
        response.setTimestamp(LocalDateTime.now());

        if (context != null) {
            response.setMode("FALLBACK");
            response.setAcademicSummary(context.toSummary());
            List<CourseRecommendationDto> recommendations = buildRecommendations(context);
            response.setRecommendations(recommendations);
        } else {
            response.setMode("LIMITED");
            response.setLimitations(List.of("Dịch vụ học vụ (Enrollment Service) tạm thời không khả dụng. Không thể truy xuất dữ liệu học tập cá nhân."));
        }

        StringBuilder reply = new StringBuilder();

        // 1. Notice banner for fallback mode
        if (context != null) {
            reply.append("> ℹ️ **Chế độ Dự phòng Thông minh (Offline Advisor)**: Trợ lý AI đang xử lý ngoại tuyến dựa trên dữ liệu học vụ thực tế được trích xuất từ hệ thống đăng ký học phần.\n\n");
        } else {
            reply.append("> ⚠️ **Thông báo Hạn chế Hệ thống**: Không thể kết nối đến máy chủ Quản lý Đào tạo (Enrollment Service). Dưới đây là thông tin tư vấn dựa trên quy chế chung (không có dữ liệu cá nhân).\n\n");
        }

        // 2. Body based on category
        switch (category) {
            case "COURSE_RECOMMENDATION", "ROADMAP" -> {
                reply.append("### 🗺️ Gợi ý Lộ trình Học tập & Môn học Đăng ký Ngành CNTT\n\n");
                if (context != null) {
                    reply.append("**Hồ sơ học tập thực tế của bạn:**\n");
                    reply.append("- **Mã sinh viên**: `").append(context.getStudentCode()).append("`");
                    if (context.getFullName() != null) reply.append(" (").append(context.getFullName()).append(")");
                    reply.append("\n- **Chuyên ngành**: ").append(context.getMajor());
                    reply.append(" | **Học kỳ hiện tại**: Kỳ ").append(context.getCurrentSemester() != null ? context.getCurrentSemester() : 1).append("\n");
                    reply.append("- **Tiến độ tích lũy**: **").append(context.getCompletedCredits()).append(" / ").append(context.getTotalRequiredCredits()).append(" tín chỉ** (Còn thiếu ").append(Math.max(0, context.getTotalRequiredCredits() - context.getCompletedCredits())).append(" TC để tốt nghiệp)\n");
                    reply.append("- **Điểm C-GPA**: **").append(context.getCurrentCgpa()).append(" / 10.0** (Xếp loại: **").append(context.getAcademicStanding()).append("**)\n\n");

                    // Check failed courses
                    if (context.getFailedCourses() != null && !context.getFailedCourses().isEmpty()) {
                        reply.append("⚠️ **CẢNH BÁO MÔN HỌC BỊ NỢ / TRƯỢT**:\n");
                        for (FailedCourseDto f : context.getFailedCourses()) {
                            reply.append("- **").append(f.getCourseCode()).append(" - ").append(f.getCourseName()).append("** (Điểm F). Bạn cần ưu tiên đăng ký học lại môn này để không bị nghẽn môn tiên quyết của các kỳ sau!\n");
                        }
                        reply.append("\n");
                    }

                    // Check timetable conflicts
                    if (context.getScheduleConflictCount() > 0) {
                        reply.append("⚠️ **CẢNH BÁO TRÙNG THỜI KHÓA BIỂU**: Hệ thống ghi nhận bạn có **")
                                .append(context.getScheduleConflictCount()).append(" lớp** bị trùng lịch (")
                                .append(String.join(", ", context.getConflictingSections())).append("). Vui lòng đổi sang Section khác trước khi đăng ký thêm môn mới.\n\n");
                    }

                    // Recommendations
                    List<CourseRecommendationDto> recs = response.getRecommendations();
                    if (!recs.isEmpty()) {
                        reply.append("📚 **Các môn học khuyến nghị đăng ký cho học kỳ tiếp theo:**\n\n");
                        for (CourseRecommendationDto r : recs) {
                            String badge = "HIGH".equals(r.getRecommendedPriority()) ? "⭐ [Ưu tiên cao]" : "🔹 [Khuyến nghị]";
                            reply.append("1. **").append(r.getCourseCode()).append(" - ").append(r.getCourseName()).append("** (").append(r.getCredits()).append(" TC) ").append(badge).append("\n");
                            reply.append("   - *Lý do*: ").append(r.getReason()).append("\n");
                        }
                        reply.append("\n💡 **Kế hoạch tải tín chỉ**: Bạn nên đăng ký từ **15 đến 18 tín chỉ** (khoảng 5-6 môn) để cân đối khối lượng học tập và thời gian thực hành đồ án.");
                    } else {
                        reply.append("Hiện tại chưa có môn học mới mở lớp phù hợp điều kiện tiên quyết của bạn, hoặc bạn đã hoàn thành hết các môn mở trong kỳ.\n");
                    }

                    response.setSuggestions(List.of(
                            "Một kỳ mình được đăng ký tối đa bao nhiêu tín chỉ?",
                            "Cách kiểm tra môn học tiên quyết trên hệ thống?",
                            "Làm thế nào để xử lý trùng lịch học giữa 2 môn?"
                    ));
                } else {
                    reply.append("Chào bạn! Dưới đây là lộ trình môn học chuẩn ngành Công nghệ Thông tin (4 năm - 160 tín chỉ):\n\n");
                    reply.append("- **Năm 1 (Kỳ 1-2)**: `CS101 Nhập môn lập trình`, Toán rời rạc, Giải tích, Đại số tuyến tính, Tiếng Anh chuyên ngành.\n");
                    reply.append("- **Năm 2 (Kỳ 3-4)**: `CS201 Cấu trúc dữ liệu & giải thuật`, `CS301 Hệ quản trị CSDL`, Kiến trúc máy tính, Hệ điều hành.\n");
                    reply.append("- **Năm 3 (Kỳ 5-6)**: `CS401 Web Application (Spring Boot + React)`, `CS402 Software Engineering & Agile`, `AI101 Trí tuệ nhân tạo`, Mạng máy tính.\n");
                    reply.append("- **Năm 4 (Kỳ 7-8)**: Thực tập doanh nghiệp (Pre-OJT/OJT), Đồ án tốt nghiệp / Khóa luận tốt nghiệp (Capstone Project).\n\n");
                    reply.append("> 💡 Để nhận gợi ý môn học chính xác theo tiến độ cá nhân, vui lòng thử lại khi kết nối học vụ được khôi phục.");
                    response.setSuggestions(knowledgeBase.getDefaultSuggestions());
                }
            }

            case "TIMETABLE" -> {
                reply.append("### 📅 Thời Khóa Biểu & Lịch Học Thực Tế\n\n");
                if (context != null) {
                    if (context.getCurrentEnrollments() != null && !context.getCurrentEnrollments().isEmpty()) {
                        reply.append("Dưới đây là lịch học chi tiết các lớp học phần bạn đang đăng ký trong học kỳ này:\n\n");
                        reply.append("| Thứ | Môn học | Mã lớp | Giờ học | Phòng | Giảng viên | Trạng thái |\n");
                        reply.append("| :--- | :--- | :--- | :--- | :--- | :--- | :---: |\n");
                        for (CurrentEnrollmentDto e : context.getCurrentEnrollments()) {
                            String conflictBadge = Boolean.TRUE.equals(e.getHasConflict()) ? "⚠️ Trùng lịch" : "✅ Hợp lệ";
                            reply.append("| **").append(e.getDayOfWeek()).append("** | ")
                                    .append(e.getCourseCode()).append(" - ").append(e.getCourseName()).append(" | `")
                                    .append(e.getSectionCode()).append("` | ")
                                    .append(e.getStartTime()).append(" - ").append(e.getEndTime()).append(" | ")
                                    .append(e.getRoomName() != null ? e.getRoomName() : "TBA").append(" | ")
                                    .append(e.getLecturerName() != null ? e.getLecturerName() : "Chưa phân công").append(" | ")
                                    .append(conflictBadge).append(" |\n");
                        }
                        reply.append("\n");

                        if (context.getScheduleConflictCount() > 0) {
                            reply.append("⚠️ **CẢNH BÁO XUNG ĐỘT THỜI KHÓA BIỂU**: Bạn đang có **").append(context.getScheduleConflictCount())
                                    .append(" lớp bị trùng lịch học** (`").append(String.join(", ", context.getConflictingSections()))
                                    .append("`). Vui lòng vào Cổng đăng ký học phần để chọn Section khác tránh bị trùng giờ thi/học nhé!\n\n");
                        } else {
                            reply.append("✨ **Thời khóa biểu hợp lệ**: Tất cả các lớp học phần của bạn đều được bố trí phù hợp, không bị trùng ca học.\n\n");
                        }
                    } else {
                        reply.append("Bạn hiện chưa đăng ký lớp học phần nào trong học kỳ này.\n");
                        reply.append("Hãy tham khảo danh sách môn học khuyến nghị bên dưới để đăng ký học phần nhé!\n\n");
                    }
                } else {
                    reply.append("Hiện tại không thể truy xuất thời khóa biểu cá nhân do mất kết nối đến dịch vụ đào tạo.\n");
                    reply.append("Bạn vui lòng kiểm tra lại trên trang Thời khóa biểu sinh viên.\n\n");
                }
                response.setSuggestions(List.of(
                        "Gợi ý môn học phù hợp cho kỳ tới?",
                        "Một học kỳ mình được đăng ký tối đa bao nhiêu tín chỉ?",
                        "Bị trùng lịch học giữa 2 môn thì xử lý thế nào?"
                ));
            }

            case "SCHEDULE_CONFLICT" -> {
                reply.append("### 🗓️ Hướng dẫn giải quyết Trùng thời khóa biểu (Schedule Conflict)\n\n");
                if (context != null && context.getScheduleConflictCount() > 0) {
                    reply.append("Hệ thống phát hiện tài khoản của bạn đang có **").append(context.getScheduleConflictCount())
                            .append(" lớp học phần bị xung đột thời khóa biểu**: `")
                            .append(String.join(", ", context.getConflictingSections())).append("`.\n\n");
                }
                reply.append("Trong hệ thống Rikkei EduPortal, hai lớp học phần bị coi là **trùng lịch** khi diễn ra **cùng một Thứ trong tuần** và có **khung giờ học giao thoa nhau**. Khi đó, hệ thống sẽ gán cờ `has_conflict = TRUE`.\n\n");
                reply.append("Các giải pháp xử lý thực tế:\n\n");
                reply.append("1. **Đổi sang lớp học phần (Section) khác**: Tra cứu môn học xem có mở Section vào thứ hoặc ca học khác không.\n");
                reply.append("2. **Ưu tiên giữ môn học tiên quyết**: Ưu tiên giữ môn tiên quyết (như CS101, CS201) vì nếu chậm sẽ ảnh hưởng đến các môn chuyên ngành kỳ sau.\n");
                reply.append("3. **Đổi sang môn tự chọn tương đương**: Chọn học phần tự chọn khác không bị xung đột giờ.\n");
                reply.append("4. **Hoãn môn học sang kỳ tiếp theo hoặc kỳ hè** để tránh quá tải lịch học.\n");
                response.setSuggestions(List.of(
                        "Làm sao để biết môn nào là môn tiên quyết?",
                        "Một học kỳ mình được đăng ký tối đa bao nhiêu tín chỉ?",
                        "Gợi ý môn học phù hợp cho kỳ tới?"
                ));
            }

            case "CREDITS_LIMIT" -> {
                reply.append("### 📚 Quy chế Số tín chỉ Đăng ký mỗi Học kỳ\n\n");
                if (context != null) {
                    reply.append("- **Số tín chỉ bạn đã hoàn thành**: ").append(context.getCompletedCredits()).append(" / ").append(context.getTotalRequiredCredits()).append(" TC.\n");
                    reply.append("- **Số tín chỉ bạn đang đăng ký kỳ này**: ").append(context.getRegisteredCredits()).append(" TC.\n");
                    reply.append("- **Số tín chỉ còn lại cần tích lũy**: ").append(Math.max(0, context.getTotalRequiredCredits() - context.getCompletedCredits())).append(" TC.\n\n");
                }
                reply.append("- **Số tín chỉ tối đa**: Bạn được phép đăng ký **tối đa 24 tín chỉ** trong một học kỳ chính.\n");
                reply.append("- **Số tín chỉ tối thiểu**: Tối thiểu **12 tín chỉ** đối với sinh viên học bình thường (khuyến nghị 15 - 18 tín chỉ/kỳ).\n");
                reply.append("- **Tổng số tín chỉ toàn khóa**: Cần tích lũy đủ **160 tín chỉ** để xét tốt nghiệp.\n");
                response.setSuggestions(List.of(
                        "Sinh viên bị cảnh báo học vụ thì được đăng ký tối đa bao nhiêu tín?",
                        "Gợi ý môn học kỳ này cho mình?",
                        "Bị trùng lịch học giữa 2 môn thì xử lý thế nào?"
                ));
            }

            case "PREREQUISITES" -> {
                reply.append("### 🔗 Quy định về Điều kiện Tiên quyết (Prerequisites)\n\n");
                if (context != null) {
                    reply.append("Theo hồ sơ học tập của bạn:\n");
                    if (context.getCompletedCourses() != null && !context.getCompletedCourses().isEmpty()) {
                        reply.append("- **Các môn bạn đã đạt điều kiện tiên quyết**: ");
                        List<String> codes = context.getCompletedCourses().stream().map(CompletedCourseDto::getCourseCode).toList();
                        reply.append(String.join(", ", codes)).append(".\n");
                    }
                    reply.append("\n");
                }
                reply.append("Môn tiên quyết là học phần mà bạn **bắt buộc phải học trước và đạt điểm từ D (4.0/10) trở lên** mới đủ điều kiện đăng ký học phần tiếp theo.\n\n");
                reply.append("Chuỗi môn học tiên quyết cốt lõi ngành CNTT:\n");
                reply.append("- `CS101 (Nhập môn lập trình)` ➔ Tiên quyết cho `CS201 (Cấu trúc dữ liệu và giải thuật)`\n");
                reply.append("- `CS201 (Cấu trúc dữ liệu & giải thuật)` ➔ Tiên quyết cho `CS401 (Phát triển ứng dụng Web)` và `AI101 (Trí tuệ nhân tạo cơ bản)`\n");
                reply.append("- `CS301 (Hệ quản trị CSDL)` và `CS402 (Kỹ nghệ phần mềm & Agile)`: Nên hoàn thành ở năm 2 và năm 3.\n");
                response.setSuggestions(List.of(
                        "Nếu mình bị trượt môn tiên quyết thì phải làm sao?",
                        "Gợi ý môn học kỳ này cho mình?",
                        "Một học kỳ mình được đăng ký tối đa bao nhiêu tín chỉ?"
                ));
            }

            case "GRADES_AND_GPA" -> {
                reply.append("### 📊 Quy chế Đánh giá Điểm số & Chuyên cần\n\n");
                if (context != null) {
                    reply.append("- **Điểm C-GPA tích lũy hiện tại**: **").append(context.getCurrentCgpa()).append(" / 10.0**\n");
                    reply.append("- **Xếp loại học lực**: **").append(context.getAcademicStanding()).append("**\n");
                    reply.append("- **Tỷ lệ chuyên cần trung bình**: **").append(context.getAttendanceRate()).append("%**\n\n");
                }
                reply.append("**Cơ cấu tính điểm học phần:**\n");
                reply.append("- **Chuyên cần (10%)**: Bắt buộc đạt từ **80% trở lên** mới đủ điều kiện dự thi cuối kỳ.\n");
                reply.append("- **Đánh giá giữa kỳ (30%)**: Kiểm tra hoặc bài tập lớn.\n");
                reply.append("- **Thi / Đồ án cuối kỳ (60%)**: Đánh giá kết thúc học phần.\n\n");
                reply.append("**Thang điểm chữ**: A (8.5-10.0) | B (7.0-8.4) | C (5.5-6.9) | D (4.0-5.4 - Đạt) | F (< 4.0 - Trượt môn).\n");
                response.setSuggestions(List.of(
                        "Cách tính điểm C-GPA tích lũy như thế nào?",
                        "Cảnh báo học vụ áp dụng khi nào?",
                        "Gợi ý môn học kỳ này cho mình?"
                ));
            }

            default -> {
                reply.append("Chào bạn! Mình là **Trợ lý Cố vấn Học tập AI** của Rikkei EduPortal.\n\n");
                if (context != null) {
                    reply.append("Hệ thống đã nhận diện hồ sơ của bạn: Sinh viên **").append(context.getStudentCode()).append("** (Ngành ").append(context.getMajor())
                            .append(", Kỳ ").append(context.getCurrentSemester()).append("). Bạn đã hoàn thành **")
                            .append(context.getCompletedCredits()).append(" tín chỉ** với điểm C-GPA **").append(context.getCurrentCgpa()).append("**.\n\n");
                }
                reply.append("Mình có thể hỗ trợ bạn các vấn đề sau:\n\n");
                reply.append("1. **Tư vấn môn học**: Gợi ý môn nên đăng ký trong kỳ tới dựa trên môn tiên quyết đã hoàn thành.\n");
                reply.append("2. **Xử lý trùng lịch học**: Cách phát hiện và khắc phục xung đột thời khóa biểu.\n");
                reply.append("3. **Quy chế tín chỉ**: Giới hạn 12 - 24 tín chỉ/kỳ, điều kiện tốt nghiệp 160 tín chỉ.\n");
                reply.append("4. **Quy chế điểm số**: Điểm chuyên cần (tối thiểu 80%), thang điểm chữ A-B-C-D-F.\n\n");
                reply.append("Bạn hãy chọn gợi ý bên dưới hoặc đặt câu hỏi cụ thể nhé!");
                response.setSuggestions(knowledgeBase.getDefaultSuggestions());
            }
        }

        response.setReply(reply.toString());
        return response;
    }

    private List<CourseRecommendationDto> buildRecommendations(StudentAcademicContextDto context) {
        List<CourseRecommendationDto> recommendations = new ArrayList<>();
        if (context == null) return recommendations;

        // 1. Highest priority: Retake failed courses
        if (context.getFailedCourses() != null) {
            for (FailedCourseDto failed : context.getFailedCourses()) {
                recommendations.add(new CourseRecommendationDto(
                        failed.getCourseCode(),
                        failed.getCourseName(),
                        failed.getCredits(),
                        "Môn học bị nợ/trượt (Điểm F). Cần ưu tiên đăng ký học lại sớm nhất để cải thiện điểm C-GPA và mở khóa môn tiên quyết.",
                        true,
                        true,
                        "HIGH"
                ));
            }
        }

        // 2. Eligible open courses matching prerequisite criteria
        if (context.getAvailableCourses() != null) {
            for (AvailableCourseDto av : context.getAvailableCourses()) {
                boolean alreadyAdded = recommendations.stream()
                        .anyMatch(r -> r.getCourseCode().equalsIgnoreCase(av.getCourseCode()));
                if (alreadyAdded) continue;

                if (Boolean.TRUE.equals(av.getPrerequisiteSatisfied())
                        && !Boolean.TRUE.equals(av.getAlreadyCompleted())
                        && !Boolean.TRUE.equals(av.getCurrentlyEnrolled())) {

                    String priority = Boolean.TRUE.equals(av.getHasScheduleConflict()) ? "MEDIUM" : "HIGH";
                    String reason;
                    if (av.getPrerequisiteCourseCode() != null) {
                        reason = "Đã hoàn thành môn tiên quyết " + av.getPrerequisiteCourseCode()
                                + " (" + (av.getPrerequisiteCourseName() != null ? av.getPrerequisiteCourseName() : "") + "). Môn mở lớp trong kỳ và phù hợp lộ trình ngành " + context.getMajor() + ".";
                    } else {
                        reason = "Môn học nền tảng không yêu cầu tiên quyết, phù hợp tích lũy trong học kỳ tiếp theo.";
                    }

                    if (Boolean.TRUE.equals(av.getHasScheduleConflict())) {
                        reason += " [Lưu ý: Có Section trùng lịch học hiện tại, hãy chọn Section khác].";
                    }

                    recommendations.add(new CourseRecommendationDto(
                            av.getCourseCode(),
                            av.getCourseName(),
                            av.getCredits(),
                            reason,
                            true,
                            true,
                            priority
                    ));
                }
            }
        }
        return recommendations;
    }

    public String detectCategory(String query) {
        if (query == null) return "GENERAL";
        String q = query.toLowerCase();

        if (q.contains("trùng") || q.contains("xung đột") || q.contains("conflict")) {
            return "SCHEDULE_CONFLICT";
        }
        if (q.contains("thời khóa biểu") || q.contains("thời khoá biểu") || q.contains("tkb") || q.contains("lịch học") || q.contains("lịch tuần") || q.contains("hôm nay học") || q.contains("tiết học")) {
            return "TIMETABLE";
        }
        if (q.contains("tín chỉ") || q.contains("tối đa") || q.contains("tối thiểu") || q.contains("bao nhiêu tín") || q.contains("giới hạn")) {
            return "CREDITS_LIMIT";
        }
        if (q.contains("tiên quyết") || q.contains("điều kiện") || q.contains("học trước") || q.contains("prerequisite") || q.contains("cs101") || q.contains("cs201") || q.contains("cs401")) {
            return "PREREQUISITES";
        }
        if (q.contains("điểm") || q.contains("chuyên cần") || q.contains("giữa kỳ") || q.contains("cuối kỳ") || q.contains("c-gpa") || q.contains("gpa") || q.contains("cảnh báo") || q.contains("cấm thi")) {
            return "GRADES_AND_GPA";
        }
        if (q.contains("lộ trình") || q.contains("học kỳ") || q.contains("kế hoạch") || q.contains("năm 1") || q.contains("năm 2") || q.contains("năm 3") || q.contains("năm 4") || q.contains("tốt nghiệp")) {
            return "ROADMAP";
        }
        if (q.contains("đăng ký") || q.contains("nên học") || q.contains("học môn nào") || q.contains("môn gì") || q.contains("gợi ý") || q.contains("khuyên")) {
            return "COURSE_RECOMMENDATION";
        }
        return "GENERAL";
    }
}
