package com.hadkarmeals.dto;

import com.hadkarmeals.entity.MealType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
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
public class CreateMealRequest {
    @NotNull(message = "Meal date is required")
    private LocalDate mealDate;

    @NotNull(message = "Meal type is required")
    private MealType mealType;

    @NotNull(message = "Half price is required")
    @Positive(message = "Half price must be positive")
    private BigDecimal halfPrice;

    @NotNull(message = "Full price is required")
    @Positive(message = "Full price must be positive")
    private BigDecimal fullPrice;

    @NotNull(message = "Order open time is required")
    private LocalTime orderOpenTime;

    @NotNull(message = "Order cutoff time is required")
    private LocalTime orderCutoffTime;

    private List<Long> menuItemIds;
}
