package com.hadkarmeals.controller;

import com.hadkarmeals.dto.CreateMealRequest;
import com.hadkarmeals.dto.CreateMenuItemRequest;
import com.hadkarmeals.dto.MealResponse;
import com.hadkarmeals.entity.Meal;
import com.hadkarmeals.entity.MenuItem;
import com.hadkarmeals.entity.Student;
import com.hadkarmeals.repository.StudentRepository;
import com.hadkarmeals.service.MenuService;
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
@RequestMapping("/api/menus")
@Tag(name = "Menu Management", description = "Daily meal menus, items, and publishing")
public class MenuController {

    private final MenuService menuService;
    private final StudentRepository studentRepository;

    public MenuController(MenuService menuService, StudentRepository studentRepository) {
        this.menuService = menuService;
        this.studentRepository = studentRepository;
    }

    @GetMapping("/today")
    @Operation(summary = "Get today's lunch and dinner meals with live status and active orders")
    public ResponseEntity<List<MealResponse>> getTodayMeals(@AuthenticationPrincipal UserDetails userDetails) {
        Long studentId = null;
        if (userDetails != null) {
            studentId = studentRepository.findByPhoneNumber(userDetails.getUsername())
                    .map(Student::getId).orElse(null);
        }
        return ResponseEntity.ok(menuService.getTodayMeals(studentId));
    }

    @GetMapping("/items")
    @Operation(summary = "List all reusable menu items (Sabzi, Dal, Roti, etc.)")
    public ResponseEntity<List<MenuItem>> getAllMenuItems() {
        return ResponseEntity.ok(menuService.getAllMenuItems());
    }

    @PostMapping("/items")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a new menu item")
    public ResponseEntity<MenuItem> createMenuItem(@Valid @RequestBody CreateMenuItemRequest request) {
        return ResponseEntity.ok(menuService.createMenuItem(request));
    }

    @PutMapping("/items/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update an existing menu item")
    public ResponseEntity<MenuItem> updateMenuItem(
            @PathVariable Long id,
            @Valid @RequestBody CreateMenuItemRequest request) {
        return ResponseEntity.ok(menuService.updateMenuItem(id, request));
    }

    @PatchMapping("/items/{id}/toggle")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Toggle active status of menu item")
    public ResponseEntity<MenuItem> toggleMenuItem(@PathVariable Long id) {
        return ResponseEntity.ok(menuService.toggleMenuItem(id));
    }

    @DeleteMapping("/items/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete a menu item")
    public ResponseEntity<Void> deleteMenuItem(@PathVariable Long id) {
        menuService.deleteMenuItem(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create or update a daily meal menu (Dinner)")
    public ResponseEntity<Meal> createOrUpdateMeal(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreateMealRequest request) {
        return ResponseEntity.ok(menuService.createOrUpdateMeal(request, userDetails.getUsername()));
    }

    @PostMapping("/{id}/publish")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Publish meal menu to make it visible and open for ordering")
    public ResponseEntity<Meal> publishMeal(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @RequestParam(defaultValue = "true") boolean notifyStudents) {
        return ResponseEntity.ok(menuService.publishMeal(id, notifyStudents, userDetails.getUsername()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete or reset a daily meal menu")
    public ResponseEntity<Void> deleteMeal(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        menuService.deleteMeal(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Manually stop all orders for today's dinner")
    public ResponseEntity<Meal> closeMeal(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @RequestParam(required = false) String reason) {
        return ResponseEntity.ok(menuService.closeMeal(id, reason, userDetails.getUsername()));
    }

    @PostMapping("/{id}/reopen")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Re-open dinner orders")
    public ResponseEntity<Meal> reopenMeal(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(menuService.reopenMeal(id, userDetails.getUsername()));
    }
}
