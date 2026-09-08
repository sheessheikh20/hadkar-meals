package com.hadkarmeals.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardStatsResponse {
    private long todayOrdersCount;
    private BigDecimal todayEstimatedRevenue;
    private long activeStudentsCount;
    private long pendingBillsCount;
    private BigDecimal totalOutstandingAmount;

    private MealStat dinner;

    private String serviceStatus; // OPEN, CLOSING_SOON, CLOSED, HOLIDAY
    private String serviceBannerText;
    private List<String> alerts;
    private List<OrderResponse> recentOrders;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MealStat {
        private long fullCount;
        private long halfCount;
        private long totalCount;
        private String status;
        private String cutoffTime;
        private boolean isPublished;
        private boolean isClosed;
    }
}
