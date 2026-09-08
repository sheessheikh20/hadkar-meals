package com.hadkarmeals.repository;

import com.hadkarmeals.entity.ClosureType;
import com.hadkarmeals.entity.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface HolidayRepository extends JpaRepository<Holiday, Long> {
    List<Holiday> findByActiveTrueOrderByHolidayDateAsc();
    List<Holiday> findByHolidayDateAndActiveTrue(LocalDate holidayDate);
    Optional<Holiday> findByHolidayDateAndAffectsMealAndActiveTrue(LocalDate holidayDate, ClosureType affectsMeal);
    List<Holiday> findByHolidayDateBetweenAndActiveTrueOrderByHolidayDateAsc(LocalDate start, LocalDate end);
}
