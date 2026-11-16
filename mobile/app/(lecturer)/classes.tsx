/**
 * Lecturer Class Management & Student Roster Screen - REDS v2.0
 * Section management, student grades, grade locking, and academic early warnings.
 * Refactored to utilize REDS v2.0 Tokens, Shared Components & WCAG AA Compliance.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
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
import { tokens } from '@/theme';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { AppBadge } from '@/components/feedback/AppBadge';
import { AppEmptyState } from '@/components/feedback/AppEmptyState';
import { AppErrorState } from '@/components/feedback/AppErrorState';
import { AppLoadingSkeleton } from '@/components/feedback/AppLoadingSkeleton';
import { formatScore, formatPercentage, formatDayOfWeek, formatTime } from '@/utils/formatters';

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
          <Pressable
            style={styles.backButton}
            onPress={() => setSelectedSection(null)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Quay lại danh sách lớp"
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={styles.sectionHeaderTitles}>
            <AppText variant="bodyBold" style={styles.sectionHeaderCode}>
              {selectedSection.sectionCode}
            </AppText>
            <AppText variant="caption" style={styles.sectionHeaderSub} numberOfLines={1}>
              {selectedSection.courseName}
            </AppText>
          </View>
          <Pressable
            style={styles.qrHeaderBtn}
            onPress={() => router.push('/(lecturer)/attendance')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Điểm danh QR"
          >
            <Ionicons name="qr-code-outline" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* View Tabs: Students vs Early Warnings */}
        <View style={styles.subTabBar}>
          <Pressable
            style={[styles.subTabItem, activeTab === 'students' && styles.subTabItemActive]}
            onPress={() => setActiveTab('students')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'students' }}
          >
            <Ionicons
              name="people-outline"
              size={16}
              color={activeTab === 'students' ? tokens.brand.burgundy : tokens.text.muted}
            />
            <AppText
              variant="captionBold"
              style={[
                styles.subTabText,
                activeTab === 'students' ? styles.subTabTextActive : styles.subTabTextInactive,
              ]}
            >
              Sinh viên & Điểm ({students.length})
            </AppText>
          </Pressable>

          <Pressable
            style={[styles.subTabItem, activeTab === 'warnings' && styles.subTabItemActive]}
            onPress={() => setActiveTab('warnings')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'warnings' }}
          >
            <Ionicons
              name="warning-outline"
              size={16}
              color={activeTab === 'warnings' ? tokens.brand.burgundy : tokens.text.muted}
            />
            <AppText
              variant="captionBold"
              style={[
                styles.subTabText,
                activeTab === 'warnings' ? styles.subTabTextActive : styles.subTabTextInactive,
              ]}
            >
              Cảnh báo sớm {earlyWarnings?.criticalCount ? `(${earlyWarnings.criticalCount})` : ''}
            </AppText>
          </Pressable>
        </View>

        {/* TAB 1: STUDENTS & GRADES */}
        {activeTab === 'students' && (
          <ScrollView
            style={styles.listContainer}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isStudentsRefetching}
                onRefresh={() => {
                  void refetchStudents();
                }}
                tintColor={tokens.brand.burgundy}
                colors={[tokens.brand.burgundy]}
              />
            }
          >
            {/* Action Bar for Section */}
            <AppCard variant="outlined" style={styles.rosterActionBar}>
              <View>
                <AppText variant="captionBold" color="primary" style={styles.rosterSummaryText}>
                  Sĩ số: {students.length} SV | Tín chỉ: {selectedSection.credits}
                </AppText>
                <AppText variant="caption" color="secondary" style={styles.rosterStatusText}>
                  Trạng thái:{' '}
                  {students.every((s) => s.isLocked) ? (
                    <AppText variant="captionBold" color="secondary">
                      Đã chốt điểm
                    </AppText>
                  ) : (
                    <AppText variant="captionBold" style={{ color: tokens.semantic.success.dark }}>
                      Đang nhập điểm
                    </AppText>
                  )}
                </AppText>
              </View>

              {!students.every((s) => s.isLocked) && (
                <Pressable
                  style={({ pressed }) => [styles.lockGradesBtn, pressed && styles.btnPressed]}
                  onPress={handleLockGrades}
                  android_ripple={{ color: 'rgba(255, 255, 255, 0.25)', borderless: false }}
                  accessibilityRole="button"
                  accessibilityLabel="Chốt điểm"
                >
                  <Ionicons name="lock-closed-outline" size={14} color="#FFFFFF" />
                  <AppText variant="captionBold" style={styles.lockGradesBtnText}>
                    Chốt điểm
                  </AppText>
                </Pressable>
              )}
            </AppCard>

            {isStudentsLoading ? (
              <View style={styles.centerContainer} accessibilityLiveRegion="polite">
                <ActivityIndicator size="small" color={tokens.brand.burgundy} />
                <AppText variant="caption" color="muted" style={styles.loadingText}>
                  Đang tải danh sách sinh viên...
                </AppText>
              </View>
            ) : isStudentsError ? (
              <AppErrorState
                title="Không thể tải danh sách sinh viên"
                message={studentsError?.message || 'Lỗi truy xuất dữ liệu.'}
                onRetry={() => refetchStudents()}
                retryLabel="Thử lại"
              />
            ) : students.length === 0 ? (
              <AppEmptyState
                icon="people-outline"
                title="Chưa có sinh viên đăng ký"
                message="Lớp học phần này hiện chưa có sinh viên ở trạng thái REGISTERED."
              />
            ) : (
              students.map((student) => (
                <AppCard key={student.enrollmentId} variant="elevated" style={styles.studentCard}>
                  <View style={styles.studentHeader}>
                    <View style={styles.studentNameCol}>
                      <AppText variant="bodyBold" color="primary" style={styles.studentName}>
                        {student.fullName}
                      </AppText>
                      <AppText variant="caption" color="muted" style={styles.studentCode}>
                        {student.studentCode}
                      </AppText>
                    </View>

                    {student.isLocked ? (
                      <AppBadge label="Đã chốt" variant="neutral" size="sm" />
                    ) : (
                      <Pressable
                        style={styles.editBtn}
                        onPress={() => handleOpenEdit(student)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Sửa điểm cho ${student.fullName}`}
                      >
                        <Ionicons name="create-outline" size={16} color={tokens.brand.burgundy} />
                        <AppText variant="captionBold" style={styles.editBtnText}>
                          Sửa
                        </AppText>
                      </Pressable>
                    )}
                  </View>

                  <View style={styles.scoreGrid}>
                    <View style={styles.scoreItem}>
                      <AppText variant="caption" color="muted" style={styles.scoreLabel}>
                        Chuyên cần
                      </AppText>
                      <AppText variant="bodyBold" color="primary" style={styles.scoreValue}>
                        {student.attendanceRate != null ? `${student.attendanceRate}%` : '--'}
                      </AppText>
                    </View>
                    <View style={styles.scoreItem}>
                      <AppText variant="caption" color="muted" style={styles.scoreLabel}>
                        Giữa kỳ
                      </AppText>
                      <AppText variant="bodyBold" color="primary" style={styles.scoreValue}>
                        {formatScore(student.midtermScore)}
                      </AppText>
                    </View>
                    <View style={styles.scoreItem}>
                      <AppText variant="caption" color="muted" style={styles.scoreLabel}>
                        Cuối kỳ
                      </AppText>
                      <AppText variant="bodyBold" color="primary" style={styles.scoreValue}>
                        {formatScore(student.finalScore)}
                      </AppText>
                    </View>
                    <View style={styles.scoreItem}>
                      <AppText variant="caption" color="muted" style={styles.scoreLabel}>
                        Tổng kết
                      </AppText>
                      <AppText
                        variant="bodyBold"
                        style={[
                          styles.scoreValue,
                          {
                            color:
                              student.totalScore != null && student.totalScore < 4.0
                                ? tokens.semantic.error.dark
                                : tokens.text.primary,
                          },
                        ]}
                      >
                        {formatScore(student.totalScore)} ({student.letterGrade || '--'})
                      </AppText>
                    </View>
                  </View>
                </AppCard>
              ))
            )}
          </ScrollView>
        )}

        {/* TAB 2: EARLY WARNINGS */}
        {activeTab === 'warnings' && (
          <ScrollView
            style={styles.listContainer}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isWarningsRefetching}
                onRefresh={() => {
                  void refetchWarnings();
                }}
                tintColor={tokens.brand.burgundy}
                colors={[tokens.brand.burgundy]}
              />
            }
          >
            {isWarningsLoading ? (
              <View style={styles.centerContainer} accessibilityLiveRegion="polite">
                <ActivityIndicator size="small" color={tokens.brand.burgundy} />
                <AppText variant="caption" color="muted" style={styles.loadingText}>
                  Đang phân tích dữ liệu cảnh báo sớm...
                </AppText>
              </View>
            ) : isWarningsError ? (
              <AppErrorState
                title="Lỗi tải dữ liệu cảnh báo sớm"
                message="Không thể kết nối đến AI Early Warning Engine."
                onRetry={() => refetchWarnings()}
                retryLabel="Thử lại"
              />
            ) : !earlyWarnings || earlyWarnings.students.length === 0 ? (
              <AppEmptyState
                icon="checkmark-circle-outline"
                title="Lớp học an toàn"
                message="Tất cả sinh viên trong lớp đều có tỷ lệ chuyên cần tốt và kết quả học tập ổn định."
              />
            ) : (
              <>
                {/* Warning Summary Cards */}
                <View style={styles.warningMetricsRow}>
                  <AppCard variant="outlined" style={[styles.warningMetricCard, { backgroundColor: '#FEF2F2' }]}>
                    <AppText variant="h2" style={{ color: tokens.semantic.error.dark }}>
                      {earlyWarnings.criticalCount}
                    </AppText>
                    <AppText variant="caption" color="secondary">
                      Nguy cấp (Cấm thi)
                    </AppText>
                  </AppCard>

                  <AppCard variant="outlined" style={[styles.warningMetricCard, { backgroundColor: '#FFFBEB' }]}>
                    <AppText variant="h2" style={{ color: tokens.semantic.warning.dark }}>
                      {earlyWarnings.warningCount}
                    </AppText>
                    <AppText variant="caption" color="secondary">
                      Cần lưu ý
                    </AppText>
                  </AppCard>

                  <AppCard variant="outlined" style={[styles.warningMetricCard, { backgroundColor: '#ECFDF5' }]}>
                    <AppText variant="h2" style={{ color: tokens.semantic.success.dark }}>
                      {earlyWarnings.safeCount}
                    </AppText>
                    <AppText variant="caption" color="secondary">
                      An toàn
                    </AppText>
                  </AppCard>
                </View>

                {/* 1-touch Dispatch Action */}
                {earlyWarnings.criticalCount > 0 && (
                  <Pressable
                    style={({ pressed }) => [styles.dispatchBtn, pressed && styles.btnPressed]}
                    onPress={handleDispatchWarnings}
                    disabled={isDispatching}
                    android_ripple={{ color: 'rgba(255, 255, 255, 0.25)', borderless: false }}
                    accessibilityRole="button"
                    accessibilityLabel="Bắn cảnh báo học vụ 1-chạm"
                  >
                    <Ionicons name="notifications" size={16} color="#FFFFFF" />
                    <AppText variant="captionBold" style={styles.dispatchBtnText}>
                      {isDispatching ? 'Đang gửi thông báo...' : 'Bắn cảnh báo học vụ 1-chạm'}
                    </AppText>
                  </Pressable>
                )}

                {/* Risk Student Roster */}
                {earlyWarnings.students.map((risk) => (
                  <AppCard key={risk.studentId} variant="elevated" style={styles.riskCard}>
                    <View style={styles.riskHeader}>
                      <View style={{ flex: 1 }}>
                        <AppText variant="bodyBold" color="primary">
                          {risk.fullName} ({risk.studentCode})
                        </AppText>
                        <AppText variant="caption" color="secondary">
                          Vắng: {risk.absentSessions}/{risk.totalSessionsHeld} buổi (
                          {formatPercentage(risk.absenceRate)})
                        </AppText>
                      </View>
                      <AppBadge
                        label={risk.riskLevel === 'CRITICAL' ? 'Nguy cấp' : 'Cảnh báo'}
                        variant={risk.riskLevel === 'CRITICAL' ? 'error' : 'warning'}
                        size="sm"
                      />
                    </View>

                    {risk.riskReasons?.length ? (
                      <View style={styles.reasonsList}>
                        {risk.riskReasons.map((reason, idx) => (
                          <AppText key={idx} variant="caption" style={styles.reasonText}>
                            • {reason}
                          </AppText>
                        ))}
                      </View>
                    ) : null}
                  </AppCard>
                ))}
              </>
            )}
          </ScrollView>
        )}

        {/* Grade Edit Modal */}
        {editingStudent && (
          <Modal visible={!!editingStudent} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <AppText variant="h3" color="primary">
                    Nhập điểm sinh viên
                  </AppText>
                  <Pressable onPress={() => setEditingStudent(null)} hitSlop={10}>
                    <Ionicons name="close" size={22} color={tokens.text.primary} />
                  </Pressable>
                </View>

                <View style={styles.modalBody}>
                  <AppText variant="bodyBold" color="primary" style={styles.modalStudentName}>
                    {editingStudent.fullName}
                  </AppText>
                  <AppText variant="caption" color="secondary" style={styles.modalStudentCode}>
                    Mã SV: {editingStudent.studentCode} | Lớp: {selectedSection.sectionCode}
                  </AppText>

                  <View style={styles.inputGroup}>
                    <AppText variant="captionBold" color="secondary" style={styles.inputLabel}>
                      Tỷ lệ chuyên cần (%)
                    </AppText>
                    <TextInput
                      style={styles.modalInput}
                      value={editAttendanceRate}
                      onChangeText={setEditAttendanceRate}
                      keyboardType="numeric"
                      placeholder="100"
                      placeholderTextColor={tokens.text.placeholder}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <AppText variant="captionBold" color="secondary" style={styles.inputLabel}>
                      Điểm thi giữa kỳ (thang điểm 10)
                    </AppText>
                    <TextInput
                      style={styles.modalInput}
                      value={editMidterm}
                      onChangeText={setEditMidterm}
                      keyboardType="numeric"
                      placeholder="Nhập điểm giữa kỳ..."
                      placeholderTextColor={tokens.text.placeholder}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <AppText variant="captionBold" color="secondary" style={styles.inputLabel}>
                      Điểm thi cuối kỳ (thang điểm 10)
                    </AppText>
                    <TextInput
                      style={styles.modalInput}
                      value={editFinal}
                      onChangeText={setEditFinal}
                      keyboardType="numeric"
                      placeholder="Nhập điểm cuối kỳ..."
                      placeholderTextColor={tokens.text.placeholder}
                    />
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <Pressable
                    style={styles.modalCancelBtn}
                    onPress={() => setEditingStudent(null)}
                    accessibilityRole="button"
                  >
                    <AppText variant="captionBold" style={styles.modalCancelText}>
                      Hủy
                    </AppText>
                  </Pressable>
                  <Pressable
                    style={styles.modalSaveBtn}
                    onPress={handleSaveGrade}
                    accessibilityRole="button"
                  >
                    <AppText variant="captionBold" style={styles.modalSaveText}>
                      Lưu điểm
                    </AppText>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    );
  }

  // DEFAULT VIEW: LIST OF ASSIGNED CLASS SECTIONS
  return (
    <View style={styles.container}>
      {/* Search Bar (Touch target >= 48dp) */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={tokens.text.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo mã lớp, tên môn học..."
            placeholderTextColor={tokens.text.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={tokens.text.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Main List of Class Sections */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isClassesRefetching}
            onRefresh={() => {
              void refetchClasses();
            }}
            tintColor={tokens.brand.burgundy}
            colors={[tokens.brand.burgundy]}
          />
        }
      >
        <View style={styles.headerInfo}>
          <AppText variant="captionBold" color="primary" style={styles.summaryTitle}>
            Các lớp được phân công ({filteredClasses.length})
          </AppText>
        </View>

        {isClassesLoading ? (
          <View style={styles.centerContainer} accessibilityLiveRegion="polite">
            <ActivityIndicator size="small" color={tokens.brand.burgundy} />
            <AppText variant="caption" color="muted" style={styles.loadingText}>
              Đang tải danh sách lớp học phần...
            </AppText>
          </View>
        ) : isClassesError ? (
          <AppErrorState
            title="Không thể tải danh sách lớp"
            message={classesError?.message || 'Lỗi truy xuất dữ liệu từ máy chủ.'}
            onRetry={() => refetchClasses()}
            retryLabel="Thử lại"
          />
        ) : filteredClasses.length === 0 ? (
          <AppEmptyState
            icon="book-outline"
            title="Không tìm thấy lớp học phần"
            message={
              searchQuery
                ? `Không có lớp nào phù hợp với từ khóa "${searchQuery}".`
                : 'Thầy/Cô hiện chưa được phân công lớp học phần nào trong học kỳ này.'
            }
          />
        ) : (
          filteredClasses.map((item) => (
            <AppCard key={item.sectionId} variant="elevated" style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionCodePill}>
                  <AppText variant="captionBold" style={styles.sectionCodePillText}>
                    {item.sectionCode}
                  </AppText>
                </View>
                <AppBadge
                  label={item.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                  variant={item.status === 'OPEN' ? 'success' : 'warning'}
                  size="sm"
                />
              </View>

              <AppText variant="bodyBold" color="primary" numberOfLines={2} style={styles.sectionCourseName}>
                {item.courseName}
              </AppText>
              <AppText variant="caption" color="secondary" style={styles.sectionMetaDetails}>
                Mã môn: {item.courseCode} | {item.credits} tín chỉ | Học kỳ: {item.semesterName}
              </AppText>

              <View style={styles.divider} />

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={15} color={tokens.brand.burgundy} />
                  <AppText variant="caption" color="secondary">
                    {formatDayOfWeek(item.dayOfWeek)} ({formatTime(item.startTime)} - {formatTime(item.endTime)})
                  </AppText>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={15} color={tokens.text.muted} />
                  <AppText variant="caption" color="secondary">
                    Phòng: {item.roomName}
                  </AppText>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.enrolledBox}>
                  <Ionicons name="people-outline" size={15} color={tokens.text.muted} />
                  <AppText variant="caption" color="secondary" style={styles.enrolledText}>
                    {item.currentEnrolled}/{item.maxCapacity} sinh viên
                  </AppText>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.viewDetailBtn, pressed && styles.btnPressed]}
                  onPress={() => setSelectedSection(item)}
                  android_ripple={{ color: 'rgba(255, 255, 255, 0.25)', borderless: false }}
                  accessibilityRole="button"
                  accessibilityLabel={`Xem chi tiết ${item.sectionCode}`}
                >
                  <AppText variant="captionBold" style={styles.viewDetailText}>
                    Xem chi tiết
                  </AppText>
                  <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                </Pressable>
              </View>
            </AppCard>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.surface.canvas,
  },
  searchContainer: {
    backgroundColor: tokens.surface.card,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.default,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.surface.canvas,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.default,
    paddingHorizontal: tokens.spacing.md,
    minHeight: 48, // Touch target >= 48dp
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: tokens.text.primary,
    marginLeft: tokens.spacing.xs,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xxxl,
    paddingTop: tokens.spacing.sm,
  },
  headerInfo: {
    marginBottom: tokens.spacing.sm,
  },
  summaryTitle: {
    fontSize: 13,
  },
  centerContainer: {
    paddingVertical: tokens.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: tokens.spacing.sm,
  },
  sectionCard: {
    marginBottom: tokens.spacing.sm,
    padding: tokens.spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  sectionCodePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
  },
  sectionCodePillText: {
    color: '#1D4ED8',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  sectionCourseName: {
    marginTop: 2,
  },
  sectionMetaDetails: {
    marginTop: 2,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: tokens.border.default,
    marginVertical: tokens.spacing.sm,
  },
  metaRow: {
    gap: 4,
    marginBottom: tokens.spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: tokens.border.subtle,
    paddingTop: tokens.spacing.sm,
  },
  enrolledBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  enrolledText: {
    fontSize: 12,
  },
  viewDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: tokens.brand.burgundy,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    minHeight: 48, // Touch target >= 48dp
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.85,
  },
  viewDetailText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  sectionHeaderBar: {
    backgroundColor: tokens.brand.burgundy,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  backButton: {
    padding: 6,
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderTitles: {
    flex: 1,
  },
  sectionHeaderCode: {
    color: '#FFFFFF',
  },
  sectionHeaderSub: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  qrHeaderBtn: {
    padding: 6,
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: tokens.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.default,
  },
  subTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: tokens.spacing.sm,
    minHeight: 48, // Touch target >= 48dp
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabItemActive: {
    borderBottomColor: tokens.brand.burgundy,
  },
  subTabText: {
    fontSize: 12,
  },
  subTabTextActive: {
    color: tokens.brand.burgundy,
  },
  subTabTextInactive: {
    color: tokens.text.muted,
  },
  rosterActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: tokens.spacing.sm,
    marginBottom: tokens.spacing.sm,
  },
  rosterSummaryText: {
    fontSize: 12,
  },
  rosterStatusText: {
    fontSize: 11,
    marginTop: 2,
  },
  lockGradesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: tokens.brand.burgundy,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    minHeight: 48, // Touch target >= 48dp
    justifyContent: 'center',
  },
  lockGradesBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  studentCard: {
    marginBottom: tokens.spacing.sm,
    padding: tokens.spacing.sm,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  studentNameCol: {
    flex: 1,
  },
  studentName: {
    fontSize: 13,
  },
  studentCode: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    minHeight: 48, // Touch target >= 48dp
    justifyContent: 'center',
  },
  editBtnText: {
    color: tokens.brand.burgundy,
    fontSize: 11,
  },
  scoreGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: tokens.border.subtle,
    paddingTop: tokens.spacing.xs,
  },
  scoreItem: {
    flex: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 10,
  },
  scoreValue: {
    fontSize: 12,
    marginTop: 1,
  },
  warningMetricsRow: {
    flexDirection: 'row',
    gap: tokens.spacing.xs,
    marginBottom: tokens.spacing.sm,
  },
  warningMetricCard: {
    flex: 1,
    padding: tokens.spacing.sm,
    alignItems: 'center',
  },
  dispatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.xs,
    backgroundColor: tokens.semantic.error.dark,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.spacing.md,
    minHeight: 48, // Touch target >= 48dp
  },
  dispatchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  riskCard: {
    marginBottom: tokens.spacing.sm,
    padding: tokens.spacing.sm,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reasonsList: {
    marginTop: tokens.spacing.xs,
    paddingTop: tokens.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: tokens.border.subtle,
  },
  reasonText: {
    fontSize: 11,
    color: tokens.semantic.error.dark,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: tokens.surface.card,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    ...tokens.elevation.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.default,
    paddingBottom: tokens.spacing.xs,
  },
  modalBody: {
    marginBottom: tokens.spacing.lg,
  },
  modalStudentName: {
    fontSize: 14,
  },
  modalStudentCode: {
    fontSize: 11,
    marginBottom: tokens.spacing.md,
  },
  inputGroup: {
    marginBottom: tokens.spacing.sm,
  },
  inputLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: tokens.surface.canvas,
    borderWidth: 1,
    borderColor: tokens.border.default,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    minHeight: 48, // Touch target >= 48dp
    fontSize: 13,
    color: tokens.text.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // Touch target >= 48dp
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.default,
    backgroundColor: tokens.surface.canvas,
  },
  modalCancelText: {
    color: tokens.text.primary,
  },
  modalSaveBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // Touch target >= 48dp
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.brand.burgundy,
  },
  modalSaveText: {
    color: '#FFFFFF',
  },
});
