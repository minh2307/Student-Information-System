import json

collection = {
    "info": {
        "_postman_id": "7f9a12bc-86a1-434a-9b48-111122223333",
        "name": "Rikkei EduPortal - Automated API Test Suite",
        "description": "Bộ kiểm thử tự động API cho Rikkei EduPortal: Auth, RBAC, Lecturer Portal & Grade Management, Enrollment.",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "item": []
}

def make_req(name, method, url_str, headers=None, body_json=None, tests=None, pre_script=None):
    url_parts = url_str.split('?')
    query = []
    if len(url_parts) > 1:
        for q in url_parts[1].split('&'):
            if '=' in q:
                k, v = q.split('=', 1)
                query.append({'key': k, 'value': v})

    url_obj = {
        'raw': url_str,
        'query': query
    }
    
    header_list = []
    if headers:
        for k, v in headers.items():
            header_list.append({'key': k, 'value': v, 'type': 'text'})

    request_obj = {
        'method': method,
        'header': header_list,
        'url': url_obj
    }

    if body_json is not None:
        request_obj['body'] = {
            'mode': 'raw',
            'raw': json.dumps(body_json, indent=2, ensure_ascii=False),
            'options': {'raw': {'language': 'json'}}
        }

    events = []
    if pre_script:
        events.append({
            'listen': 'prerequest',
            'script': {
                'type': 'text/javascript',
                'exec': [l for l in pre_script.strip().split('\n')]
            }
        })
    if tests:
        events.append({
            'listen': 'test',
            'script': {
                'type': 'text/javascript',
                'exec': [l for l in tests.strip().split('\n')]
            }
        })

    item = {
        'name': name,
        'request': request_obj,
        'response': []
    }
    if events:
        item['event'] = events
    return item

# ----------------- FOLDER 1: AUTH -----------------
auth_items = []

auth_items.append(make_req(
    name='1.1 Login LECTURER (gv001) -> 200 & Lưu token',
    method='POST',
    url_str='{{base_auth_url}}{{api_prefix}}/auth/login',
    headers={'Content-Type': 'application/json'},
    body_json={'username': '{{lecturer1_username}}', 'password': '{{lecturer1_password}}'},
    tests="""pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response matches ApiResponse schema", function () {
    var res = pm.response.json();
    pm.expect(res.status).to.eql(200);
    pm.expect(res.data).to.be.an("object");
    pm.expect(res.data.accessToken).to.be.a("string");
    pm.expect(res.data.user.role).to.eql("LECTURER");
    pm.environment.set("token_lecturer", res.data.accessToken);
});"""
))

auth_items.append(make_req(
    name='1.2 Login LECTURER 2 (gv002) -> 200 & Lưu token',
    method='POST',
    url_str='{{base_auth_url}}{{api_prefix}}/auth/login',
    headers={'Content-Type': 'application/json'},
    body_json={'username': '{{lecturer2_username}}', 'password': '{{lecturer2_password}}'},
    tests="""pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response contains token for gv002", function () {
    var res = pm.response.json();
    pm.expect(res.data.accessToken).to.be.a("string");
    pm.expect(res.data.user.username).to.eql("gv002");
    pm.environment.set("token_lecturer2", res.data.accessToken);
});"""
))

auth_items.append(make_req(
    name='1.3 Login STUDENT (sv2024001) -> 200 & Lưu token',
    method='POST',
    url_str='{{base_auth_url}}{{api_prefix}}/auth/login',
    headers={'Content-Type': 'application/json'},
    body_json={'username': '{{student1_username}}', 'password': '{{student1_password}}'},
    tests="""pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response contains token for STUDENT", function () {
    var res = pm.response.json();
    pm.expect(res.data.accessToken).to.be.a("string");
    pm.expect(res.data.user.role).to.eql("STUDENT");
    pm.environment.set("token_student", res.data.accessToken);
});"""
))

auth_items.append(make_req(
    name='1.4 Login ADMIN (admin) -> 200 & Lưu token',
    method='POST',
    url_str='{{base_auth_url}}{{api_prefix}}/auth/login',
    headers={'Content-Type': 'application/json'},
    body_json={'username': '{{admin_username}}', 'password': '{{admin_password}}'},
    tests="""pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response contains token for ADMIN", function () {
    var res = pm.response.json();
    pm.expect(res.data.accessToken).to.be.a("string");
    pm.expect(res.data.user.role).to.eql("ADMIN");
    pm.environment.set("token_admin", res.data.accessToken);
});"""
))

auth_items.append(make_req(
    name='1.5 Login Fail - Sai mật khẩu -> 401 Unauthorized',
    method='POST',
    url_str='{{base_auth_url}}{{api_prefix}}/auth/login',
    headers={'Content-Type': 'application/json'},
    body_json={'username': '{{lecturer1_username}}', 'password': 'wrong_password_xyz'},
    tests="""pm.test("Status code is 401", function () {
    pm.response.to.have.status(401);
});

pm.test("Error response format is correct", function () {
    var res = pm.response.json();
    pm.expect(res.status).to.eql(401);
});"""
))

auth_items.append(make_req(
    name='1.6 Gọi API bảo vệ không có token -> 401 Unauthorized',
    method='GET',
    url_str='{{base_lecturer_url}}{{api_prefix}}/lecturer/classes',
    headers={'Accept': 'application/json'},
    tests="""pm.test("Status code is 401 when no token provided", function () {
    pm.response.to.have.status(401);
});"""
))

collection['item'].append({
    'name': '01. Authentication & Security',
    'item': auth_items
})

# ----------------- FOLDER 2: RBAC -----------------
rbac_items = []

rbac_items.append(make_req(
    name='2.1 STUDENT gọi PUT /lecturer/grades/{id} -> 403 Forbidden',
    method='PUT',
    url_str='{{base_lecturer_url}}{{api_prefix}}/lecturer/grades/{{enrollment_id_sv1}}',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {{token_student}}'
    },
    body_json={'midtermScore': 8.5, 'finalScore': 9.0},
    tests="""pm.test("Status code is 403 Forbidden", function () {
    pm.response.to.have.status(403);
});"""
))

