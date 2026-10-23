package com.rikkei.eduportal.course.service;

import com.rikkei.eduportal.common.SectionStatus;
import com.rikkei.eduportal.course.dto.request.ClassSectionCreateRequest;
import com.rikkei.eduportal.course.dto.request.ClassSectionUpdateRequest;
import com.rikkei.eduportal.course.dto.response.ClassSectionResponse;

import java.util.List;

public interface ClassSectionService {

    List<ClassSectionResponse> searchSections(String semesterName, SectionStatus status, String keyword);

    ClassSectionResponse getSectionById(Long id);

    ClassSectionResponse createSection(ClassSectionCreateRequest request);

    ClassSectionResponse updateSection(Long id, ClassSectionUpdateRequest request);

    void deleteSection(Long id);
}
