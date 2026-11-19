package com.rikkei.eduportal.lecturer.service;

import java.util.List;

public interface LecturerEmailService {

    /**
     * Gửi email cảnh báo sớm học vụ 1-chạm (1-Click Early Warning) tới sinh viên trong diện nguy cơ
     */
    void sendAcademicWarningEmail(String toEmail,
                                  String studentName,
                                  String studentCode,
                                  String sectionCode,
                                  String courseName,
                                  String riskLevel,
                                  List<String> reasons,
                                  List<String> suggestions);

    /**
     * Gửi email thông báo / dặn dò riêng từ giảng viên tới sinh viên
     */
    void sendLecturerMessageEmail(String toEmail,
                                  String studentName,
                                  String studentCode,
                                  String sectionCode,
                                  String courseName,
                                  String lecturerName,
                                  String title,
                                  String message);
}
