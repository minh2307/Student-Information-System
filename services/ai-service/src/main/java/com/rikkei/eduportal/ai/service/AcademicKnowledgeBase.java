package com.rikkei.eduportal.ai.service;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class AcademicKnowledgeBase {

    public String getFullRegulationsContext() {
        return """
            === QUY CHẾ ĐÀO TẠO VÀ TÍN CHỈ RIKKEI EDUPORTAL ===
            1. Quy định về số tín chỉ:
               - Tối đa: 24 tín chỉ / học kỳ chính.
               - Tối thiểu: 12 tín chỉ / học kỳ (đối với sinh viên trong tiến độ chuẩn), 14 tín chỉ khuyến nghị.
               - Tổng số tín chỉ toàn khóa để xét tốt nghiệp: 160 tín chỉ.
               - Thời gian đào tạo chuẩn: 8 học kỳ chính (4 năm).

            2. Quy định về môn học tiên quyết (Prerequisites):
               - Sinh viên bắt buộc phải tích lũy và đạt môn học tiên quyết (điểm >= D / 4.0) mới được đăng ký học phần tiếp theo.
               - Chuỗi tiên quyết tiêu biểu:
                 * CS101 (Nhập môn lập trình) -> Tiên quyết cho CS201 (Cấu trúc dữ liệu và giải thuật).
                 * CS201 (Cấu trúc dữ liệu và giải thuật) -> Tiên quyết cho CS401 (Phát triển ứng dụng Web) và AI101 (Trí tuệ nhân tạo cơ bản).
                 * CS301 (Hệ quản trị CSDL) và CS402 (Kỹ nghệ phần mềm & Agile) -> Khuyến nghị hoàn thành ở năm 2 và năm 3.

            3. Quy chế Đánh giá và Điểm số:
               - Thành phần điểm: Chuyên cần (10%) + Đánh giá giữa kỳ (30%) + Thi/Đồ án kết thúc học phần (60%).
               - Điều kiện dự thi cuối kỳ: Tỷ lệ chuyên cần (attendance_rate) tối thiểu đạt từ 80.00% trở lên.
               - Thang điểm chữ:
                 * A (8.5 - 10.0): Xuất sắc / Giỏi
                 * B (7.0 - 8.4): Khá
                 * C (5.5 - 6.9): Trung bình
                 * D (4.0 - 5.4): Trung bình yếu (Đạt môn)
                 * F (< 4.0): Kém (Trượt môn, bắt buộc phải học lại)
               - Cảnh báo học vụ: Sinh viên có điểm GPA kỳ hoặc C-GPA tích lũy dưới 5.0 (hệ 10) bị xếp vào diện cảnh báo học vụ. 3 kỳ liên tiếp bị cảnh báo sẽ thuộc diện xem xét buộc thôi học.

            4. Quy định về Trùng thời khóa biểu (Schedule Conflict):
               - Hai lớp học phần bị coi là trùng lịch nếu diễn ra trong cùng một Thứ trong tuần (MON, TUE, WED, THU, FRI, SAT) VÀ khoảng thời gian [start_time, end_time] giao thoa nhau.
               - Khi bị trùng lịch, hệ thống tự động gán cờ has_conflict = TRUE trên bản ghi đăng ký. Đăng ký không thể được chuyển sang trạng thái REGISTERED.
               - Các bước xử lý trùng lịch khuyến nghị:
                 1. Đổi sang lớp học phần (Section) khác của cùng môn học đang mở ở khung giờ hoặc thứ khác.
                 2. Ưu tiên đăng ký môn học tiên quyết hoặc môn học cốt lõi của kỳ trước.
                 3. Chuyển sang môn học tự chọn tương đương không bị trùng giờ.
                 4. Hoãn môn học chưa cấp bách sang kỳ học tiếp theo hoặc học kỳ hè.

            5. Lộ trình môn học khuyến nghị cho ngành Công nghệ Thông tin (CS/SE):
               - Năm 1 (Kỳ 1, 2): CS101 (C/C++), Toán rời rạc, Giải tích, Đại số tuyến tính, Tiếng Anh chuyên ngành.
               - Năm 2 (Kỳ 3, 4): CS201 (Cấu trúc dữ liệu & giải thuật), CS301 (Cơ sở dữ liệu), Kiến trúc máy tính, Hệ điều hành.
               - Năm 3 (Kỳ 5, 6): CS401 (Web Fullstack - Spring Boot + ReactJS), CS402 (Software Engineering & Agile), AI101 (Trí tuệ nhân tạo), Mạng máy tính.
               - Năm 4 (Kỳ 7, 8): Thực tập tốt nghiệp doanh nghiệp (OJT - Pre-OJT), Đồ án tốt nghiệp / Khóa luận tốt nghiệp (Capstone Project).
            """;
    }

    public List<String> getDefaultSuggestions() {
        return List.of(
                "Một kỳ mình được đăng ký tối đa bao nhiêu tín chỉ?",
                "Mình bị trùng lịch học giữa 2 môn thì phải làm thế nào?",
                "Điều kiện tiên quyết để học môn CS401 Web Development là gì?",
                "Gợi ý lộ trình môn học cho sinh viên kỳ 4 ngành CNTT?",
                "Quy chế điểm chuyên cần và điều kiện được thi cuối kỳ?"
        );
    }
}
