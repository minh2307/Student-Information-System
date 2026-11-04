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
 * [TASK-D03-LUONG] Test Suite: Chuẩn Hóa Công Thức Tính CGPA & Điểm Hệ 10, Hệ 4 theo tỷ lệ 10% - 40% - 50%.
 */
@DisplayName("Test Suite: GradeCalculator (10% - 40% - 50% Weights & Scale 4.0)")
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
    // calculateTotal — Chuẩn hoá tỷ lệ 10% - 40% - 50%
    // =========================================================================

    @Nested
    @DisplayName("calculateTotal — Multi-weight (10% Attendance, 40% Midterm, 50% Final)")
    class TotalScoreTests {

        @Test
        @DisplayName("Chuẩn F-10: att=9.5, mid=8.5, final=8.8 → 8.75 (9.5*0.1 + 8.5*0.4 + 8.8*0.5)")
        void standardScenario() {
            // 9.5*0.1 + 8.5*0.4 + 8.8*0.5 = 0.95 + 3.40 + 4.40 = 8.75
            BigDecimal total = calc.calculateTotal(
                    new BigDecimal("9.5"),
                    new BigDecimal("8.5"),
                    new BigDecimal("8.8"));
            assertThat(total).isEqualByComparingTo(new BigDecimal("8.75"));
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
        @DisplayName("Null attendance → xử lý như 0 điểm chuyên cần: 0*0.1 + 8.0*0.4 + 8.0*0.5 = 7.20")
        void nullAttendance() {
            // 0*0.1 + 8.0*0.4 + 8.0*0.5 = 0 + 3.20 + 4.00 = 7.20
            BigDecimal total = calc.calculateTotal(null, new BigDecimal("8.0"), new BigDecimal("8.0"));
            assertThat(total).isEqualByComparingTo(new BigDecimal("7.20"));
        }

        @Test
        @DisplayName("Làm tròn HALF_UP chuẩn: att=10, mid=7.5, final=7.5 → 7.75")
        void roundingHalfUp() {
            // 10*0.1 + 7.5*0.4 + 7.5*0.5 = 1.0 + 3.00 + 3.75 = 7.75
            BigDecimal total = calc.calculateTotal(
                    new BigDecimal("10"),
                    new BigDecimal("7.5"),
                    new BigDecimal("7.5"));
            assertThat(total).isEqualByComparingTo(new BigDecimal("7.75"));
        }

        @Test
        @DisplayName("Cả 3 điểm tối đa 10.0 → Total = 10.00")
        void allMaxScores() {
            BigDecimal total = calc.calculateTotal(
                    new BigDecimal("10"),
                    new BigDecimal("10"),
                    new BigDecimal("10"));
            assertThat(total).isEqualByComparingTo(new BigDecimal("10.00"));
        }

        @Test
        @DisplayName("Điểm thành phần biên qua môn: att=4.0, mid=4.0, final=4.0 → 4.00")
        void boundaryPassingScores() {
            BigDecimal total = calc.calculateTotal(
                    new BigDecimal("4.0"),
                    new BigDecimal("4.0"),
                    new BigDecimal("4.0"));
            assertThat(total).isEqualByComparingTo(new BigDecimal("4.00"));
        }
    }

    // =========================================================================
    // Thang điểm hệ 4 (Scale 4.0) & calculateTotalScale4
    // =========================================================================

    @Nested
    @DisplayName("calculateTotalScale4 & Scale 4.0 Conversion")
    class Scale4Tests {

        @Test
        @DisplayName("calculateTotalScale4: att=9.5, mid=8.5, final=8.8 → Total10=8.75 (A) → 3.70")
        void totalScale4_GradeA() {
            BigDecimal gpa4 = calc.calculateTotalScale4(
                    new BigDecimal("9.5"),
                    new BigDecimal("8.5"),
                    new BigDecimal("8.8"));
            assertThat(gpa4).isEqualByComparingTo(new BigDecimal("3.70"));
        }

        @Test
        @DisplayName("calculateTotalScale4: att=10.0, mid=9.5, final=9.0 → Total10=9.30 (A+) → 4.00")
        void totalScale4_GradeAPlus() {
            // 10*0.1 + 9.5*0.4 + 9.0*0.5 = 1.0 + 3.8 + 4.5 = 9.30 -> A+ -> 4.00
            BigDecimal gpa4 = calc.calculateTotalScale4(
                    new BigDecimal("10.0"),
                    new BigDecimal("9.5"),
                    new BigDecimal("9.0"));
            assertThat(gpa4).isEqualByComparingTo(new BigDecimal("4.00"));
        }

        @Test
        @DisplayName("calculateTotalScale4: Điểm liệt F (Total10 < 4.0) → 0.00")
        void totalScale4_GradeF() {
            // 2.0*0.1 + 3.0*0.4 + 3.5*0.5 = 0.2 + 1.2 + 1.75 = 3.15 -> F -> 0.00
            BigDecimal gpa4 = calc.calculateTotalScale4(
                    new BigDecimal("2.0"),
                    new BigDecimal("3.0"),
                    new BigDecimal("3.5"));
            assertThat(gpa4).isEqualByComparingTo(new BigDecimal("0.00"));
        }

        @ParameterizedTest(name = "Điểm hệ 10: {0} → Thang 4: {1}")
        @CsvSource({
                "9.50, 4.00",
                "9.00, 4.00",
                "8.75, 3.70",
                "8.50, 3.70",
                "8.20, 3.50",
                "8.00, 3.50",
                "7.50, 3.00",
                "7.00, 3.00",
                "6.00, 2.00",
                "5.50, 2.00",
                "4.50, 1.00",
                "4.00, 1.00",
                "3.99, 0.00",
                "1.50, 0.00"
        })
        void convertScale10To4_Boundaries(String score10Str, String expectedGpa4Str) {
            BigDecimal score10 = new BigDecimal(score10Str.trim());
            BigDecimal expectedGpa4 = new BigDecimal(expectedGpa4Str.trim());
            assertThat(calc.convertScale10To4(score10)).isEqualByComparingTo(expectedGpa4);
        }

        @ParameterizedTest(name = "Điểm chữ: {0} → Thang 4: {1}")
        @CsvSource({
                "A+, 4.00",
                "A,  3.70",
                "B+, 3.50",
                "B,  3.00",
                "C,  2.00",
                "D,  1.00",
                "F,  0.00"
        })
        void letterGradeToGpa4_Mapping(String letter, String expectedGpa4Str) {
            BigDecimal expectedGpa4 = new BigDecimal(expectedGpa4Str.trim());
            assertThat(calc.letterGradeToGpa4(letter)).isEqualByComparingTo(expectedGpa4);
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
    // calculateCgpa (Hệ 10) & calculateCgpa4 (Hệ 4)
    // =========================================================================

    @Nested
    @DisplayName("calculateCgpa (Hệ 10) & calculateCgpa4 (Hệ 4)")
    class CgpaTests {

        @Test
        @DisplayName("Tính CGPA Hệ 10 theo trung bình có trọng số tín chỉ")
        void cgpaScale10_WeightedByCredits() {
            // (8.50 * 3 + 8.80 * 3 + 8.92 * 3) / 9 = 78.66 / 9 = 8.74
            List<GradeCalculator.GradeCredit> credits = List.of(
                    new GradeCalculator.GradeCredit(new BigDecimal("8.50"), 3),
                    new GradeCalculator.GradeCredit(new BigDecimal("8.80"), 3),
                    new GradeCalculator.GradeCredit(new BigDecimal("8.92"), 3)
            );
            BigDecimal cgpa = calc.calculateCgpa(credits);
            assertThat(cgpa).isEqualByComparingTo(new BigDecimal("8.74"));
        }

        @Test
        @DisplayName("Tính CGPA Hệ 4: Quy đổi từng môn sang hệ 4 rồi tính trung bình có trọng số")
        void cgpaScale4_WeightedByCredits() {
            // Môn 1: 9.20 (A+ -> 4.00) * 3 TC = 12.00
            // Môn 2: 8.60 (A  -> 3.70) * 3 TC = 11.10
            // Môn 3: 7.50 (B  -> 3.00) * 4 TC = 12.00
            // Tổng: (12.00 + 11.10 + 12.00) / (3 + 3 + 4) = 35.10 / 10 = 3.51
            List<GradeCalculator.GradeCredit> credits = List.of(
                    new GradeCalculator.GradeCredit(new BigDecimal("9.20"), 3),
                    new GradeCalculator.GradeCredit(new BigDecimal("8.60"), 3),
                    new GradeCalculator.GradeCredit(new BigDecimal("7.50"), 4)
            );
            BigDecimal cgpa4 = calc.calculateCgpa4(credits);
            assertThat(cgpa4).isEqualByComparingTo(new BigDecimal("3.51"));
        }

        @Test
        @DisplayName("Danh sách rỗng → null cả hệ 10 và hệ 4")
        void emptyCgpa() {
            assertThat(calc.calculateCgpa(List.of())).isNull();
            assertThat(calc.calculateCgpa4(List.of())).isNull();
        }

        @Test
        @DisplayName("Tất cả null totalScore → null")
        void allNullTotal() {
            List<GradeCalculator.GradeCredit> credits = List.of(
                    new GradeCalculator.GradeCredit(null, 3)
            );
            assertThat(calc.calculateCgpa(credits)).isNull();
            assertThat(calc.calculateCgpa4(credits)).isNull();
        }
    }
}
