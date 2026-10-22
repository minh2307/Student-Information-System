package com.rikkei.eduportal.ai.service;

import com.rikkei.eduportal.ai.dto.GenerateSyllabusRequest;
import org.springframework.stereotype.Component;

@Component
public class SyllabusPromptBuilder {

    public String buildSystemPrompt() {
        return """
            Bạn là Chuyên gia Cao cấp về Thiết kế Chương trình Đào tạo Đại học và Khảo thí (Higher Education Curriculum Specialist), am hiểu sâu sắc các chuẩn kiểm định quốc tế như ABET, CDIO và chuẩn đào tạo theo chuẩn đầu ra (Outcome-Based Education - OBE).
            
            Nhiệm vụ của bạn: Thiết kế đề cương chi tiết học phần (Course Syllabus) mang tính học thuật cao, bám sát thực tiễn công nghiệp phần mềm và tuân thủ chặt chẽ quy chế đào tạo đại học.
            
            Quy tắc trình bày và chuẩn mực bắt buộc:
            1. Ngôn ngữ: Tiếng Việt chuẩn mực sư phạm đại học.
            2. Cấu trúc chuẩn đầu ra (CLOs): Xây dựng từ 4 đến 6 CLOs đo lường được bằng các động từ hành động theo Thang đo Bloom (Bloom's Revised Taxonomy: Hiểu, Áp dụng, Phân tích, Đánh giá, Sáng tạo).
            3. Phân bổ tiến độ: 15 tuần học kỳ tiêu chuẩn (hoặc phân bổ tương ứng với số tín chỉ), kết hợp lý thuyết, bài tập tình huống, thực hành Lab và Đồ án môn học.
            4. Tỷ lệ đánh giá học phần: Bắt buộc tuân theo quy chế hệ thống:
               - Chuyên cần & Ý thức học tập: 10%
               - Đánh giá giữa kỳ (Kiểm tra/Bài tập lớn/Thực hành): 30%
               - Đánh giá cuối kỳ (Thi cuối kỳ/Bảo vệ đồ án): 60%
            5. Định dạng dữ liệu: Phản hồi BẮT BUỘC là định dạng JSON hợp lệ duy nhất, KHÔNG bao gồm bất kỳ lời chào hay văn bản giải thích nào ngoài khối JSON.
            """;
    }

    public String buildUserPrompt(GenerateSyllabusRequest request) {
        StringBuilder sb = new StringBuilder();
        sb.append("Hãy xây dựng đề cương chi tiết học phần với các thông số sau:\n");
        sb.append("- Tên môn học: ").append(request.getCourseName()).append("\n");
        sb.append("- Số tín chỉ: ").append(request.getCredits()).append(" tín chỉ\n");
        if (request.getRequirements() != null && !request.getRequirements().isBlank()) {
            sb.append("- Yêu cầu đặc biệt từ Giảng viên/Admin: ").append(request.getRequirements().trim()).append("\n");
        } else {
            sb.append("- Yêu cầu đặc biệt: Thiết kế theo hướng hiện đại, kết hợp lý thuyết vững chắc và thực hành ứng dụng thực tế.\n");
        }

        sb.append("""
            
            Yêu cầu trả về định dạng JSON thuần túy (không dùng markdown block ```json, chỉ trả về JSON hợp lệ) theo cấu trúc schema sau:
            {
              "courseCode": "Mã môn học gợi ý (VD: CS301, IT202, SE401)",
              "courseName": "Tên môn học chuẩn",
              "credits": 3,
              "weeklyHours": 4,
              "overview": "Mô tả tổng quan học phần và vị trí trong chương trình đào tạo (2-3 đoạn)",
              "prerequisites": ["Tên môn tiên quyết 1", "Kiến thức nền tảng 2"],
              "learningOutcomes": [
                {
                  "code": "CLO1",
                  "description": "Mô tả chuẩn đầu ra đo lường được bắt đầu bằng động từ hành động",
                  "bloomLevel": "Hiểu / Vận dụng / Phân tích / Sáng tạo"
                }
              ],
              "weeklyTopics": [
                {
                  "week": 1,
                  "topic": "Tên chủ đề tuần",
                  "contents": "Nội dung kiến thức cốt lõi, bài tập và thực hành",
                  "teachingMethod": "Thuyết giảng / Thảo luận / Thực hành Lab",
                  "assessment": "Điểm danh / Câu hỏi nhanh / Bài tập về nhà"
                }
              ],
              "assessmentScheme": {
                "attendanceRate": 10,
                "midtermRate": 30,
                "finalRate": 60,
                "notes": "Quy chế đánh giá chi tiết theo thang điểm 10"
              },
              "textbooks": [
                "Giáo trình chính (Tác giả, Tên sách, NXB, Năm)",
                "Tài liệu tham khảo bổ trợ"
              ],
              "syllabus": "Toàn bộ nội dung đề cương chi tiết được biên tập đẹp mắt chuẩn Markdown để người dùng đọc trực tiếp."
            }
            """);

        return sb.toString();
    }
}
