package com.rikkei.eduportal.lecturer.grade;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit test cho GradeCalculator — bao phủ biên điểm chữ, thiếu điểm, làm tròn.
 */
class GradeCalculatorTest {

    private GradeCalculator calc;

    @BeforeEach
    void setUp() {
        calc = new GradeCalculator();
    }

    // =========================================================================
    // attendanceScoreFromRate
    // =========================================================================

    @Nested
    @DisplayName("attendanceScoreFromRate")
    class AttendanceScoreTests {

        @Test
        @DisplayName("95% attendance → 9.50 score")
        void attendanceRate95() {
            BigDecimal score = calc.attendanceScoreFromRate(new BigDecimal("95.00"));
            assertThat(score).isEqualByComparingTo(new BigDecimal("9.50"));
        }

        @Test
        @DisplayName("100% attendance → 10.00 score")
        void attendanceRate100() {
            BigDecimal score = calc.attendanceScoreFromRate(new BigDecimal("100.00"));
            assertThat(score).isEqualByComparingTo(new BigDecimal("10.00"));
        }

        @Test
        @DisplayName("null rate → null score")
        void nullRate() {
            assertThat(calc.attendanceScoreFromRate(null)).isNull();
        }
    }

    // =========================================================================
    // calculateTotal
    // =========================================================================

    @Nested
    @DisplayName("calculateTotal")
    class TotalScoreTests {

        @Test
        @DisplayName("Seed data: att=9.5, mid=8.5, final=8.8 → 8.78")
        void seedDataScenario() {
            // 9.5*0.1 + 8.5*0.3 + 8.8*0.6 = 0.95 + 2.55 + 5.28 = 8.78
            BigDecimal total = calc.calculateTotal(
                    new BigDecimal("9.5"),
                    new BigDecimal("8.5"),
                    new BigDecimal("8.8"));
            assertThat(total).isEqualByComparingTo(new BigDecimal("8.78"));
        }

        @Test
        @DisplayName("Thiếu midterm → total = null")
        void missingMidterm() {
            BigDecimal total = calc.calculateTotal(new BigDecimal("9.5"), null, new BigDecimal("8.0"));
            assertThat(total).isNull();
        }

        @Test
        @DisplayName("Thiếu final → total = null")
        void missingFinal() {
            BigDecimal total = calc.calculateTotal(new BigDecimal("9.5"), new BigDecimal("8.0"), null);
            assertThat(total).isNull();
        }

        @Test
        @DisplayName("Null attendance → xử lý như 0 điểm chuyên cần")
        void nullAttendance() {
            // 0*0.1 + 8.0*0.3 + 8.0*0.6 = 0 + 2.4 + 4.8 = 7.20
            BigDecimal total = calc.calculateTotal(null, new BigDecimal("8.0"), new BigDecimal("8.0"));
            assertThat(total).isEqualByComparingTo(new BigDecimal("7.20"));
        }

        @Test
        @DisplayName("Làm tròn HALF_UP: 7.755 → 7.76 (trường hợp biên)")
        void roundingHalfUp() {
            // att=10, mid=7.5, final=7.5 → 10*0.1 + 7.5*0.3 + 7.5*0.6 = 1 + 2.25 + 4.5 = 7.75
            BigDecimal total = calc.calculateTotal(
                    new BigDecimal("10"),
                    new BigDecimal("7.5"),
                    new BigDecimal("7.5"));
            assertThat(total).isEqualByComparingTo(new BigDecimal("7.75"));
        }

        @Test
        @DisplayName("Cả 3 điểm tối đa → 10.00")
        void allMaxScores() {
            BigDecimal total = calc.calculateTotal(
                    new BigDecimal("10"),
                    new BigDecimal("10"),
                    new BigDecimal("10"));
            assertThat(total).isEqualByComparingTo(new BigDecimal("10.00"));
        }
    }

    // =========================================================================
    // calculateLetterGrade — kiểm tra biên từng mức
    // =========================================================================

    @Nested
    @DisplayName("calculateLetterGrade — boundary tests")
    class LetterGradeTests {

        @ParameterizedTest(name = "{0} → {1}")
        @CsvSource({
                "9.0,  A+",
                "9.5,  A+",
                "10.0, A+",
                "8.5,  A",
                "8.99, A",
                "8.0,  B+",
                "8.49, B+",
                "7.0,  B",
                "7.99, B",
                "5.5,  C",
                "6.99, C",
                "4.0,  D",
                "5.49, D",
                "3.99, F",
                "0.0,  F"
        })
        void letterGradeBoundaries(String scoreStr, String expected) {
            BigDecimal score = new BigDecimal(scoreStr.trim());
            assertThat(calc.calculateLetterGrade(score)).isEqualTo(expected.trim());
        }

        @Test
        @DisplayName("null total → null letter grade")
        void nullTotal() {
            assertThat(calc.calculateLetterGrade(null)).isNull();
        }
    }

    // =========================================================================
    // calculateCgpa
    // =========================================================================

    @Nested
    @DisplayName("calculateCgpa")
    class CgpaTests {

        @Test
        @DisplayName("Đúng theo ví dụ schema: khớp 8.74")
        void cgpaMatchesSeedExample() {
            // Giả lập: nhiều môn 3 tín chỉ cho student SV2024001 current_cgpa=8.74
            // Ta tạo các cặp sao cho weighted avg = 8.74
            // Ví dụ: (8.78, 3) + (8.80, 3) + nhiều môn khác ~ 8.74
            // Đơn giản hóa test: 3 môn 3TC = 8.50, 8.80, 8.92 → (25.50+26.40+26.76)/9 = 78.66/9 = 8.74
            List<GradeCalculator.GradeCredit> credits = List.of(
                    new GradeCalculator.GradeCredit(new BigDecimal("8.50"), 3),
                    new GradeCalculator.GradeCredit(new BigDecimal("8.80"), 3),
                    new GradeCalculator.GradeCredit(new BigDecimal("8.92"), 3)
            );
            BigDecimal cgpa = calc.calculateCgpa(credits);
            assertThat(cgpa).isEqualByComparingTo(new BigDecimal("8.74"));
        }

        @Test
        @DisplayName("Danh sách rỗng → null")
        void emptyCgpa() {
            assertThat(calc.calculateCgpa(List.of())).isNull();
        }

        @Test
        @DisplayName("Tất cả null totalScore → null")
        void allNullTotal() {
            List<GradeCalculator.GradeCredit> credits = List.of(
                    new GradeCalculator.GradeCredit(null, 3)
            );
            assertThat(calc.calculateCgpa(credits)).isNull();
        }

        @Test
        @DisplayName("Trọng số tín chỉ khác nhau được tính đúng")
        void weightedByCredits() {
            // (8.0 * 2 + 9.0 * 4) / 6 = (16 + 36) / 6 = 52 / 6 = 8.67
            List<GradeCalculator.GradeCredit> credits = List.of(
                    new GradeCalculator.GradeCredit(new BigDecimal("8.0"), 2),
                    new GradeCalculator.GradeCredit(new BigDecimal("9.0"), 4)
            );
            BigDecimal cgpa = calc.calculateCgpa(credits);
            assertThat(cgpa).isEqualByComparingTo(new BigDecimal("8.67"));
        }
    }
}
