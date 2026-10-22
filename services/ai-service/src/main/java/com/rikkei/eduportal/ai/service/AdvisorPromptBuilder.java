package com.rikkei.eduportal.ai.service;

import com.rikkei.eduportal.ai.dto.AcademicAdvisorRequest;
import com.rikkei.eduportal.ai.dto.ChatMessageDto;
import org.springframework.stereotype.Component;

@Component
public class AdvisorPromptBuilder {

    private final AcademicKnowledgeBase knowledgeBase;

    public AdvisorPromptBuilder(AcademicKnowledgeBase knowledgeBase) {
        this.knowledgeBase = knowledgeBase;
    }

    public String buildSystemPrompt() {
        return """
            Bạn là Cố vấn Học tập AI (Academic Advisor) chính thức của trường đại học trên hệ thống Rikkei EduPortal.
            Tính cách của bạn: Thân thiện, nhiệt tình, am hiểu sâu sắc quy chế đào tạo tín chỉ, luôn đồng hành và hỗ trợ sinh viên hết mình.
            
            DƯỚI ĐÂY LÀ DỮ LIỆU QUY CHẾ VÀ KIẾN THỨC BẮT BUỘC BẠN PHẢI TUÂN THỦ:
            """ + knowledgeBase.getFullRegulationsContext() + """
            
            QUY TẮC PHẢN HỒI CHO SINH VIÊN:
            1. Ngôn từ: Thân thiện, gần gũi, chuẩn mực sư phạm (xưng 'mình' hoặc 'thầy/cô cố vấn', gọi sinh viên là 'bạn').
            2. Độ chính xác số liệu:
               - Tối đa: 24 tín chỉ/kỳ.
               - Tối thiểu: 12 tín chỉ/kỳ.
               - Tổng tích lũy tốt nghiệp: 160 tín chỉ.
               - Đánh giá: 10% Chuyên cần, 30% Giữa kỳ, 60% Cuối kỳ.
               - Chuyên cần tối thiểu để được thi: 80%.
            3. Trùng thời khóa biểu: Luôn giải thích rõ nguyên nhân (cùng thứ & giao thoa khung giờ) và đưa ra các giải pháp thực tế:
               - Tìm lớp học phần khác (Section) của cùng môn mở vào thứ/giờ khác.
               - Ưu tiên giữ môn tiên quyết (như CS101, CS201) trước.
               - Đổi môn tự chọn hoặc hoãn sang kỳ hè/kỳ tiếp theo.
            4. Định dạng: Trình bày súc tích, trực quan bằng Markdown (dùng gạch đầu dòng, in đậm từ khóa quan trọng).
            5. Gợi ý tiếp theo: Cuối câu trả lời, hãy kèm 2-3 câu hỏi gợi mở mà sinh viên có thể quan tâm.
            """;
    }

    public String buildUserPrompt(AcademicAdvisorRequest request) {
        StringBuilder sb = new StringBuilder();

        // Injects Student Context if provided
        if (request.getStudentCode() != null || request.getCurrentSemester() != null) {
            sb.append("[THÔNG TIN HỒ SƠ SINH VIÊN]:\n");
            if (request.getStudentCode() != null) sb.append("- Mã sinh viên: ").append(request.getStudentCode()).append("\n");
            if (request.getCurrentSemester() != null) sb.append("- Học kỳ hiện tại: Kỳ ").append(request.getCurrentSemester()).append("\n");
            if (request.getMajor() != null) sb.append("- Chuyên ngành: ").append(request.getMajor()).append("\n");
            if (request.getCreditsEarned() != null) sb.append("- Tín chỉ đã tích lũy: ").append(request.getCreditsEarned()).append("/160 tín chỉ\n");
            if (request.getCurrentCgpa() != null) sb.append("- Điểm C-GPA hiện tại: ").append(request.getCurrentCgpa()).append("/10.0\n");
            if (request.getConflictingSections() != null && !request.getConflictingSections().isEmpty()) {
                sb.append("- Các lớp đang bị cảnh báo trùng lịch: ").append(String.join(", ", request.getConflictingSections())).append("\n");
            }
            sb.append("\n");
        }

        // Conversation history context if present
        if (request.getHistory() != null && !request.getHistory().isEmpty()) {
            sb.append("[LỊCH SỬ HỘI THOẠI TRƯỚC ĐÓ]:\n");
            for (ChatMessageDto turn : request.getHistory()) {
                sb.append(turn.getRole().toUpperCase()).append(": ").append(turn.getContent()).append("\n");
            }
            sb.append("\n");
        }

        sb.append("[CÂU HỎI MỚI CỦA SINH VIÊN]:\n");
        sb.append(request.getMessage().trim());

        return sb.toString();
    }
}
