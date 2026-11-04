package com.rikkei.eduportal.lecturer.grade;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * [TASK-D03-LUONG] Công cụ tính toán điểm số chuẩn hoá & Quy đổi GPA/CGPA.
 *
 * Chuẩn công thức trọng số đào tạo tín chỉ theo F-10 SRS:
 *   Total Score (Hệ 10) = 10% * attendance + 40% * midterm + 50% * final (làm tròn 2 chữ số HALF_UP)
 *   attendance_score    = attendance_rate / 10
 *
 * Thang điểm chữ và quy đổi Hệ 4 chuẩn Đào tạo Tín chỉ (MOET):
 *   >= 9.0  → A+  (Hệ 4: 4.00)
 *   >= 8.5  → A   (Hệ 4: 3.70)
 *   >= 8.0  → B+  (Hệ 4: 3.50)
 *   >= 7.0  → B   (Hệ 4: 3.00)
 *   >= 5.5  → C   (Hệ 4: 2.00)
 *   >= 4.0  → D   (Hệ 4: 1.00)
 *   < 4.0   → F   (Hệ 4: 0.00)
 */
@Component
public class GradeCalculator {

    private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;
    private static final int SCALE = 2;

    // Threshold constants — Điểm chữ hệ 10
    private static final BigDecimal THRESHOLD_A_PLUS  = new BigDecimal("9.0");
    private static final BigDecimal THRESHOLD_A       = new BigDecimal("8.5");
    private static final BigDecimal THRESHOLD_B_PLUS  = new BigDecimal("8.0");
    private static final BigDecimal THRESHOLD_B       = new BigDecimal("7.0");
    private static final BigDecimal THRESHOLD_C       = new BigDecimal("5.5");
    private static final BigDecimal THRESHOLD_D       = new BigDecimal("4.0");

    // Điểm hệ 4 tương ứng
    public static final BigDecimal GPA4_A_PLUS = new BigDecimal("4.00");
    public static final BigDecimal GPA4_A      = new BigDecimal("3.70");
    public static final BigDecimal GPA4_B_PLUS = new BigDecimal("3.50");
    public static final BigDecimal GPA4_B      = new BigDecimal("3.00");
    public static final BigDecimal GPA4_C      = new BigDecimal("2.00");
    public static final BigDecimal GPA4_D      = new BigDecimal("1.00");
    public static final BigDecimal GPA4_F      = new BigDecimal("0.00");

    // Tỷ lệ trọng số chuẩn hoá: 10% - 40% - 50%
    public static final BigDecimal W_ATTENDANCE = new BigDecimal("0.10");
    public static final BigDecimal W_MIDTERM    = new BigDecimal("0.40");
    public static final BigDecimal W_FINAL      = new BigDecimal("0.50");

    private static final BigDecimal ATTENDANCE_DIVISOR = new BigDecimal("10");

    /**
     * Chuyển attendance_rate (0-100) → attendance_score (0-10).
     */
    public BigDecimal attendanceScoreFromRate(BigDecimal attendanceRate) {
        if (attendanceRate == null) return null;
        return attendanceRate.divide(ATTENDANCE_DIVISOR, SCALE, ROUNDING);
    }

    /**
     * Tính điểm tổng kết hệ 10 theo tỷ lệ 10% - 40% - 50%.
     * Trả về null nếu midterm hoặc final còn thiếu.
     *
     * @param attendanceScore điểm chuyên cần (0-10), null → mặc định 0
     * @param midtermScore    điểm giữa kỳ (0-10), null → chưa đủ điều kiện
     * @param finalScore      điểm cuối kỳ (0-10), null → chưa đủ điều kiện
     * @return Điểm tổng kết hệ 10 (làm tròn 2 chữ số thập phân HALF_UP)
     */
    public BigDecimal calculateTotal(BigDecimal attendanceScore,
                                     BigDecimal midtermScore,
                                     BigDecimal finalScore) {
        if (midtermScore == null || finalScore == null) {
            return null;   // Chưa đủ điểm thành phần — không tính
        }

        BigDecimal att = attendanceScore != null ? attendanceScore : BigDecimal.ZERO;

        return att.multiply(W_ATTENDANCE)
                .add(midtermScore.multiply(W_MIDTERM))
                .add(finalScore.multiply(W_FINAL))
                .setScale(SCALE, ROUNDING);
    }