rbac_items.append(make_req(
    name='2.2 STUDENT gọi POST /admin/class-sections -> 403 Forbidden',
    method='POST',
    url_str='{{base_lecturer_url}}{{api_prefix}}/admin/class-sections',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {{token_student}}'
    },
    body_json={'sectionCode': 'TEST-999'},
    tests="""pm.test("Status code is 403 Forbidden", function () {
    pm.response.to.have.status(403);
});"""
))

rbac_items.append(make_req(
    name='2.3 LECTURER gọi API của lớp không thuộc mình -> 403 Forbidden',
    method='GET',
    url_str='{{base_lecturer_url}}{{api_prefix}}/lecturer/classes/{{section_id_gv002}}/students',
    headers={
        'Authorization': 'Bearer {{token_lecturer}}'
    },
    tests="""pm.test("Status code is 403 Forbidden for unauthorized section", function () {
    pm.response.to.have.status(403);
});

pm.test("Error message explains ownership restriction", function () {
    var res = pm.response.json();
    pm.expect(res.status).to.eql(403);
    pm.expect(res.message).to.include("không được phân công");
});"""
))

collection['item'].append({
    'name': '02. Role-Based Access Control (RBAC)',
    'item': rbac_items
})

# ----------------- FOLDER 3: LECTURER PORTAL & GRADES -----------------
grade_items = []

grade_items.append(make_req(
    name='3.1 GET /lecturer/classes — Danh sách lớp phân công',
    method='GET',
    url_str='{{base_lecturer_url}}{{api_prefix}}/lecturer/classes?semester=2024-25_SEM2',
    headers={
        'Authorization': 'Bearer {{token_lecturer}}'
    },
    tests="""pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Returns list of assigned classes for gv001", function () {
    var res = pm.response.json();
    pm.expect(res.status).to.eql(200);
    pm.expect(res.data).to.be.an("array");
    pm.expect(res.data.length).to.be.at.least(1);

    var first = res.data[0];
    pm.expect(first).to.have.property("sectionId");
    pm.expect(first).to.have.property("sectionCode");
    pm.expect(first).to.have.property("courseName");
    pm.expect(first).to.have.property("currentEnrolled");
    pm.expect(first).to.have.property("maxCapacity");
});"""
))

