package com.hadkarmeals.controller;

import com.hadkarmeals.dto.KitchenSheetResponse;
import com.hadkarmeals.entity.MealType;
import com.hadkarmeals.service.KitchenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/kitchen")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Kitchen Operations", description = "Daily dinner preparation sheet and prep view")
public class KitchenController {

    private final KitchenService kitchenService;

    public KitchenController(KitchenService kitchenService) {
        this.kitchenService = kitchenService;
    }

    @GetMapping("/sheet")
    @Operation(summary = "Get aggregated dinner preparation sheet grouped by service location")
    public ResponseEntity<KitchenSheetResponse> getKitchenSheet(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(kitchenService.getKitchenSheet(date, MealType.DINNER));
    }
}
