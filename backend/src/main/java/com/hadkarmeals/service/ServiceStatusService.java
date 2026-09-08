package com.hadkarmeals.service;

import com.hadkarmeals.dto.CreateHolidayRequest;
import com.hadkarmeals.entity.ClosureType;
import com.hadkarmeals.entity.Holiday;
import com.hadkarmeals.entity.MealType;
import com.hadkarmeals.repository.HolidayRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class ServiceStatusService {

    private final HolidayRepository holidayRepository;
    private final AuditLogService auditLogService;

    public ServiceStatusService(
            HolidayRepository holidayRepository,
            AuditLogService auditLogService) {
        this.holidayRepository = holidayRepository;
        this.auditLogService = auditLogService;
    }

    public boolean isServiceClosed(LocalDate date, MealType mealType) {
        return isDinnerServiceClosed(date);
    }

    public boolean isDinnerServiceClosed(LocalDate date) {
        List<Holiday> holidays = holidayRepository.findByHolidayDateAndActiveTrue(date);
        return !holidays.isEmpty();
    }

    public String getClosureReason(LocalDate date, MealType mealType) {
        List<Holiday> holidays = holidayRepository.findByHolidayDateAndActiveTrue(date);
        if (!holidays.isEmpty()) {
            Holiday h = holidays.get(0);
            return h.getTitle() + (h.getDescription() != null && !h.getDescription().isEmpty() ? " - " + h.getDescription() : "");
        }
        return null;
    }

    @Transactional
    public Holiday scheduleHoliday(CreateHolidayRequest request) {
        Holiday holiday = Holiday.builder()
                .holidayDate(request.getHolidayDate())
                .title(request.getTitle())
                .description(request.getDescription())
                .affectsMeal(ClosureType.ALL)
                .active(true)
                .build();

        holiday = holidayRepository.save(holiday);

        auditLogService.log(
                "HOLIDAY_SCHEDULED",
                "ADMIN",
                "Holiday",
                String.valueOf(holiday.getId()),
                "Scheduled dinner service holiday for " + request.getHolidayDate() + " (" + request.getTitle() + ")"
        );

        return holiday;
    }

    public List<Holiday> getUpcomingHolidays() {
        return holidayRepository.findByActiveTrueOrderByHolidayDateAsc();
    }
}
