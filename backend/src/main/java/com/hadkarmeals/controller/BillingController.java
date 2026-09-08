package com.hadkarmeals.controller;

import com.hadkarmeals.dto.MonthlyBillResponse;
import com.hadkarmeals.entity.BillStatus;
import com.hadkarmeals.entity.Student;
import com.hadkarmeals.exception.ResourceNotFoundException;
import com.hadkarmeals.repository.StudentRepository;
import com.hadkarmeals.service.BillingService;
import com.hadkarmeals.service.PdfBillService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/billing")
@Tag(name = "Monthly Billing", description = "Monthly bill generation, sheet view, WhatsApp bills, and PDF export")
public class BillingController {

    private final BillingService billingService;
    private final PdfBillService pdfBillService;
    private final StudentRepository studentRepository;

    public BillingController(BillingService billingService, PdfBillService pdfBillService, StudentRepository studentRepository) {
        this.billingService = billingService;
        this.pdfBillService = pdfBillService;
        this.studentRepository = studentRepository;
    }

    @GetMapping("/sheet")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin spreadsheet-like monthly billing sheet with WhatsApp URLs and filters")
    public ResponseEntity<List<MonthlyBillResponse>> getBillingSheet(
            @RequestParam(required = false) String month,
            @RequestParam(required = false) Long hostelId,
            @RequestParam(required = false) BillStatus status,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(billingService.getBillingSheet(month, hostelId, status, search));
    }

    @PostMapping("/generate")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Generate/refresh all monthly bills for a given month")
    public ResponseEntity<List<MonthlyBillResponse>> generateAllBills(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> body) {
        String month = body.get("month");
        return ResponseEntity.ok(billingService.generateAllBillsForMonth(month, userDetails.getUsername()));
    }

    @PostMapping("/{id}/mark-paid")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "1-Click Mark a bill as paid (creates payment record & clears balance)")
    public ResponseEntity<MonthlyBillResponse> markBillAsPaid(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(billingService.markBillAsPaid(id, userDetails.getUsername()));
    }

    @GetMapping("/my-bill")
    @Operation(summary = "Get current student's monthly bill")
    public ResponseEntity<MonthlyBillResponse> getMyBill(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String month) {
        Student student = studentRepository.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        return ResponseEntity.ok(billingService.getStudentBill(student.getId(), month));
    }

    @GetMapping("/my-history")
    @Operation(summary = "Get current student's past monthly bills")
    public ResponseEntity<List<MonthlyBillResponse>> getMyBillHistory(@AuthenticationPrincipal UserDetails userDetails) {
        Student student = studentRepository.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        return ResponseEntity.ok(billingService.getStudentBillHistory(student.getId()));
    }

    @GetMapping("/pdf/{studentId}")
    @Operation(summary = "Download printable PDF bill for a student")
    public ResponseEntity<byte[]> downloadPdfBill(
            @PathVariable Long studentId,
            @RequestParam(required = false) String month) {
        byte[] pdf = pdfBillService.generateBillPdf(studentId, month);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=HadkarMeals_Bill_" + studentId + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping("/my-pdf")
    @Operation(summary = "Download PDF bill for logged in student")
    public ResponseEntity<byte[]> downloadMyPdf(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String month) {
        Student student = studentRepository.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        byte[] pdf = pdfBillService.generateBillPdf(student.getId(), month);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=HadkarMeals_Bill_" + student.getFullName().replaceAll("\\s+", "_") + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
