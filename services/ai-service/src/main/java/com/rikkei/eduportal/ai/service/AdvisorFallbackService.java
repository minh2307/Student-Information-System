package com.rikkei.eduportal.ai.service;

import com.rikkei.eduportal.ai.dto.AcademicAdvisorRequest;
import com.rikkei.eduportal.ai.dto.AcademicAdvisorResponse;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AdvisorFallbackService {

    private final AcademicKnowledgeBase knowledgeBase;

    public AdvisorFallbackService(AcademicKnowledgeBase knowledgeBase) {
        this.knowledgeBase = knowledgeBase;
    }

    public AcademicAdvisorResponse generateFallback(AcademicAdvisorRequest request, String reason) {
        String query = request.getMessage() != null ? request.getMessage().toLowerCase().trim() : "";
        String category = detectCategory(query);

        AcademicAdvisorResponse response = new AcademicAdvisorResponse();
        response.setCategory(category);
        response.setFallbackUsed(true);
        response.setProvider("Offline Academic Rule Engine");
        response.setModel("rule-based-advisor-v1");
        response.setTimestamp(LocalDateTime.now());

        StringBuilder reply = new StringBuilder();

        switch (category) {
            case "SCHEDULE_CONFLICT" -> {
                reply.append("### 🗓️ Hướng dẫn giải quyết Trùng thời khóa biểu (Schedule Conflict)\n\n");
                reply.append("Chào bạn! Trong hệ thống Rikkei EduPortal, hai lớp học phần bị coi là **trùng lịch** khi diễn ra **cùng một Thứ trong tuần** và có **khung giờ học giao thoa nhau**. Khi đó, hệ thống sẽ đánh dấu `has_conflict = TRUE` và tạm hoãn duyệt đăng ký.\n\n");
                reply.append("Để giải quyết nhanh chóng, bạn hãy thực hiện theo các bước sau:\n\n");
                reply.append("1. **Đổi sang lớp học phần (Section) khác**: Vào mục **Tra cứu lớp học phần**, kiểm tra xem môn học đó có mở lớp vào các ngày hoặc ca khác trong tuần không.\n");
                reply.append("2. **Ưu tiên giữ môn học tiên quyết**: Nếu phải chọn giữa 2 môn, hãy ưu tiên môn là điều kiện tiên quyết cho các kỳ sau (ví dụ: `CS201 Cấu trúc dữ liệu & giải thuật` cần được ưu tiên hơn các môn tự chọn vì mở đường cho `CS401 Web` và `AI101`).\n");
                reply.append("3. **Đổi sang môn tự chọn tương đương**: Nếu một trong hai môn là tự chọn ngành hoặc đại cương tự do, bạn có thể chọn một học phần khác có lịch không bị xung đột.\n");
                reply.append("4. **Đăng ký ở kỳ tiếp theo hoặc kỳ hè**: Nếu môn không quá gấp, bạn có thể hoãn lại sang học kỳ tiếp theo để tránh quá tải lịch học.\n\n");
                reply.append("> 💡 *Mẹo nhỏ*: Bạn nên lập trước bảng thời khóa biểu tuần dự kiến trước khi bấm xác nhận đăng ký để đảm bảo các môn trải đều từ thứ 2 đến thứ 6.");
                response.setSuggestions(List.of(
                        "Làm sao để biết môn nào là môn tiên quyết?",
                        "Một học kỳ mình được đăng ký tối đa bao nhiêu tín chỉ?",
                        "Quy trình hủy môn học bị trùng lịch như thế nào?"
                ));
            }

            case "CREDITS_LIMIT" -> {
                reply.append("### 📚 Quy chế Số tín chỉ Đăng ký mỗi Học kỳ\n\n");
                reply.append("Chào bạn! Theo quy chế đào tạo theo hệ thống tín chỉ của Rikkei EduPortal:\n\n");
                reply.append("- **Số tín chỉ tối đa**: Bạn được phép đăng ký **tối đa 24 tín chỉ** trong một học kỳ chính.\n");
                reply.append("- **Số tín chỉ tối thiểu**: Tối thiểu **12 tín chỉ** đối với sinh viên học bình thường (mức khuyến nghị là 15 - 18 tín chỉ/kỳ để đảm bảo đúng tiến độ).\n");
                reply.append("- **Tổng số tín chỉ toàn khóa**: Cần tích lũy đủ **160 tín chỉ** để đủ điều kiện xét tốt nghiệp kỹ sư/cử nhân.\n\n");
                reply.append("> ⚠️ **Lưu ý quan trọng**: Nếu bạn đăng ký vượt quá 24 tín chỉ, hệ thống sẽ tự động chặn và thông báo lỗi. Bạn hãy cân đối thời gian giữa học lý thuyết và thực hành để đạt kết quả tốt nhất nhé!");
                response.setSuggestions(List.of(
                        "Nếu mình muốn đăng ký học vượt thì cần điều kiện gì?",
                        "Sinh viên bị cảnh báo học vụ thì được đăng ký tối đa bao nhiêu tín?",
                        "Gợi ý môn học kỳ này cho mình?"
                ));
            }

            case "PREREQUISITES" -> {
                reply.append("### 🔗 Quy định về Điều kiện Tiên quyết (Prerequisites)\n\n");
                reply.append("Chào bạn! Môn tiên quyết là học phần mà bạn **bắt buộc phải học trước và đạt điểm từ D (4.0/10) trở lên** mới đủ điều kiện đăng ký học phần tiếp theo.\n\n");
                reply.append("Một số chuỗi môn học tiên quyết cốt lõi bạn cần nắm rõ:\n");
                reply.append("- `CS101 (Nhập môn lập trình)` ➔ Tiên quyết cho `CS201 (Cấu trúc dữ liệu và giải thuật)`\n");
                reply.append("- `CS201 (Cấu trúc dữ liệu & giải thuật)` ➔ Tiên quyết cho `CS401 (Phát triển ứng dụng Web)` và `AI101 (Trí tuệ nhân tạo cơ bản)`\n");
                reply.append("- `CS301 (Hệ quản trị CSDL)` và `CS402 (Kỹ nghệ phần mềm & Agile)`: Có thể học song hành sau khi đã nắm vững lập trình cơ bản.\n\n");
                reply.append("> 📌 *Nếu chưa hoàn thành môn tiên quyết, cổng đăng ký học phần sẽ tự động khóa nút chọn của môn học sau.*");
                response.setSuggestions(List.of(
                        "Nếu mình bị trượt môn tiên quyết thì phải làm sao?",
                        "Mình có thể đăng ký học song hành môn tiên quyết được không?",
                        "Gợi ý lộ trình học để không bị nợ môn?"
                ));
            }

            case "GRADES_AND_GPA" -> {
                reply.append("### 📊 Quy chế Đánh giá Điểm số & Chuyên cần\n\n");
                reply.append("Chào bạn! Cơ cấu điểm học phần tại trường được tính theo tỷ lệ chuẩn:\n\n");
                reply.append("- **Điểm Chuyên cần (10%)**: Đánh giá qua điểm danh và tương tác trên lớp. **Điều kiện bắt buộc: Tỷ lệ chuyên cần phải đạt từ 80% trở lên mới được tham dự thi cuối kỳ**.\n");
                reply.append("- **Điểm Đánh giá Giữa kỳ (30%)**: Bài kiểm tra tập trung, bài tập lớn hoặc thực hành phòng Lab.\n");
                reply.append("- **Điểm Thi/Đồ án Cuối kỳ (60%)**: Đánh giá toàn diện kiến thức học phần.\n\n");
                reply.append("**Thang điểm chữ quy đổi:**\n");
                reply.append("- **A** (8.5 - 10.0) | **B** (7.0 - 8.4) | **C** (5.5 - 6.9) | **D** (4.0 - 5.4 - Đạt môn) | **F** (< 4.0 - Trượt môn).\n");
                reply.append("- **Cảnh báo học vụ**: Nếu điểm trung bình tích lũy C-GPA < 5.0 (hệ 10), bạn sẽ bị đưa vào diện cảnh báo học vụ. Hãy chú ý giữ vững phong độ học tập nhé!");
                response.setSuggestions(List.of(
                        "Cách tính điểm C-GPA tích lũy như thế nào?",
                        "Nghỉ học bao nhiêu buổi thì bị cấm thi?",
                        "Thủ tục xin phúc khảo điểm thi?"
                ));
            }

            case "ROADMAP" -> {
                reply.append("### 🗺️ Gợi ý Lộ trình Học tập Chuẩn ngành CNTT (8 Học kỳ)\n\n");
                reply.append("Chào bạn! Dưới đây là lộ trình môn học tối ưu giúp bạn hoàn thành đủ **160 tín chỉ** trong 4 năm:\n\n");
                reply.append("- **Năm 1 (Kỳ 1-2)**: Tập trung vào nền tảng: `CS101 Nhập môn lập trình`, Toán rời rạc, Giải tích, Đại số tuyến tính và Tiếng Anh chuyên ngành.\n");
                reply.append("- **Năm 2 (Kỳ 3-4)**: Kiến trúc & Dữ liệu: `CS201 Cấu trúc dữ liệu & giải thuật`, `CS301 Hệ quản trị CSDL`, Kiến trúc máy tính, Hệ điều hành.\n");
                reply.append("- **Năm 3 (Kỳ 5-6)**: Ứng dụng & Dự án thực tế: `CS401 Web Application (Spring Boot + React)`, `CS402 Software Engineering & Agile`, `AI101 Trí tuệ nhân tạo`, Mạng máy tính.\n");
                reply.append("- **Năm 4 (Kỳ 7-8)**: Chuyên nghiệp & Tốt nghiệp: Thực tập doanh nghiệp (Pre-OJT/OJT), Đồ án tốt nghiệp / Khóa luận tốt nghiệp (Capstone Project).\n\n");
                reply.append("> 💡 *Lời khuyên*: Bạn nên duy trì khoảng 18 - 20 tín chỉ mỗi kỳ để có thời gian làm bài tập lớn và tham gia các câu lạc bộ học thuật.");
                response.setSuggestions(List.of(
                        "Học kỳ này mình nên ưu tiên đăng ký môn nào trước?",
                        "Điều kiện để được đi thực tập tốt nghiệp (OJT)?",
                        "Làm sao để đăng ký học vượt tốt nghiệp sớm?"
                ));
            }

            default -> {
                reply.append("Chào bạn! Mình là **Trợ lý Cố vấn Học tập AI** của Rikkei EduPortal. Mình có thể hỗ trợ bạn các vấn đề sau:\n\n");
                reply.append("1. **Quy chế tín chỉ**: Số tín chỉ tối đa (24 TC), tối thiểu (12 TC), điều kiện tốt nghiệp (160 TC).\n");
                reply.append("2. **Xử lý trùng lịch học**: Cách phát hiện và khắc phục xung đột thời khóa biểu.\n");
                reply.append("3. **Điều kiện tiên quyết**: Kiểm tra môn nào cần học trước (ví dụ CS101 ➔ CS201 ➔ CS401).\n");
                reply.append("4. **Tư vấn lộ trình môn học**: Gợi ý các môn nên đăng ký theo từng học kỳ.\n");
                reply.append("5. **Quy chế điểm số & chuyên cần**: Cơ cấu 10% - 30% - 60%, điều kiện dự thi cuối kỳ (chuyên cần >= 80%).\n\n");
                reply.append("Bạn hãy thử nhấn vào các gợi ý bên dưới hoặc đặt câu hỏi cụ thể nhé!");
                response.setSuggestions(knowledgeBase.getDefaultSuggestions());
            }
        }

        response.setReply(reply.toString());
        return response;
    }

    private String detectCategory(String query) {
        if (query.contains("trùng") || query.contains("xung đột") || query.contains("lịch") || query.contains("thời khóa biểu") || query.contains("conflict")) {
            return "SCHEDULE_CONFLICT";
        }
        if (query.contains("tín chỉ") || query.contains("tối đa") || query.contains("tối thiểu") || query.contains("bao nhiêu tín") || query.contains("giới hạn")) {
            return "CREDITS_LIMIT";
        }
        if (query.contains("tiên quyết") || query.contains("điều kiện") || query.contains("học trước") || query.contains("prerequisite") || query.contains("cs101") || query.contains("cs201") || query.contains("cs401")) {
            return "PREREQUISITES";
        }
        if (query.contains("điểm") || query.contains("chuyên cần") || query.contains("giữa kỳ") || query.contains("cuối kỳ") || query.contains("c-gpa") || query.contains("gpa") || query.contains("cảnh báo") || query.contains("cấm thi")) {
            return "GRADES_AND_GPA";
        }
        if (query.contains("lộ trình") || query.contains("kỳ") || query.contains("học kỳ") || query.contains("kế hoạch") || query.contains("năm 1") || query.contains("năm 2") || query.contains("năm 3") || query.contains("năm 4") || query.contains("tốt nghiệp")) {
            return "ROADMAP";
        }
        return "GENERAL";
    }
}