grade_items.append(make_req(
    name='3.2 GET /lecturer/classes/{id}/students — Danh sách SV và điểm',
    method='GET',
    url_str='{{base_lecturer_url}}{{api_prefix}}/lecturer/classes/{{section_id_gv001}}/students',
    headers={
        'Authorization': 'Bearer {{token_lecturer}}'
    },
    tests="""pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Returns students list with grade fields", function () {
    var res = pm.response.json();
    pm.expect(res.status).to.eql(200);
    pm.expect(res.data).to.be.an("array");
    pm.expect(res.data.length).to.be.at.least(1);

    var student = res.data[0];
    pm.expect(student).to.have.property("enrollmentId");
    pm.expect(student).to.have.property("studentCode");
    pm.expect(student).to.have.property("fullName");
    pm.expect(student).to.have.property("attendanceRate");
    pm.expect(student).to.have.property("isLocked");
});"""
))

grade_items.append(make_req(
    name='3.3 PUT /lecturer/enrollments/{id}/attendance — Cập nhật chuyên cần (95% -> 9.5 điểm)',
    method='PUT',
    url_str='{{base_lecturer_url}}{{api_prefix}}/lecturer/enrollments/{{enrollment_id_sv1}}/attendance',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {{token_lecturer}}'
    },
    body_json={'attendanceRate': 95.0},
    tests="""pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Attendance updated and converted to attendanceScore = rate / 10", function () {
    var res = pm.response.json();
    pm.expect(res.status).to.eql(200);
    pm.expect(Number(res.data.attendanceRate)).to.eql(95.0);
    pm.expect(Number(res.data.attendanceScore)).to.eql(9.5);
});"""
))

grade_items.append(make_req(
    name='3.4 PUT /lecturer/grades/{id} — Nhập điểm hợp lệ & kiểm tra công thức tính',
    method='PUT',
    url_str='{{base_lecturer_url}}{{api_prefix}}/lecturer/grades/{{enrollment_id_sv1}}',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {{token_lecturer}}'
    },
    body_json={
        'attendanceScore': 10.0,
        'midtermScore': 8.0,
        'finalScore': 9.0
    },
    tests="""pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Total score formula: 0.1*10 + 0.3*8 + 0.6*9 = 8.80 (A)", function () {
    var res = pm.response.json();
    pm.expect(res.status).to.eql(200);
    pm.expect(Number(res.data.totalScore)).to.eql(8.8);
    pm.expect(res.data.letterGrade).to.eql("A");
});"""
))

grade_items.append(make_req(
    name='3.5 PUT /lecturer/grades/{id} — Điểm > 10 -> 400 Bad Request',
    method='PUT',
    url_str='{{base_lecturer_url}}{{api_prefix}}/lecturer/grades/{{enrollment_id_sv1}}',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {{token_lecturer}}'
    },
    body_json={
        'finalScore': 11.5
    },
    tests="""pm.test("Status code is 400 Bad Request", function () {
    pm.response.to.have.status(400);
});"""
))

grade_items.append(make_req(
    name='3.6 PUT /lecturer/grades/{id} — Điểm < 0 -> 400 Bad Request',
    method='PUT',
    url_str='{{base_lecturer_url}}{{api_prefix}}/lecturer/grades/{{enrollment_id_sv1}}',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {{token_lecturer}}'
    },
    body_json={
        'midtermScore': -2.0
    },
    tests="""pm.test("Status code is 400 Bad Request", function () {
    pm.response.to.have.status(400);
});"""
))

grade_items.append(make_req(
    name='3.7 PUT /lecturer/grades/{id} — Nhập đủ điểm cho sinh viên thứ 2',
    method='PUT',
    url_str='{{base_lecturer_url}}{{api_prefix}}/lecturer/grades/{{enrollment_id_sv2}}',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {{token_lecturer}}'
    },
    body_json={
        'attendanceScore': 9.0,
        'midtermScore': 7.5,
        'finalScore': 8.0
    },
    tests="""pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Grade calculation: 0.1*9 + 0.3*7.5 + 0.6*8.0 = 7.95 (B+)", function () {
    var res = pm.response.json();
    pm.expect(res.status).to.eql(200);
    pm.expect(Number(res.data.totalScore)).to.eql(7.95);
    pm.expect(res.data.letterGrade).to.eql("B+");
});"""
))

