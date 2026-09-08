package com.hadkarmeals.controller;

import com.hadkarmeals.dto.CreateHolidayRequest;
import com.hadkarmeals.entity.Holiday;
import com.hadkarmeals.service.ReportService;
import com.hadkarmeals.service.ServiceStatusService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@Tag(name = "Service Status & Holidays", description = "Control daily dinner service status and scheduled holidays")
public class ServiceStatusController {

    private final ServiceStatusService serviceStatusService;
    private final ReportService reportService;

    public ServiceStatusController(ServiceStatusService serviceStatusService, ReportService reportService) {
        this.serviceStatusService = serviceStatusService;
        this.reportService = reportService;
    }

    @GetMapping("/service-status/current")
    @Operation(summary = "Get current service banner status (OPEN / CLOSING_SOON / CLOSED / HOLIDAY)")
    public ResponseEntity<Map<String, Object>> getCurrentStatus() {
        var stats = reportService.getDashboardStats();
        return ResponseEntity.ok(Map.of(
                "serviceStatus", stats.getServiceStatus(),
                "serviceBannerText", stats.getServiceBannerText(),
                "alerts", List.of()
        ));
    }

    @PostMapping("/holidays")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Schedule a service holiday/closed day")
    public ResponseEntity<Holiday> scheduleHoliday(@Valid @RequestBody CreateHolidayRequest request) {
        return ResponseEntity.ok(serviceStatusService.scheduleHoliday(request));
    }

    @GetMapping("/holidays")
    @Operation(summary = "List upcoming scheduled holidays")
    public ResponseEntity<List<Holiday>> getHolidays() {
        return ResponseEntity.ok(serviceStatusService.getUpcomingHolidays());
    }
}
