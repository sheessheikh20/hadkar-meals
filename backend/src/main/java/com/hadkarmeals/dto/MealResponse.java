package com.hadkarmeals.dto;

import com.hadkarmeals.entity.MealStatus;
import com.hadkarmeals.entity.MealType;
import com.hadkarmeals.entity.MenuItem;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MealResponse {
    private Long id;
    private LocalDate mealDate;
    private MealType mealType;
    private BigDecimal halfPrice;
    private BigDecimal fullPrice;
    private LocalTime orderOpenTime;
    private LocalTime orderCutoffTime;
    private MealStatus status;
    private String emergencyReason;
    private List<MenuItem> menuItems;

    // Student contextual properties
    private boolean cutoffReached;
    private boolean open;
    private boolean closedToday;
    private String closureReason;
    private OrderResponse userActiveOrder;
    private List<OrderResponse> userActiveOrders;
}
