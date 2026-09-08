package com.hadkarmeals.dto;

import com.hadkarmeals.entity.MealType;
import com.hadkarmeals.entity.NotificationChannel;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BroadcastNotificationRequest {
    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Message is required")
    private String message;

    @Builder.Default
    private NotificationChannel channel = NotificationChannel.IN_APP;

    @Builder.Default
    private String targetGroup = "ALL_ACTIVE"; // ALL_ACTIVE, HOSTEL, UNORDERED_STUDENTS, PENDING_BILLS, SELECTED

    private Long hostelId;
    private MealType mealType;
    private List<Long> studentIds;
}
