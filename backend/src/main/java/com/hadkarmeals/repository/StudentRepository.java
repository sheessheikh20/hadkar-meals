package com.hadkarmeals.repository;

import com.hadkarmeals.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByPhoneNumber(String phoneNumber);
    Optional<Student> findByUserId(Long userId);
    List<Student> findByActive(Boolean active);
    List<Student> findByHostelId(Long hostelId);
    
    @Query("SELECT s FROM Student s WHERE LOWER(s.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR s.phoneNumber LIKE CONCAT('%', :query, '%') OR LOWER(s.hostel.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Student> searchStudents(@Param("query") String query);
}
