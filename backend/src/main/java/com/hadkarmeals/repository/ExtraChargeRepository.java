package com.hadkarmeals.repository;

import com.hadkarmeals.entity.ExtraCharge;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface ExtraChargeRepository extends JpaRepository<ExtraCharge, Long> {
    List<ExtraCharge> findByStudentIdOrderByChargeDateDesc(Long studentId);
    List<ExtraCharge> findByStudentIdAndChargeDateBetweenAndActiveTrue(
            Long studentId, LocalDate start, LocalDate end);
    List<ExtraCharge> findByChargeDateBetweenOrderByChargeDateDesc(LocalDate start, LocalDate end);
}