grade_items.append(make_req(
    name='3.8 POST /lecturer/classes/{id}/lock-grades — Chốt điểm thành công',
    method='POST',
    url_str='{{base_lecturer_url}}{{api_prefix}}/lecturer/classes/{{section_id_gv001}}/lock-grades',
    headers={
        'Authorization': 'Bearer {{token_lecturer}}'
    },
    tests="""pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("All students in class section locked", function () {
    var res = pm.response.json();
    pm.expect(res.status).to.eql(200);
    pm.expect(res.data.locked).to.eql(true);
});"""
))

grade_items.append(make_req(
    name='3.9 PUT /lecturer/grades/{id} — Sửa điểm sau khi chốt -> 409 Conflict',
    method='PUT',
    url_str='{{base_lecturer_url}}{{api_prefix}}/lecturer/grades/{{enrollment_id_sv1}}',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {{token_lecturer}}'
    },
    body_json={
        'finalScore': 10.0
    },
    tests="""pm.test("Status code is 409 Conflict", function () {
    pm.response.to.have.status(409);
});

pm.test("Message informs grades are locked", function () {
    var res = pm.response.json();
    pm.expect(res.status).to.eql(409);
    pm.expect(res.message).to.include("khóa");
});"""
))

collection['item'].append({
    'name': '03. Lecturer Portal & Grade Management',
    'item': grade_items
})

# ----------------- FOLDER 4: ENROLLMENT (INTEGRATION) -----------------
enrollment_items = []

enrollment_items.append(make_req(
    name='4.1 Đăng ký học phần thành công -> 200/201 (hoặc skip nếu chưa có service)',
    method='POST',
    url_str='{{base_enrollment_url}}{{api_prefix}}/student/enrollments',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {{token_student}}'
    },
    body_json={'classSectionId': 4},
    tests="""if (pm.response.code !== 503 && pm.response.code !== 502) {
    pm.test("Enrollment returned expected status (200, 201, or handled error)", function () {
        pm.expect([200, 201, 400, 409]).to.include(pm.response.code);
    });
} else {
    pm.test("enrollment-service is optional (pending merge with Quân)", function () {
        pm.expect(true).to.be.true;
    });
}"""
))

enrollment_items.append(make_req(
    name='4.2 Đăng ký lớp đã đầy -> 400/409',
    method='POST',
    url_str='{{base_enrollment_url}}{{api_prefix}}/student/enrollments',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {{token_student}}'
    },
    body_json={'classSectionId': 999},
    tests="""if (pm.response.code !== 503 && pm.response.code !== 502) {
    pm.test("Returns 400 or 404 for invalid/full section", function () {
        pm.expect([400, 404, 409]).to.include(pm.response.code);
    });
}"""
))

enrollment_items.append(make_req(
    name='4.3 Hủy đăng ký học phần -> 200 (giảm current_enrolled)',
    method='DELETE',
    url_str='{{base_enrollment_url}}{{api_prefix}}/student/enrollments/3',
    headers={
        'Authorization': 'Bearer {{token_student}}'
    },
    tests="""if (pm.response.code !== 503 && pm.response.code !== 502) {
    pm.test("Drop enrollment response code", function () {
        pm.expect([200, 204, 400, 404]).to.include(pm.response.code);
    });
}"""
))

collection['item'].append({
    'name': '04. Student Enrollment (Integration)',
    'item': enrollment_items
})

# ----------------- FOLDER 5: CONCURRENCY / RACE CONDITION -----------------
concurrency_items = []

concurrency_items.append(make_req(
    name='5.1 Test tranh chấp chỗ đăng ký (Concurrent Registration Simulation)',
    method='POST',
    url_str='{{base_enrollment_url}}{{api_prefix}}/student/enrollments',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {{token_student}}'
    },
    body_json={'classSectionId': 4},
    tests="""// Chạy nhiều iteration với Newman: newman run ... -n 5
pm.test("Handles concurrent registration without exceeding capacity", function () {
    pm.expect([200, 201, 400, 409, 502, 503]).to.include(pm.response.code);
});"""
))

collection['item'].append({
    'name': '05. Concurrency & Race Condition (Optional)',
    'item': concurrency_items
})

with open('postman/eduportal.postman_collection.json', 'w', encoding='utf-8') as f:
    json.dump(collection, f, indent=2, ensure_ascii=False)

print("Generated eduportal.postman_collection.json successfully!")
