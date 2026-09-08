package com.hadkarmeals.repository;

import com.hadkarmeals.entity.BillStatus;
import com.hadkarmeals.entity.MonthlyBill;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MonthlyBillRepository extends JpaRepository<MonthlyBill, Long> {
    Optional<MonthlyBill> findByStudentIdAndMonthYear(Long studentId, String monthYear);
    List<MonthlyBill> findByStudentIdOrderByMonthYearDesc(Long studentId);
    List<MonthlyBill> findByMonthYearOrderByStudentHostelNameAscStudentFullNameAsc(String monthYear);
    List<MonthlyBill> findByMonthYearAndStatus(String monthYear, BillStatus status);
}
