package com.hadkarmeals.controller;

import com.hadkarmeals.dto.OrderResponse;
import com.hadkarmeals.dto.PlaceOrderRequest;
import com.hadkarmeals.entity.MealType;
import com.hadkarmeals.entity.Student;
import com.hadkarmeals.exception.ResourceNotFoundException;
import com.hadkarmeals.repository.StudentRepository;
import com.hadkarmeals.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@Tag(name = "Order Management", description = "Placing Half/Full orders, cancellations, and history")
public class OrderController {

    private final OrderService orderService;
    private final StudentRepository studentRepository;

    public OrderController(OrderService orderService, StudentRepository studentRepository) {
        this.orderService = orderService;
        this.studentRepository = studentRepository;
    }

    @PostMapping
    @Operation(summary = "Place Half or Full tiffin order for a meal")
    public ResponseEntity<OrderResponse> placeOrder(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PlaceOrderRequest request) {
        Student student = studentRepository.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        return ResponseEntity.ok(orderService.placeOrder(student.getId(), request));
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancel order before cutoff time")
    public ResponseEntity<OrderResponse> cancelOrder(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        Student student = studentRepository.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        String reason = body != null ? body.get("reason") : "Cancelled by student";
        return ResponseEntity.ok(orderService.cancelOrder(id, student.getId(), reason));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Edit order before cutoff time")
    public ResponseEntity<OrderResponse> editOrder(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody PlaceOrderRequest request) {
        Student student = studentRepository.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        return ResponseEntity.ok(orderService.editOrder(id, student.getId(), request));
    }

    @PostMapping("/{id}/admin-cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Admin cancel order with reason and ledger reversal")
    public ResponseEntity<OrderResponse> adminCancelOrder(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String reason = body != null && body.containsKey("reason") ? body.get("reason") : "Administrative cancellation";
        return ResponseEntity.ok(orderService.adminCancelOrder(id, reason, userDetails.getUsername()));
    }

    @PostMapping("/{id}/deliver")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Mark single order as delivered and notify customer")
    public ResponseEntity<OrderResponse> deliverOrder(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(orderService.deliverOrder(id, userDetails.getUsername()));
    }

    @PostMapping("/deliver-hostel/{hostelId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Mark all orders for a hostel location as delivered and notify all customers")
    public ResponseEntity<Map<String, Object>> deliverOrdersByHostel(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long hostelId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        int deliveredCount = orderService.deliverOrdersByHostel(hostelId, date, userDetails.getUsername());
        return ResponseEntity.ok(Map.of(
                "deliveredCount", deliveredCount,
                "message", "Successfully delivered " + deliveredCount + " orders and sent notifications to students."
        ));
    }

    @GetMapping("/my-orders")
    @Operation(summary = "Get order history for current student")
    public ResponseEntity<List<OrderResponse>> getMyOrders(@AuthenticationPrincipal UserDetails userDetails) {
        Student student = studentRepository.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));

        return ResponseEntity.ok(orderService.getStudentOrders(student.getId()));
    }

    @GetMapping("/student/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Admin get order history for a specific student/user")
    public ResponseEntity<List<OrderResponse>> getStudentOrdersAdmin(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getStudentOrders(id));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Admin list orders with optional date and mealType filter")
    public ResponseEntity<List<OrderResponse>> getAllOrders(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) MealType mealType) {
        return ResponseEntity.ok(orderService.getAllOrders(date, mealType));
    }
}