    /**
     * Tính điểm tổng kết quy đổi sang hệ 4 theo tỷ lệ 10% - 40% - 50%.
     *
     * @param attendanceScore điểm chuyên cần (0-10)
     * @param midtermScore    điểm giữa kỳ (0-10)
     * @param finalScore      điểm cuối kỳ (0-10)
     * @return Điểm tổng kết hệ 4 (0.00 - 4.00)
     */
    public BigDecimal calculateTotalScale4(BigDecimal attendanceScore,
                                           BigDecimal midtermScore,
                                           BigDecimal finalScore) {
        BigDecimal total10 = calculateTotal(attendanceScore, midtermScore, finalScore);
        return convertScale10To4(total10);
    }

    /**
     * Chuyển total_score (hệ 10) → letter grade.
     * Trả về null nếu total là null.
     */
    public String calculateLetterGrade(BigDecimal total) {
        if (total == null) return null;

        if (total.compareTo(THRESHOLD_A_PLUS) >= 0)  return "A+";
        if (total.compareTo(THRESHOLD_A) >= 0)        return "A";
        if (total.compareTo(THRESHOLD_B_PLUS) >= 0)   return "B+";
        if (total.compareTo(THRESHOLD_B) >= 0)         return "B";
        if (total.compareTo(THRESHOLD_C) >= 0)         return "C";
        if (total.compareTo(THRESHOLD_D) >= 0)         return "D";
        return "F";
    }

    /**
     * Quy đổi điểm chữ (Letter Grade) → Thang điểm 4 (GPA 4.0).
     */
    public BigDecimal letterGradeToGpa4(String letterGrade) {
        if (letterGrade == null || letterGrade.isBlank()) return null;

        return switch (letterGrade.trim().toUpperCase()) {
            case "A+" -> GPA4_A_PLUS;
            case "A"  -> GPA4_A;
            case "B+" -> GPA4_B_PLUS;
            case "B"  -> GPA4_B;
            case "C+", "C" -> GPA4_C;
            case "D+", "D" -> GPA4_D;
            case "F"  -> GPA4_F;
            default   -> null;
        };
    }

    /**
     * Quy đổi điểm tổng kết hệ 10 sang thang điểm 4 theo chuẩn tín chỉ MOET.
     */
    public BigDecimal convertScale10To4(BigDecimal totalScore10) {
        if (totalScore10 == null) return null;
        String letter = calculateLetterGrade(totalScore10);
        return letterGradeToGpa4(letter);
    }

    /**
     * Tính CGPA mới theo trung bình có trọng số tín chỉ (Hệ 10).
     * Chỉ tính các môn đã có total_score != null.
     *
     * @param gradeCredits danh sách cặp (totalScore, credits)
     * @return CGPA hệ 10 (2 chữ số thập phân), hoặc null nếu không có môn nào hợp lệ
     */
    public BigDecimal calculateCgpa(List<GradeCredit> gradeCredits) {
        if (gradeCredits == null || gradeCredits.isEmpty()) return null;

        BigDecimal totalWeighted = BigDecimal.ZERO;
        int totalCredits = 0;

        for (GradeCredit gc : gradeCredits) {
            if (gc.totalScore() != null && gc.credits() > 0) {
                totalWeighted = totalWeighted.add(
                        gc.totalScore().multiply(BigDecimal.valueOf(gc.credits()))
                );
                totalCredits += gc.credits();
            }
        }

        if (totalCredits == 0) return null;

        return totalWeighted.divide(BigDecimal.valueOf(totalCredits), SCALE, ROUNDING);
    }

    /**
     * Tính CGPA mới theo trung bình có trọng số tín chỉ (Hệ 4).
     * Tự động quy đổi điểm tổng kết hệ 10 của từng môn sang hệ 4 trước khi tính trọng số.
     *
     * @param gradeCredits danh sách cặp (totalScore hệ 10, credits)
     * @return CGPA hệ 4 (0.00 - 4.00, 2 chữ số thập phân)
     */
    public BigDecimal calculateCgpa4(List<GradeCredit> gradeCredits) {
        if (gradeCredits == null || gradeCredits.isEmpty()) return null;

        BigDecimal totalWeighted = BigDecimal.ZERO;
        int totalCredits = 0;

        for (GradeCredit gc : gradeCredits) {
            if (gc.totalScore() != null && gc.credits() > 0) {
                BigDecimal gpa4 = convertScale10To4(gc.totalScore());
                if (gpa4 != null) {
                    totalWeighted = totalWeighted.add(
                            gpa4.multiply(BigDecimal.valueOf(gc.credits()))
                    );
                    totalCredits += gc.credits();
                }
            }
        }

        if (totalCredits == 0) return null;

        return totalWeighted.divide(BigDecimal.valueOf(totalCredits), SCALE, ROUNDING);
    }

    /**
     * Record đại diện cho cặp dữ liệu (điểm tổng kết môn, số tín chỉ).
     */
    public record GradeCredit(BigDecimal totalScore, int credits) {}
}
