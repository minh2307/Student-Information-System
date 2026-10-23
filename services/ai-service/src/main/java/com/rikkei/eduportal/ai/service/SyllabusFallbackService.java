package com.rikkei.eduportal.ai.service;

import com.rikkei.eduportal.ai.dto.AssessmentSchemeDto;
import com.rikkei.eduportal.ai.dto.GenerateSyllabusRequest;
import com.rikkei.eduportal.ai.dto.GenerateSyllabusResponse;
import com.rikkei.eduportal.ai.dto.LearningOutcomeDto;
import com.rikkei.eduportal.ai.dto.WeeklyTopicDto;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class SyllabusFallbackService {

    public GenerateSyllabusResponse generateFallback(GenerateSyllabusRequest request, String reason) {
        String courseName = request.getCourseName() != null ? request.getCourseName().trim() : "Chuyên đề Công nghệ Thông tin";
        int credits = request.getCredits() != null && request.getCredits() > 0 ? request.getCredits() : 3;
        int weeklyHours = credits <= 2 ? 3 : (credits == 3 ? 4 : 5);
        String courseCode = generateSuggestedCourseCode(courseName);

        GenerateSyllabusResponse response = new GenerateSyllabusResponse();
        response.setCourseName(courseName);
        response.setCredits(credits);
        response.setWeeklyHours(weeklyHours);
        response.setCourseCode(courseCode);
        response.setFallbackUsed(true);
        response.setProvider("Offline Heuristic Engine");
        response.setModel("academic-fallback-v1");
        response.setGeneratedAt(LocalDateTime.now());

        // Overview
        String reqNote = (request.getRequirements() != null && !request.getRequirements().isBlank())
                ? " Môn học tập trung đáp ứng định hướng: " + request.getRequirements().trim() + "."
                : "";
        response.setOverview(
                "Học phần '" + courseName + "' trang bị cho người học nền tảng kiến thức lý thuyết vững chắc " +
                "cùng kỹ năng thực hành chuyên sâu theo chuẩn đào tạo kỹ sư công nghệ thông tin. " +
                "Sinh viên được tiếp cận phương pháp luận khoa học, công cụ hiện đại và quy trình phát triển thực tế." + reqNote
        );

        // Prerequisites
        response.setPrerequisites(List.of(
                "Lập trình hướng đối tượng (OOP) hoặc Nhập môn lập trình",
                "Cấu trúc dữ liệu và giải thuật cơ sở",
                "Kỹ năng sử dụng Git và môi trường phát triển (IDE)"
        ));

        // Learning Outcomes (CLOs)
        List<LearningOutcomeDto> clos = new ArrayList<>();
        clos.add(new LearningOutcomeDto("CLO1", "Hiểu và giải thích được các khái niệm, nguyên lý nền tảng và kiến trúc cốt lõi của " + courseName + ".", "Understanding"));
        clos.add(new LearningOutcomeDto("CLO2", "Vận dụng thành thạo các công cụ, thư viện và framework chuẩn công nghiệp để giải quyết bài toán nghiệp vụ.", "Applying"));
        clos.add(new LearningOutcomeDto("CLO3", "Phân tích, thiết kế và tối ưu hóa giải pháp kỹ thuật, đánh giá hiệu năng và tính bảo mật của hệ thống.", "Analyzing"));
        clos.add(new LearningOutcomeDto("CLO4", "Xây dựng và triển khai hoàn chỉnh một ứng dụng/đồ án môn học đáp ứng yêu cầu kỹ thuật và chất lượng.", "Creating"));
        clos.add(new LearningOutcomeDto("CLO5", "Rèn luyện kỹ năng làm việc nhóm, quản lý mã nguồn qua Git và kỹ năng thuyết trình báo cáo kỹ thuật.", "Evaluating"));
        response.setLearningOutcomes(clos);

        // Weekly Topics (15 weeks)
        List<WeeklyTopicDto> weeks = new ArrayList<>();
        weeks.add(new WeeklyTopicDto(1, "Tổng quan môn học & Thiết lập môi trường", "Giới thiệu mục tiêu học phần, chuẩn đầu ra, cài đặt môi trường phát triển và công cụ.", "Thuyết giảng & Hướng dẫn cài đặt", "Điểm danh & Khảo sát đầu khóa"));
        weeks.add(new WeeklyTopicDto(2, "Kiến trúc nền tảng và nguyên lý cốt lõi", "Các khái niệm cơ bản, mô hình kiến trúc chuẩn và luồng xử lý dữ liệu.", "Thuyết giảng & Thảo luận", "Câu hỏi trắc nghiệm nhanh"));
        weeks.add(new WeeklyTopicDto(3, "Thực hành thiết kế và triển khai module cơ bản", "Cấu hình dự án, xây dựng các thành phần đầu tiên và viết mã nguồn chuẩn clean code.", "Thực hành Lab tại lớp", "Bài tập thực hành 1"));
        weeks.add(new WeeklyTopicDto(4, "Kỹ thuật chuyên sâu & Quản lý dữ liệu", "Mô hình hóa dữ liệu, tương tác cơ sở dữ liệu và xử lý nghiệp vụ phức tạp.", "Thuyết giảng & Thực hành", "Đánh giá bài tập Lab"));
        weeks.add(new WeeklyTopicDto(5, "Tối ưu hóa và giải thuật nâng cao", "Cải thiện tốc độ thực thi, quản lý bộ nhớ và xử lý tải cao.", "Thuyết giảng kết hợp giải case study", "Bài tập nhóm nhỏ"));
        weeks.add(new WeeklyTopicDto(6, "Bảo mật và chuẩn hóa giao tiếp hệ thống", "Xác thực, phân quyền, mã hóa dữ liệu và phòng ngừa các lỗ hổng bảo mật phổ biến.", "Thực hành phòng lab", "Kiểm tra tiến độ đồ án"));
        weeks.add(new WeeklyTopicDto(7, "Phân công đề tài & Thiết kế đồ án môn học", "Công bố danh sách đề tài, thành lập nhóm, phân tích yêu cầu SRS và thiết kế kiến trúc.", "Thảo luận nhóm & Giảng viên phản biện", "Bản nộp thiết kế kiến trúc"));
        weeks.add(new WeeklyTopicDto(8, "Đánh giá Giữa kỳ (Midterm Assessment)", "Kiểm tra lý thuyết giữa kỳ và nghiệm thu tiến độ Sprint 1 đồ án môn học.", "Kiểm tra tập trung", "Điểm đánh giá giữa kỳ (30%)"));
        weeks.add(new WeeklyTopicDto(9, "Tích hợp dịch vụ & Xử lý bất đồng bộ", "Xây dựng cơ chế tích hợp, xử lý hàng đợi thông điệp và tương tác giữa các service.", "Thuyết giảng & Hướng dẫn kỹ thuật", "Review mã nguồn (Code review)"));
        weeks.add(new WeeklyTopicDto(10, "Kiểm thử tự động & Đảm bảo chất lượng", "Viết Unit test, Integration test và thiết lập ngưỡng bao phủ mã nguồn (code coverage).", "Thực hành Lab", "Bài tập kiểm thử phần mềm"));
        weeks.add(new WeeklyTopicDto(11, "Tự động hóa CI/CD & Đóng gói container", "Xây dựng Docker image, thiết lập pipeline build và test tự động trên GitHub Actions.", "Thực hành DevOps cơ bản", "Kiểm tra pipeline đồ án"));
        weeks.add(new WeeklyTopicDto(12, "Giám sát, Ghi log và Xử lý sự cố", "Quản lý lỗi tập trung, cấu hình logging và các chiến lược khôi phục dịch vụ (Fallback/Resilience).", "Thuyết giảng & Demo thực tế", "Báo cáo tiến độ Sprint 2"));
        weeks.add(new WeeklyTopicDto(13, "Hoàn thiện đồ án và tối ưu hóa hệ thống", "Tích hợp toàn diện các chức năng, rà soát hiệu năng và kiểm thử tải hệ thống.", "Hướng dẫn hướng dẫn nhóm", "Nghiệm thu bản alpha đồ án"));
        weeks.add(new WeeklyTopicDto(14, "Tổng kết kiến thức & Hướng dẫn viết tài liệu", "Ôn tập kiến thức trọng tâm, hoàn thiện báo cáo kỹ thuật và tài liệu hướng dẫn sử dụng.", "Hỏi đáp & Thảo luận tổng kết", "Nộp báo cáo đồ án hoàn chỉnh"));
        weeks.add(new WeeklyTopicDto(15, "Báo cáo cuối kỳ & Bảo vệ đồ án (Final Exam)", "Các nhóm sinh viên thuyết trình sản phẩm, demo trực tiếp và trả lời chất vấn của hội đồng.", "Vấn đáp & Đánh giá đồ án", "Điểm thi/Đồ án cuối kỳ (60%)"));
        response.setWeeklyTopics(weeks);

        // Assessment Scheme
        response.setAssessmentScheme(new AssessmentSchemeDto(10, 30, 60,
                "Điểm quá trình (40%): 10% Chuyên cần & thái độ học tập + 30% Đánh giá giữa kỳ (Bài tập lớn & Kiểm tra kỹ năng). " +
                "Điểm kết thúc (60%): Báo cáo đồ án / Thi kết thúc học phần. Điểm tổng kết quy đổi theo thang chữ chuẩn.")) ;

        // Textbooks
        response.setTextbooks(List.of(
                "Giáo trình chuẩn Đào tạo Kỹ sư CNTT: '" + courseName + "' - NXB Đại học Quốc gia.",
                "Clean Architecture: A Craftsman's Guide to Software Structure and Design - Robert C. Martin.",
                "Tài liệu kỹ thuật chính thức và các tiêu chuẩn quốc tế liên quan."
        ));

        // Format Markdown Syllabus for Direct UI display
        StringBuilder md = new StringBuilder();
        md.append("# ĐỀ CƯƠNG CHI TIẾT HỌC PHẦN (SYLLABUS)\n");
        md.append("## ").append(courseCode).append(" - ").append(courseName).append("\n\n");
        md.append("> **Số tín chỉ**: ").append(credits).append(" TC | **Số giờ học/tuần**: ").append(weeklyHours).append(" giờ | **Định dạng**: Học phần bắt buộc/chuyên ngành\n");
        if (reason != null && !reason.isBlank()) {
            md.append("> *Ghi chú cơ chế*: Đề cương được sinh bởi Bộ sinh đề cương dự phòng thông minh (Fallback Engine) do: ").append(reason).append("*\n\n");
        }
        md.append("### 1. Mô tả Tổng quan Học phần\n");
        md.append(response.getOverview()).append("\n\n");

        md.append("### 2. Chuẩn đầu ra Học phần (Course Learning Outcomes - CLOs)\n");
        for (LearningOutcomeDto clo : clos) {
            md.append("- **[").append(clo.getCode()).append("]** (").append(clo.getBloomLevel()).append("): ").append(clo.getDescription()).append("\n");
        }
        md.append("\n");

        md.append("### 3. Phân bổ Đánh giá Kết quả Học tập\n");
        md.append("- **Chuyên cần & Ý thức**: 10% (Điểm danh lớp, tương tác xây dựng bài)\n");
        md.append("- **Đánh giá Giữa kỳ**: 30% (Kiểm tra lý thuyết & bài tập thực hành tuần 8)\n");
        md.append("- **Đồ án/Thi Cuối kỳ**: 60% (Sản phẩm hoàn chỉnh và báo cáo tuần 15)\n\n");

        md.append("### 4. Kế hoạch Giảng dạy và Học tập Từng tuần (15 Tuần)\n");
        for (WeeklyTopicDto w : weeks) {
            md.append("**Tuần ").append(w.getWeek()).append(": ").append(w.getTopic()).append("**\n");
            md.append("- *Nội dung*: ").append(w.getContents()).append("\n");
            md.append("- *Phương pháp & Đánh giá*: ").append(w.getTeachingMethod()).append(" | ").append(w.getAssessment()).append("\n\n");
        }

        md.append("### 5. Giáo trình và Tài liệu Tham khảo\n");
        for (String tb : response.getTextbooks()) {
            md.append("- ").append(tb).append("\n");
        }

        response.setSyllabus(md.toString());
        return response;
    }

    private String generateSuggestedCourseCode(String courseName) {
        String lower = courseName.toLowerCase();
        if (lower.contains("data") || lower.contains("cấu trúc") || lower.contains("thuật toán")) return "CS201";
        if (lower.contains("database") || lower.contains("cơ sở dữ liệu") || lower.contains("sql")) return "CS301";
        if (lower.contains("web") || lower.contains("frontend") || lower.contains("backend") || lower.contains("spring")) return "CS401";
        if (lower.contains("ai") || lower.contains("machine learning") || lower.contains("trí tuệ")) return "AI402";
        if (lower.contains("network") || lower.contains("mạng") || lower.contains("cloud") || lower.contains("devops")) return "IT305";
        if (lower.contains("security") || lower.contains("an toàn") || lower.contains("bảo mật")) return "IT410";
        if (lower.contains("mobile") || lower.contains("di động") || lower.contains("android") || lower.contains("ios")) return "CS405";
        return "IT" + (100 + Math.abs(courseName.hashCode() % 400));
    }
}
