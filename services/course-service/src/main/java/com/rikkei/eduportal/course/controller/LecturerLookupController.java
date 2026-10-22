package com.rikkei.eduportal.course.controller;

import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.course.dto.response.LecturerSummaryResponse;
import com.rikkei.eduportal.course.entity.LecturerProfile;
import com.rikkei.eduportal.course.repository.LecturerProfileRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin/lecturers")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class LecturerLookupController {

    private final LecturerProfileRepository lecturerProfileRepository;

    public LecturerLookupController(LecturerProfileRepository lecturerProfileRepository) {
        this.lecturerProfileRepository = lecturerProfileRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<LecturerSummaryResponse>>> getAllActiveLecturers() {
        List<LecturerProfile> list = lecturerProfileRepository.findAllActiveWithUser();
        List<LecturerSummaryResponse> responses = list.stream().map(lp -> new LecturerSummaryResponse(
                lp.getId(),
                lp.getLecturerCode(),
                lp.getUser() != null ? lp.getUser().getFullName() : lp.getLecturerCode(),
                lp.getUser() != null ? lp.getUser().getEmail() : "",
                lp.getDepartment(),
                lp.getDegree()
        )).collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách giảng viên thành công", responses));
    }
}
