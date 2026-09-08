package com.hadkarmeals.service;

import com.hadkarmeals.dto.RegisterStudentRequest;
import com.hadkarmeals.entity.Hostel;
import com.hadkarmeals.entity.Role;
import com.hadkarmeals.entity.Student;
import com.hadkarmeals.entity.User;
import com.hadkarmeals.exception.ResourceNotFoundException;
import com.hadkarmeals.repository.HostelRepository;
import com.hadkarmeals.repository.StudentRepository;
import com.hadkarmeals.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class StudentService {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final HostelRepository hostelRepository;
    private final AuditLogService auditLogService;

    public StudentService(
            StudentRepository studentRepository,
            UserRepository userRepository,
            HostelRepository hostelRepository,
            AuditLogService auditLogService) {
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
        this.hostelRepository = hostelRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public Student registerStudentProfile(String phoneNumber, RegisterStudentRequest request) {
        User user = userRepository.findByPhoneNumber(phoneNumber)
                .orElseGet(() -> userRepository.save(User.builder()
                        .phoneNumber(phoneNumber)
                        .role(Role.ROLE_STUDENT)
                        .active(true)
                        .build()));

        Hostel hostel = hostelRepository.findById(request.getHostelId())
                .orElseThrow(() -> new ResourceNotFoundException("Service location not found with ID: " + request.getHostelId()));

        Student student = studentRepository.findByUserId(user.getId())
                .orElseGet(() -> Student.builder()
                        .user(user)
                        .phoneNumber(phoneNumber)
                        .active(true)
                        .build());

        student.setFullName(request.getFullName());
        student.setHostel(hostel);

        student = studentRepository.save(student);

        auditLogService.log(
                "STUDENT_REGISTERED",
                phoneNumber,
                "Student",
                String.valueOf(student.getId()),
                "Completed profile for " + student.getFullName() + " at " + hostel.getName()
        );

        return student;
    }

    public Student getStudentByUserId(Long userId) {
        return studentRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for user ID: " + userId));
    }

    public Student getStudentByPhoneNumber(String phoneNumber) {
        return studentRepository.findByPhoneNumber(phoneNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for phone: " + phoneNumber));
    }

    public List<Student> getAllStudents(String search, Long hostelId, Boolean active) {
        if (search != null && !search.trim().isEmpty()) {
            return studentRepository.searchStudents(search);
        }
        if (hostelId != null) {
            return studentRepository.findByHostelId(hostelId);
        }
        if (active != null) {
            return studentRepository.findByActive(active);
        }
        return studentRepository.findAll();
    }

    @Transactional
    public Student setStudentStatus(Long studentId, boolean active, String adminUsername) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + studentId));

        student.setActive(active);
        if (student.getUser() != null) {
            student.getUser().setActive(active);
            userRepository.save(student.getUser());
        }
        student = studentRepository.save(student);

        auditLogService.log(
                active ? "STUDENT_ACTIVATED" : "STUDENT_DEACTIVATED",
                adminUsername,
                "Student",
                String.valueOf(student.getId()),
                (active ? "Activated" : "Deactivated") + " student " + student.getFullName() + " (Phone: " + student.getPhoneNumber() + ")"
        );

        return student;
    }
}
