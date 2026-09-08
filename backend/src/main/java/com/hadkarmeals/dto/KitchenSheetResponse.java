package com.hadkarmeals.dto;

import com.hadkarmeals.entity.MealType;
import com.hadkarmeals.entity.OrderType;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KitchenSheetResponse {
    private LocalDate date;
    private MealType mealType;
    private long totalOrders;
    private long totalHalf;
    private long totalFull;
    private long totalRotis;
    private List<KitchenOrderItem> items;
    private Map<String, HostelCount> hostelBreakdown;
    private Map<String, Long> sabziBreakdown;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class KitchenOrderItem {
        private Long orderId;
        private String hostelName;
        private String studentName;
        private String studentPhone;
        private OrderType orderType;
        private String halfTiffinChoice;
        private String selectedSabzi;
        private int extraRotis;
        private int quantity;
        private LocalTime orderedAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class HostelCount {
        private long full;
        private long half;
        private long total;
    }
}
