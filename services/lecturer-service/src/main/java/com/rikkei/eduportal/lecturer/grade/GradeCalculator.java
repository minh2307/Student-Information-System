package com.rikkei.eduportal.lecturer.grade;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.List;

/**
 * Tính toán điểm số theo nghiệp vụ.
 * Class thuần (không phụ thuộc Spring context) — dễ unit test.
 *
 * Công thức:
 *   total = 10% * attendance + 30% * midterm + 60% * final  (làm tròn 2 chữ số HALF_UP)
 *   attendance_score = attendance_rate / 10
 *
 * Điểm chữ (hằng số riêng, dễ sửa):
 *   >= 9.0  → A+
 *   >= 8.5  → A
 *   >= 8.0  → B+
 *   >= 7.0  → B
 *   >= 5.5  → C
 *   >= 4.0  → D
 *   < 4.0   → F
 */
@Component
public class GradeCalculator {

    private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;
    private static final int SCALE = 2;

    // Threshold constants — sửa tại một chỗ duy nhất
    private static final BigDecimal THRESHOLD_A_PLUS  = new BigDecimal("9.0");
    private static final BigDecimal THRESHOLD_A       = new BigDecimal("8.5");
    private static final BigDecimal THRESHOLD_B_PLUS  = new BigDecimal("8.0");
    private static final BigDecimal THRESHOLD_B       = new BigDecimal("7.0");
    private static final BigDecimal THRESHOLD_C       = new BigDecimal("5.5");
    private static final BigDecimal THRESHOLD_D       = new BigDecimal("4.0");

    private static final BigDecimal W_ATTENDANCE = new BigDecimal("0.10");
    private static final BigDecimal W_MIDTERM    = new BigDecimal("0.30");
    private static final BigDecimal W_FINAL      = new BigDecimal("0.60");

    private static final BigDecimal ATTENDANCE_DIVISOR = new BigDecimal("10");

    /**
     * Chuyển attendance_rate (0-100) → attendance_score (0-10).
     */
    public BigDecimal attendanceScoreFromRate(BigDecimal attendanceRate) {
        if (attendanceRate == null) return null;
        return attendanceRate.divide(ATTENDANCE_DIVISOR, SCALE, ROUNDING);
    }

    /**
     * Tính total_score.
     * Trả về null nếu midterm hoặc final còn thiếu.
     *
     * @param attendanceScore điểm chuyên cần (0-10), có thể null → mặc định 0
     * @param midtermScore    điểm giữa kỳ   (0-10), null → chưa đủ điều kiện
     * @param finalScore      điểm cuối kỳ   (0-10), null → chưa đủ điều kiện
     */
    public BigDecimal calculateTotal(BigDecimal attendanceScore,
                                     BigDecimal midtermScore,
                                     BigDecimal finalScore) {
        if (midtermScore == null || finalScore == null) {
            return null;   // Chưa đủ điểm — không tính
        }

        BigDecimal att = attendanceScore != null ? attendanceScore : BigDecimal.ZERO;

        BigDecimal total = att.multiply(W_ATTENDANCE)
                .add(midtermScore.multiply(W_MIDTERM))
                .add(finalScore.multiply(W_FINAL))
                .setScale(SCALE, ROUNDING);

        return total;
    }

    /**
     * Chuyển total_score → letter grade.
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
     * Tính CGPA mới theo trung bình có trọng số tín chỉ.
     * Chỉ tính các môn đã có total_score != null.
     *
     * @param gradeCredits danh sách cặp (totalScore, credits)
     * @return CGPA (hệ 10, 2 chữ số), hoặc null nếu không có môn nào hợp lệ
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
     * Record đơn giản để truyền dữ liệu vào calculateCgpa.
     */
    public record GradeCredit(BigDecimal totalScore, int credits) {}
}
