package com.hadkarmeals.dto;

import com.hadkarmeals.entity.OrderType;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlaceOrderRequest {
    @NotNull(message = "Meal ID is required")
    private Long mealId;

    @NotNull(message = "Order type (HALF/FULL) is required")
    private OrderType orderType;

    private String selectedSabzi;

    private Integer extraRotis;

    private Integer quantity;

    private String halfTiffinChoice;
}
