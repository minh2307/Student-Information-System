import assert from 'node:assert';

const BASE_URL = 'http://localhost:8080/api/v1';

async function run() {
  console.log('🚀 Bắt đầu kiểm thử tính năng Excel Import/Export & Conflict Detection...');

  // 1. Login Admin
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: '123456' }),
  });
  assert.strictEqual(loginRes.status, 200, 'Admin login failed');
  const loginJson = await loginRes.json();
  const token = loginJson.data?.accessToken;
  assert.ok(token, 'Missing access token');
  console.log('✅ 1. Admin login thành công, token:', token.slice(0, 20) + '...');

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 2. Query exam schedules
  const examsRes = await fetch(`${BASE_URL}/admin/exam-schedules?semester=2024-25_SEM2`, { headers });
  assert.strictEqual(examsRes.status, 200, 'Fetch exams failed');
  const examsJson = await examsRes.json();
  const examList = examsJson.data || [];
  console.log(`✅ 2. Lấy danh sách lịch thi thành công: ${examList.length} ca thi`);
  assert.ok(examList.length > 0, 'No exams found');

  // Check sectionCode mapping
  const firstExam = examList[0];
  console.log(`   Ca thi mẫu: Lớp ${firstExam.sectionCode}, Môn ${firstExam.courseName}, Ngày ${firstExam.examDate}, Phòng ${firstExam.roomName}`);

  // 3. Test Batch Import Exam Schedules
  const batchExamPayload = [
    {
      sectionCode: firstExam.sectionCode,
      examDate: '2026-12-15',
      startTime: '08:00',
      endTime: '09:30',
      roomName: 'LAB-505',
      examType: 'THI MÁY',
      notes: 'Thi thử nghiệm import Excel',
    },
  ];

  const batchExamRes = await fetch(`${BASE_URL}/admin/exam-schedules/batch?overwrite=true`, {
    method: 'POST',
    headers,
    body: JSON.stringify(batchExamPayload),
  });
  assert.strictEqual(batchExamRes.status, 200, 'Batch exam import failed');
  const batchExamJson = await batchExamRes.json();
  assert.strictEqual(batchExamJson.data?.successCount, 1, 'Expected 1 success');
  console.log('✅ 3. Batch import lịch thi thành công: đã cập nhật ca thi lớp', firstExam.sectionCode);

  // 4. Test Batch Import Users (1 Student, 1 Lecturer)
  const randomSuffix = Date.now().toString().slice(-4);
  const studentUser = `sv_test_${randomSuffix}`;
  const lecturerUser = `gv_test_${randomSuffix}`;
  const studentCode = `SV99${randomSuffix}`;
  const lecturerCode = `GV99${randomSuffix}`;

  const batchUserPayload = [
    {
      username: studentUser,
      fullName: `Sinh Viên Kiểm Thử ${randomSuffix}`,
      email: `${studentUser}@rikkei.edu.vn`,
      password: 'password123',
      role: 'STUDENT',
      studentCode: studentCode,
      major: 'Công nghệ thông tin',
    },
    {
      username: lecturerUser,
      fullName: `Giảng Viên Kiểm Thử ${randomSuffix}`,
      email: `${lecturerUser}@rikkei.edu.vn`,
      password: 'password123',
      role: 'LECTURER',
      lecturerCode: lecturerCode,
      department: 'Khoa CNTT',
      degree: 'Tiến sĩ',
    },
  ];

  const batchUserRes = await fetch(`${BASE_URL}/admin/users/batch`, {
    method: 'POST',
    headers,
    body: JSON.stringify(batchUserPayload),
  });
  assert.strictEqual(batchUserRes.status, 200, 'Batch user import failed');
  const batchUserJson = await batchUserRes.json();
  assert.strictEqual(batchUserJson.data?.total, 2, 'Total users should be 2');
  assert.strictEqual(batchUserJson.data?.successCount, 2, 'Success count should be 2');
  assert.strictEqual(batchUserJson.data?.failureCount, 0, 'Failure count should be 0');
  console.log('✅ 4. Batch import tài khoản thành công: đã tạo 1 Sinh viên và 1 Giảng viên');

  // Verify created user IDs for cleanup
  const createdIds = batchUserJson.data?.createdUsers?.map((u) => u.user.id) || [];

  // 5. Test Duplicate User Handling
  const dupPayload = [
    {
      username: studentUser, // Duplicate
      fullName: 'Trùng Tên',
      email: `${studentUser}@rikkei.edu.vn`,
      role: 'STUDENT',
      studentCode: studentCode,
      major: 'CNTT',
    },
  ];
  const dupRes = await fetch(`${BASE_URL}/admin/users/batch`, {
    method: 'POST',
    headers,
    body: JSON.stringify(dupPayload),
  });
  const dupJson = await dupRes.json();
  assert.strictEqual(dupJson.data?.failureCount, 1, 'Should fail for duplicate user');
  assert.ok(dupJson.data?.errors?.length > 0, 'Should have error message for duplicate');
  console.log('✅ 5. Xử lý trùng lặp trong file Excel chuẩn xác:', dupJson.data.errors[0]);

  // 6. Cleanup test users
  for (const id of createdIds) {
    const delRes = await fetch(`${BASE_URL}/admin/users/${id}`, {
      method: 'DELETE',
      headers,
    });
    assert.strictEqual(delRes.status, 200, `Delete user ${id} failed`);
  }
  console.log(`✅ 6. Dọn dẹp ${createdIds.length} tài khoản kiểm thử thành công`);

  // 7. Test Batch Import Courses
  const testCourseCode1 = `CS_T1_${randomSuffix}`;
  const testCourseCode2 = `CS_T2_${randomSuffix}`;
  const batchCoursePayload = [
    {
      courseCode: testCourseCode1,
      name: `Môn Học Nền Tảng ${randomSuffix}`,
      credits: 3,
      weeklyHours: 4,
      syllabusDescription: 'Học phần cơ bản',
    },
    {
      courseCode: testCourseCode2,
      name: `Môn Học Nâng Cao ${randomSuffix}`,
      credits: 4,
      weeklyHours: 5,
      prerequisiteCourseCode: testCourseCode1,
      syllabusDescription: 'Học phần nâng cao có môn tiên quyết',
    },
  ];

  const batchCourseRes = await fetch(`${BASE_URL}/admin/courses/batch`, {
    method: 'POST',
    headers,
    body: JSON.stringify(batchCoursePayload),
  });
  assert.strictEqual(batchCourseRes.status, 200, 'Batch course import failed');
  const batchCourseJson = await batchCourseRes.json();
  assert.strictEqual(batchCourseJson.data?.total, 2, 'Total courses should be 2');
  assert.strictEqual(batchCourseJson.data?.successCount, 2, 'Success courses count should be 2');
  console.log('✅ 7. Batch import môn học thành công: tạo 2 môn kèm môn tiên quyết theo mã môn');

  const createdCourses = batchCourseJson.data?.successfulItems || [];

  // 8. Test Batch Import Class Sections
  // Query a lecturer to use
  const lecturersRes = await fetch(`${BASE_URL}/admin/lecturers`, { headers });
  const lecturersJson = await lecturersRes.json();
  const sampleLecturer = lecturersJson.data?.[0];
  assert.ok(sampleLecturer?.lecturerCode, 'Need an existing lecturer to assign class');

  const testSectionCode = `SEC_${randomSuffix}_01`;
  const batchSectionPayload = [
    {
      sectionCode: testSectionCode,
      courseCode: testCourseCode1,
      lecturerCode: sampleLecturer.lecturerCode,
      semesterName: '2024-25_SEM2',
      dayOfWeek: 'THU',
      startTime: '08:00:00',
      endTime: '09:30:00',
      roomName: `ROOM_TEST_${randomSuffix}`,
      maxCapacity: 40,
    },
  ];

  const batchSectionRes = await fetch(`${BASE_URL}/admin/class-sections/batch`, {
    method: 'POST',
    headers,
    body: JSON.stringify(batchSectionPayload),
  });
  assert.strictEqual(batchSectionRes.status, 200, 'Batch class section import failed');
  const batchSectionJson = await batchSectionRes.json();
  assert.strictEqual(batchSectionJson.data?.total, 1, 'Total sections should be 1');
  assert.strictEqual(batchSectionJson.data?.successCount, 1, 'Success section count should be 1');
  console.log('✅ 8. Batch import lớp học phần thành công: liên kết môn học và giảng viên bằng mã code');

  const createdSections = batchSectionJson.data?.successfulItems || [];

  // 9. Test Conflict Detection in Class Section Batch Import (Room Conflict)
  const conflictPayload = [
    {
      sectionCode: `SEC_${randomSuffix}_02`,
      courseCode: testCourseCode2,
      lecturerCode: sampleLecturer.lecturerCode,
      semesterName: '2024-25_SEM2',
      dayOfWeek: 'THU',
      startTime: '08:00:00', // Trùng giờ và phòng với testSectionCode
      endTime: '09:30:00',
      roomName: `ROOM_TEST_${randomSuffix}`,
      maxCapacity: 40,
    },
  ];
  const conflictRes = await fetch(`${BASE_URL}/admin/class-sections/batch`, {
    method: 'POST',
    headers,
    body: JSON.stringify(conflictPayload),
  });
  const conflictJson = await conflictRes.json();
  assert.strictEqual(conflictJson.data?.failureCount, 1, 'Should fail due to room/lecturer conflict');
  assert.ok(conflictJson.data?.errors?.length > 0, 'Should return conflict error details');
  console.log('✅ 9. Kiểm tra phát hiện xung đột trùng phòng/lịch khi import lớp học phần:', conflictJson.data.errors[0]);

  // 10. Cleanup test section and courses
  for (const sec of createdSections) {
    await fetch(`${BASE_URL}/admin/class-sections/${sec.id}`, { method: 'DELETE', headers });
  }
  for (const c of [...createdCourses].reverse()) {
    await fetch(`${BASE_URL}/admin/courses/${c.id}`, { method: 'DELETE', headers });
  }
  console.log(`✅ 10. Dọn dẹp ${createdSections.length} lớp học phần và ${createdCourses.length} môn học kiểm thử thành công`);

  console.log('\n🎉 TOÀN BỘ CÁC BƯỚC KIỂM THỬ EXCEL BATCH & QUẢN TRỊ ĐỀU PASS 100%!');
}

run().catch((err) => {
  console.error('❌ Kiểm thử thất bại:', err);
  process.exit(1);
});
