package com.hadkarmeals.controller;

import com.hadkarmeals.entity.Hostel;
import com.hadkarmeals.service.HostelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/hostels")
@Tag(name = "Service Locations", description = "Hostel and delivery location management")
public class HostelController {

    private final HostelService hostelService;

    public HostelController(HostelService hostelService) {
        this.hostelService = hostelService;
    }

    @GetMapping
    @Operation(summary = "List all service locations (hostels)")
    public ResponseEntity<List<Hostel>> getAllHostels() {
        return ResponseEntity.ok(hostelService.getAllHostels());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Create a new service location")
    public ResponseEntity<Hostel> createHostel(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String address = body.get("address");
        return ResponseEntity.ok(hostelService.createHostel(name, address));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Update a service location")
    public ResponseEntity<Hostel> updateHostel(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String name = body.get("name");
        String address = body.get("address");
        return ResponseEntity.ok(hostelService.updateHostel(id, name, address));
    }

    @PatchMapping("/{id}/toggle")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Toggle active status of service location")
    public ResponseEntity<Hostel> toggleHostel(@PathVariable Long id) {
        return ResponseEntity.ok(hostelService.toggleHostel(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Delete a service location")
    public ResponseEntity<Void> deleteHostel(@PathVariable Long id) {
        hostelService.deleteHostel(id);
        return ResponseEntity.noContent().build();
    }
}
