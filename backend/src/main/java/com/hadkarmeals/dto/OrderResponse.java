package com.hadkarmeals.dto;

import com.hadkarmeals.entity.MealType;
import com.hadkarmeals.entity.OrderStatus;
import com.hadkarmeals.entity.OrderType;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderResponse {
    private Long id;
    private Long studentId;
    private String studentName;
    private String studentPhone;
    private String hostelName;

    private Long mealId;
    private LocalDate orderDate;
    private MealType mealType;
    private OrderType orderType;
    private BigDecimal priceAtOrder;
    private OrderStatus status;
    private String selectedSabzi;
    private Integer extraRotis;
    private Integer quantity;
    private String halfTiffinChoice;

    private String cancellationReason;
    private LocalDateTime cancelledAt;
    private LocalDateTime createdAt;
    private boolean canCancel;
}
