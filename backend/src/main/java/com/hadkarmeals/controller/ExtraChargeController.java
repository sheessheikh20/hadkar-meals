package com.hadkarmeals.controller;

import com.hadkarmeals.dto.AddExtraChargeRequest;
import com.hadkarmeals.entity.ExtraCharge;
import com.hadkarmeals.entity.Student;
import com.hadkarmeals.exception.ResourceNotFoundException;
import com.hadkarmeals.repository.StudentRepository;
import com.hadkarmeals.service.ExtraChargeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/charges")
@Tag(name = "Extra Charges", description = "Manual add-ons (Extra Roti, Curd, Rice, Sweets, etc.)")
public class ExtraChargeController {

    private final ExtraChargeService extraChargeService;
    private final StudentRepository studentRepository;

    public ExtraChargeController(ExtraChargeService extraChargeService, StudentRepository studentRepository) {
        this.extraChargeService = extraChargeService;
        this.studentRepository = studentRepository;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Add an extra charge to a student's ledger")
    public ResponseEntity<ExtraCharge> addExtraCharge(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody AddExtraChargeRequest request) {
        return ResponseEntity.ok(extraChargeService.addExtraCharge(request, userDetails.getUsername()));
    }

    @GetMapping("/my-charges")
    @Operation(summary = "Get extra charges for logged-in student")
    public ResponseEntity<List<ExtraCharge>> getMyCharges(@AuthenticationPrincipal UserDetails userDetails) {
        Student student = studentRepository.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        return ResponseEntity.ok(extraChargeService.getStudentCharges(student.getId()));
    }

    @GetMapping("/student/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin view extra charges for a specific student")
    public ResponseEntity<List<ExtraCharge>> getStudentChargesAdmin(@PathVariable Long id) {
        return ResponseEntity.ok(extraChargeService.getStudentCharges(id));
    }
}
