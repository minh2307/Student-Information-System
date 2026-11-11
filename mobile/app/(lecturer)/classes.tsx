/**
 * Lecturer Class Management & Student Roster Screen
 * Section management, student grades, grade locking, and academic early warnings.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  useLecturerClasses,
  useClassStudents,
  useUpdateAttendance,
  useUpdateGrade,
  useLockGrades,
  useSectionRisks,
  useDispatchWarnings,
  LecturerClassSection,
  StudentGrade,
} from '@/features/lecturer';
import { colors, spacing, typography, radius } from '@/theme';
import { formatScore, formatPercentage } from '@/utils/formatters';

export default function LecturerClassesScreen() {
  const router = useRouter();

  // Search & Selected section state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<LecturerClassSection | null>(null);
  const [activeTab, setActiveTab] = useState<'students' | 'warnings'>('students');

  // Grade Edit Modal state
  const [editingStudent, setEditingStudent] = useState<StudentGrade | null>(null);
  const [editAttendanceRate, setEditAttendanceRate] = useState('');
  const [editMidterm, setEditMidterm] = useState('');
  const [editFinal, setEditFinal] = useState('');

  // 1-touch early warning dispatch state
  const [isDispatching, setIsDispatching] = useState(false);

  // Queries
  const {
    data: classes = [],
    isLoading: isClassesLoading,
    isError: isClassesError,
    error: classesError,
    refetch: refetchClasses,
    isRefetching: isClassesRefetching,
  } = useLecturerClasses();

  const sectionId = selectedSection?.sectionId ?? 0;

  const {
    data: students = [],
    isLoading: isStudentsLoading,
    isError: isStudentsError,
    error: studentsError,
    refetch: refetchStudents,
    isRefetching: isStudentsRefetching,
  } = useClassStudents(sectionId, !!selectedSection);

  const {
    data: earlyWarnings,
    isLoading: isWarningsLoading,
    isError: isWarningsError,
    refetch: refetchWarnings,
    isRefetching: isWarningsRefetching,
  } = useSectionRisks(sectionId, !!selectedSection && activeTab === 'warnings');

  // Mutations
  const updateAttendanceMutation = useUpdateAttendance();
  const updateGradeMutation = useUpdateGrade();
  const lockGradesMutation = useLockGrades();
  const dispatchWarningsMutation = useDispatchWarnings();

  // Filtered class list
  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return classes;
    const q = searchQuery.toLowerCase();
    return classes.filter(
      (c) =>
        c.sectionCode.toLowerCase().includes(q) ||
        c.courseName.toLowerCase().includes(q) ||
        c.courseCode.toLowerCase().includes(q)
    );
  }, [classes, searchQuery]);

  // Open Edit Grade Dialog
  const handleOpenEdit = (student: StudentGrade) => {
    if (student.isLocked) {
      Alert.alert('Điểm đã khóa', 'Điểm của lớp này đã được chốt, không thể chỉnh sửa.');
      return;
    }
    setEditingStudent(student);
    setEditAttendanceRate(student.attendanceRate != null ? String(student.attendanceRate) : '100');
    setEditMidterm(student.midtermScore != null ? String(student.midtermScore) : '');
    setEditFinal(student.finalScore != null ? String(student.finalScore) : '');
  };

  // Submit Grade Update
  const handleSaveGrade = async () => {
    if (!editingStudent || !selectedSection) return;

    try {
      // 1. Update attendance if provided
      const attRateNum = parseFloat(editAttendanceRate);
      if (!isNaN(attRateNum)) {
        await updateAttendanceMutation.mutateAsync({
          enrollmentId: editingStudent.enrollmentId,
          sectionId: selectedSection.sectionId,
          request: { attendanceRate: attRateNum },
        });
      }

      // 2. Update scores if provided
      const midNum = editMidterm.trim() ? parseFloat(editMidterm) : undefined;
      const finNum = editFinal.trim() ? parseFloat(editFinal) : undefined;

      await updateGradeMutation.mutateAsync({
        enrollmentId: editingStudent.enrollmentId,
        sectionId: selectedSection.sectionId,
        request: {
          midtermScore: midNum,
          finalScore: finNum,
        },
      });

      Alert.alert('Thành công', 'Đã cập nhật điểm số cho sinh viên.');
      setEditingStudent(null);
      refetchStudents();
    } catch (err: any) {
      Alert.alert('Lỗi cập nhật', err?.message || 'Không thể cập nhật điểm số.');
    }
  };

  // Lock grades for the section
  const handleLockGrades = () => {
    if (!selectedSection) return;

    Alert.alert(
      'Chốt điểm toàn bộ lớp',
      `Thầy/Cô có chắc chắn muốn chốt điểm cho lớp ${selectedSection.sectionCode}? Sau khi chốt, điểm số sẽ bị khóa và không thể thay đổi.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Chốt điểm',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await lockGradesMutation.mutateAsync(selectedSection.sectionId);
              Alert.alert('Thành công', res.message || 'Đã chốt điểm thành công cho toàn bộ sinh viên.');
              refetchStudents();
              refetchClasses();
            } catch (err: any) {
              Alert.alert('Lỗi chốt điểm', err?.message || 'Không thể chốt điểm. Vui lòng đảm bảo mọi SV đã có đủ điểm.');
            }
          },
        },
      ]
    );
  };

  // 1-touch Early Warning Dispatch
  const handleDispatchWarnings = () => {
    if (!selectedSection || !earlyWarnings || earlyWarnings.criticalCount === 0) {
      Alert.alert('Thông báo', 'Không có sinh viên nào trong diện nguy cấp cần cảnh báo.');
      return;
    }

    const criticalStudentIds = earlyWarnings.students
      .filter((s) => s.riskLevel === 'CRITICAL')
      .map((s) => s.studentId);

    Alert.alert(
      'Bắn cảnh báo học vụ sớm (1-chạm)',
      `Phát hiện ${criticalStudentIds.length} sinh viên nguy cấp (vắng > 20% hoặc điểm < 4.0). Gửi thông báo nhắc nhở ngay đến sinh viên?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Bắn thông báo',
          style: 'default',
          onPress: async () => {
            try {
              setIsDispatching(true);
              const res = await dispatchWarningsMutation.mutateAsync({
                sectionId: selectedSection.sectionId,
                studentIds: criticalStudentIds,
                customMessage: 'Cảnh báo học vụ: Sinh viên có nguy cơ cấm thi hoặc điểm thấp.',
              });
              Alert.alert('Thành công', res.message || `Đã gửi cảnh báo tới ${res.sentCount} sinh viên.`);
              refetchWarnings();
            } catch (err: any) {
              Alert.alert('Lỗi', err?.message || 'Không thể bắn cảnh báo.');
            } finally {
              setIsDispatching(false);
            }
          },
        },
      ]
    );
  };

  // If a class section is selected, render the Section Detail & Student List view
  if (selectedSection) {
    return (
      <View style={styles.container}>
        {/* Section Top Header */}
        <View style={styles.sectionHeaderBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedSection(null)}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={colors.neutral[0]} />
          </TouchableOpacity>
          <View style={styles.sectionHeaderTitles}>
            <Text style={styles.sectionHeaderCode}>{selectedSection.sectionCode}</Text>
            <Text style={styles.sectionHeaderSub} numberOfLines={1}>
              {selectedSection.courseName}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.qrHeaderBtn}
            onPress={() => router.push('/(lecturer)/attendance')}
            activeOpacity={0.7}
          >
            <Ionicons name="qr-code-outline" size={20} color={colors.neutral[0]} />
          </TouchableOpacity>
        </View>

        {/* View Tabs: Students vs Early Warnings */}
        <View style={styles.subTabBar}>
          <TouchableOpacity
            style={[styles.subTabItem, activeTab === 'students' && styles.subTabItemActive]}
            onPress={() => setActiveTab('students')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="people-outline"
              size={16}
              color={activeTab === 'students' ? colors.primary[900] : colors.neutral[500]}
            />
            <Text
              style={[
                styles.subTabText,
                activeTab === 'students' && styles.subTabTextActive,
              ]}
            >
              Sinh viên & Điểm ({students.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTabItem, activeTab === 'warnings' && styles.subTabItemActive]}
            onPress={() => setActiveTab('warnings')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="warning-outline"
              size={16}
              color={activeTab === 'warnings' ? colors.primary[900] : colors.neutral[500]}
            />
            <Text
              style={[
                styles.subTabText,
                activeTab === 'warnings' && styles.subTabTextActive,
              ]}
            >
              Cảnh báo sớm {earlyWarnings?.criticalCount ? `(${earlyWarnings.criticalCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: STUDENTS & GRADES */}
        {activeTab === 'students' && (
          <ScrollView
            style={styles.listContainer}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isStudentsRefetching}
                onRefresh={() => {
                  void refetchStudents();
                }}
                tintColor={colors.primary[800]}
              />
            }
          >
            {/* Action Bar for Section */}
            <View style={styles.rosterActionBar}>
              <View>
                <Text style={styles.rosterSummaryText}>
                  Sĩ số: {students.length} SV | Tín chỉ: {selectedSection.credits}
                </Text>
                <Text style={styles.rosterStatusText}>
                  Trạng thái:{' '}
                  {students.every((s) => s.isLocked) ? (
                    <Text style={{ color: colors.neutral[600], fontWeight: 'bold' }}>
                      Đã chốt điểm
                    </Text>
                  ) : (
                    <Text style={{ color: colors.success.dark, fontWeight: 'bold' }}>
                      Đang nhập điểm
                    </Text>
                  )}
                </Text>
              </View>

              {!students.every((s) => s.isLocked) && (
                <TouchableOpacity
                  style={styles.lockGradesBtn}
                  onPress={handleLockGrades}
                  activeOpacity={0.8}
                >
                  <Ionicons name="lock-closed-outline" size={14} color={colors.neutral[0]} />
                  <Text style={styles.lockGradesBtnText}>Chốt điểm</Text>
                </TouchableOpacity>
              )}
            </View>

            {isStudentsLoading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary[800]} />
                <Text style={styles.loadingText}>Đang tải danh sách sinh viên...</Text>
              </View>
            ) : isStudentsError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={32} color={colors.error.main} />
                <Text style={styles.errorTitle}>Không thể tải danh sách sinh viên</Text>
                <Text style={styles.errorSubtitle}>
                  {studentsError?.message || 'Lỗi truy xuất dữ liệu.'}
                </Text>
              </View>
            ) : students.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={40} color={colors.neutral[400]} />
                <Text style={styles.emptyTitle}>Chưa có sinh viên đăng ký</Text>
                <Text style={styles.emptySubtitle}>
                  Lớp học phần này hiện chưa có sinh viên ở trạng thái REGISTERED.
                </Text>
              </View>
            ) : (
              students.map((student) => (
                <View key={student.enrollmentId} style={styles.studentCard}>
                  <View style={styles.studentCardHeader}>
                    <View>
                      <Text style={styles.studentName}>{student.fullName}</Text>
                      <Text style={styles.studentCode}>MSSV: {student.studentCode}</Text>
                    </View>
                    <View style={styles.studentHeaderRight}>
                      {student.letterGrade && (
                        <View style={styles.gradeBadge}>
                          <Text style={styles.gradeBadgeText}>{student.letterGrade}</Text>
                        </View>
                      )}
                      {!student.isLocked && (
                        <TouchableOpacity
                          style={styles.editScoreBtn}
                          onPress={() => handleOpenEdit(student)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="create-outline" size={16} color={colors.primary[800]} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={styles.scoresGrid}>
                    <View style={styles.scoreItem}>
                      <Text style={styles.scoreLabel}>Chuyên cần</Text>
                      <Text style={styles.scoreValue}>
                        {formatPercentage(student.attendanceRate)}
                      </Text>
                    </View>
                    <View style={styles.scoreItem}>
                      <Text style={styles.scoreLabel}>Giữa kỳ</Text>
                      <Text style={styles.scoreValue}>
                        {formatScore(student.midtermScore)}
                      </Text>
                    </View>
                    <View style={styles.scoreItem}>
                      <Text style={styles.scoreLabel}>Cuối kỳ</Text>
                      <Text style={styles.scoreValue}>
                        {formatScore(student.finalScore)}
                      </Text>
                    </View>
                    <View style={styles.scoreItem}>
                      <Text style={styles.scoreLabel}>Tổng kết</Text>
                      <Text style={[styles.scoreValue, { color: colors.primary[900], fontWeight: 'bold' }]}>
                        {formatScore(student.totalScore)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* TAB 2: EARLY WARNINGS */}
        {activeTab === 'warnings' && (
          <ScrollView
            style={styles.listContainer}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isWarningsRefetching}
                onRefresh={() => {
                  void refetchWarnings();
                }}
                tintColor={colors.primary[800]}
              />
            }
          >
            {isWarningsLoading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary[800]} />
                <Text style={styles.loadingText}>Đang đánh giá rủi ro học vụ...</Text>
              </View>
            ) : isWarningsError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={32} color={colors.error.main} />
                <Text style={styles.errorTitle}>Không thể tải báo cáo cảnh báo</Text>
              </View>
            ) : !earlyWarnings ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="shield-checkmark-outline" size={40} color={colors.success.dark} />
                <Text style={styles.emptyTitle}>Lớp học an toàn</Text>
              </View>
            ) : (
              <View>
                {/* Warning Stats Cards */}
                <View style={styles.warningStatsGrid}>
                  <View style={[styles.warningStatCard, { borderColor: colors.error.main }]}>
                    <Text style={[styles.warningStatNum, { color: colors.error.dark }]}>
                      {earlyWarnings.criticalCount}
                    </Text>
                    <Text style={styles.warningStatLabel}>Nguy cấp (Cấm thi/Trượt)</Text>
                  </View>
                  <View style={[styles.warningStatCard, { borderColor: colors.warning.dark }]}>
                    <Text style={[styles.warningStatNum, { color: colors.warning.dark }]}>
                      {earlyWarnings.warningCount}
                    </Text>
                    <Text style={styles.warningStatLabel}>Cần chú ý</Text>
                  </View>
                  <View style={[styles.warningStatCard, { borderColor: colors.success.dark }]}>
                    <Text style={[styles.warningStatNum, { color: colors.success.dark }]}>
                      {earlyWarnings.safeCount}
                    </Text>
                    <Text style={styles.warningStatLabel}>An toàn</Text>
                  </View>
                </View>

                {/* 1-touch Dispatch Button */}
                {earlyWarnings.criticalCount > 0 && (
                  <TouchableOpacity
                    style={styles.dispatchBtn}
                    onPress={handleDispatchWarnings}
                    disabled={isDispatching}
                    activeOpacity={0.8}
                  >
                    {isDispatching ? (
                      <ActivityIndicator size="small" color={colors.neutral[0]} />
                    ) : (
                      <>
                        <Ionicons name="megaphone-outline" size={18} color={colors.neutral[0]} />
                        <Text style={styles.dispatchBtnText}>
                          Bắn cảnh báo học vụ 1-chạm ({earlyWarnings.criticalCount} SV)
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {/* Summary Evaluation */}
                {earlyWarnings.evaluationSummary && (
                  <View style={styles.evalBox}>
                    <Ionicons name="information-circle" size={18} color={colors.neutral[700]} />
                    <Text style={styles.evalText}>{earlyWarnings.evaluationSummary}</Text>
                  </View>
                )}

                {/* High Risk Students List */}
                <Text style={styles.riskListTitle}>Danh sách sinh viên nguy cơ</Text>

                {earlyWarnings.students.filter((s) => s.riskLevel !== 'SAFE').length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="checkmark-circle" size={40} color={colors.success.dark} />
                    <Text style={styles.emptyTitle}>Tất cả sinh viên đều an toàn</Text>
                  </View>
                ) : (
                  earlyWarnings.students
                    .filter((s) => s.riskLevel !== 'SAFE')
                    .map((s) => (
                      <View key={s.studentId} style={styles.riskCard}>
                        <View style={styles.riskHeader}>
                          <View>
                            <Text style={styles.riskStudentName}>{s.fullName}</Text>
                            <Text style={styles.riskStudentCode}>MSSV: {s.studentCode}</Text>
                          </View>
                          <View
                            style={[
                              styles.riskLevelBadge,
                              s.riskLevel === 'CRITICAL'
                                ? styles.riskLevelCritical
                                : styles.riskLevelWarning,
                            ]}
                          >
                            <Text
                              style={[
                                styles.riskLevelText,
                                s.riskLevel === 'CRITICAL'
                                  ? styles.riskLevelTextCritical
                                  : styles.riskLevelTextWarning,
                              ]}
                            >
                              {s.riskLevel === 'CRITICAL' ? 'NGUY CẤP' : 'CẢNH BÁO'}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.absenceRateText}>
                          Tỷ lệ vắng:{' '}
                          <Text style={{ fontWeight: 'bold', color: colors.error.dark }}>
                            {Math.round(s.absenceRate * 100)}%
                          </Text>{' '}
                          ({s.absentSessions}/{s.totalSessionsHeld} buổi)
                        </Text>

                        {s.riskReasons?.map((reason, idx) => (
                          <View key={idx} style={styles.reasonRow}>
                            <Ionicons name="alert-circle" size={14} color={colors.error.main} />
                            <Text style={styles.reasonText}>{reason}</Text>
                          </View>
                        ))}

                        {s.suggestions?.map((sug, idx) => (
                          <View key={idx} style={styles.sugRow}>
                            <Ionicons name="bulb-outline" size={14} color={colors.warning.dark} />
                            <Text style={styles.sugText}>{sug}</Text>
                          </View>
                        ))}
                      </View>
                    ))
                )}
              </View>
            )}
          </ScrollView>
        )}

        {/* Edit Grade Modal */}
        {editingStudent && (
          <Modal visible={!!editingStudent} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Nhập điểm sinh viên</Text>
                  <TouchableOpacity onPress={() => setEditingStudent(null)}>
                    <Ionicons name="close" size={22} color={colors.neutral[700]} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalStudentInfo}>
                  {editingStudent.fullName} ({editingStudent.studentCode})
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tỷ lệ chuyên cần (%) (0 - 100)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editAttendanceRate}
                    onChangeText={setEditAttendanceRate}
                    keyboardType="numeric"
                    placeholder="e.g. 95"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Điểm thi giữa kỳ (thang 10)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editMidterm}
                    onChangeText={setEditMidterm}
                    keyboardType="numeric"
                    placeholder="e.g. 8.5"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Điểm thi cuối kỳ (thang 10)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editFinal}
                    onChangeText={setEditFinal}
                    keyboardType="numeric"
                    placeholder="e.g. 9.0"
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setEditingStudent(null)}
                  >
                    <Text style={styles.modalCancelText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalSaveBtn}
                    onPress={handleSaveGrade}
                  >
                    <Text style={styles.modalSaveText}>Lưu điểm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    );
  }

  // DEFAULT: Render Class List
  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo mã lớp, tên môn học..."
            placeholderTextColor={colors.neutral[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.neutral[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Class List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isClassesRefetching}
            onRefresh={() => {
              void refetchClasses();
            }}
            tintColor={colors.primary[800]}
          />
        }
      >
        <Text style={styles.listHeaderTitle}>
          Các lớp được phân công ({filteredClasses.length})
        </Text>

        {isClassesLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary[800]} />
            <Text style={styles.loadingText}>Đang tải danh sách lớp học phần...</Text>
          </View>
        ) : isClassesError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={36} color={colors.error.main} />
            <Text style={styles.errorTitle}>Không thể tải danh sách lớp</Text>
            <Text style={styles.errorSubtitle}>
              {classesError?.message || 'Lỗi kết nối máy chủ.'}
            </Text>
          </View>
        ) : filteredClasses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={48} color={colors.neutral[400]} />
            <Text style={styles.emptyTitle}>Không tìm thấy lớp học phần</Text>
            <Text style={styles.emptySubtitle}>
              Thầy/Cô không có lớp nào phù hợp với từ khóa tìm kiếm.
            </Text>
          </View>
        ) : (
          filteredClasses.map((c) => (
            <TouchableOpacity
              key={c.sectionId}
              style={styles.classCard}
              onPress={() => setSelectedSection(c)}
              activeOpacity={0.7}
            >
              <View style={styles.classCardTop}>
                <View style={styles.codeBadge}>
                  <Text style={styles.codeText}>{c.sectionCode}</Text>
                </View>
                <View
                  style={[
                    styles.statusTag,
                    c.status === 'OPEN' ? styles.statusTagOpen : styles.statusTagClosed,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusTagText,
                      c.status === 'OPEN'
                        ? styles.statusTagTextOpen
                        : styles.statusTagTextClosed,
                    ]}
                  >
                    {c.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                  </Text>
                </View>
              </View>

              <Text style={styles.className}>{c.courseName}</Text>
              <Text style={styles.classSub}>
                Mã môn: {c.courseCode} | {c.credits} tín chỉ | Học kỳ: {c.semesterName}
              </Text>

              <View style={styles.divider} />

              <View style={styles.classCardBottom}>
                <View style={styles.bottomMeta}>
                  <Ionicons name="people-outline" size={16} color={colors.neutral[600]} />
                  <Text style={styles.bottomMetaText}>
                    Sĩ số: {c.currentEnrolled}/{c.maxCapacity} SV
                  </Text>
                </View>
                <View style={styles.enterSectionRow}>
                  <Text style={styles.enterSectionText}>Xem chi tiết & Điểm</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary[800]} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[100],
  },
  searchBarContainer: {
    backgroundColor: colors.neutral[0],
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 42,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.xs,
    fontSize: typography.sizes.xs,
    color: colors.neutral[900],
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  listHeaderTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral[600],
    marginBottom: spacing.sm,
  },
  centerContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginTop: spacing.xs,
  },
  errorContainer: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error.light,
  },
  errorTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.error.dark,
    marginTop: spacing.xs,
  },
  errorSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: 4,
  },
  emptyContainer: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  emptyTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[800],
    marginTop: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: 4,
  },
  classCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  classCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  codeBadge: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  codeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary[900],
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusTagOpen: {
    backgroundColor: colors.success.light + '25',
  },
  statusTagClosed: {
    backgroundColor: colors.neutral[200],
  },
  statusTagText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
  },
  statusTagTextOpen: {
    color: colors.success.dark,
  },
  statusTagTextClosed: {
    color: colors.neutral[600],
  },
  className: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    marginTop: 2,
  },
  classSub: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[500],
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: spacing.sm,
  },
  classCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bottomMetaText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
  },
  enterSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  enterSectionText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary[800],
  },
  sectionHeaderBar: {
    backgroundColor: colors.primary[900],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    padding: 6,
    marginRight: spacing.xs,
  },
  sectionHeaderTitles: {
    flex: 1,
  },
  sectionHeaderCode: {
    color: colors.neutral[0],
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  sectionHeaderSub: {
    color: colors.neutral[200],
    fontSize: typography.sizes.xxs,
  },
  qrHeaderBtn: {
    padding: 6,
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  subTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabItemActive: {
    borderBottomColor: colors.primary[900],
  },
  subTabText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    fontWeight: typography.weights.medium,
  },
  subTabTextActive: {
    color: colors.primary[900],
    fontWeight: typography.weights.bold,
  },
  rosterActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.neutral[0],
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  rosterSummaryText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[700],
  },
  rosterStatusText: {
    fontSize: typography.sizes.xxs,
    marginTop: 2,
  },
  lockGradesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary[800],
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  lockGradesBtnText: {
    color: colors.neutral[0],
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
  },
  studentCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  studentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  studentName: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  studentCode: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[500],
  },
  studentHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  gradeBadge: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  gradeBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary[900],
  },
  editScoreBtn: {
    padding: 6,
    backgroundColor: colors.neutral[100],
    borderRadius: radius.sm,
  },
  scoresGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[50],
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[500],
  },
  scoreValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semiBold,
    color: colors.neutral[800],
    marginTop: 2,
  },
  warningStatsGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  warningStatCard: {
    flex: 1,
    backgroundColor: colors.neutral[0],
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  warningStatNum: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  warningStatLabel: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: 2,
  },
  dispatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.error.main,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  dispatchBtnText: {
    color: colors.neutral[0],
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  evalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.neutral[200],
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  evalText: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[800],
    flex: 1,
  },
  riskListTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral[700],
    marginBottom: spacing.sm,
  },
  riskCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  riskStudentName: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  riskStudentCode: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[500],
  },
  riskLevelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  riskLevelCritical: {
    backgroundColor: colors.error.light + '25',
  },
  riskLevelWarning: {
    backgroundColor: colors.warning.light + '30',
  },
  riskLevelText: {
    fontSize: typography.sizes.xxs,
    fontWeight: typography.weights.bold,
  },
  riskLevelTextCritical: {
    color: colors.error.dark,
  },
  riskLevelTextWarning: {
    color: colors.warning.dark,
  },
  absenceRateText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[700],
    marginBottom: spacing.xs,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  reasonText: {
    fontSize: typography.sizes.xxs,
    color: colors.error.dark,
    flex: 1,
  },
  sugRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  sugText: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[600],
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalContent: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  modalStudentInfo: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.sm,
  },
  inputLabel: {
    fontSize: typography.sizes.xxs,
    color: colors.neutral[600],
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: typography.sizes.xs,
    color: colors.neutral[900],
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalCancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  modalCancelText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
  },
  modalSaveBtn: {
    backgroundColor: colors.primary[800],
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  modalSaveText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral[0],
  },
});
