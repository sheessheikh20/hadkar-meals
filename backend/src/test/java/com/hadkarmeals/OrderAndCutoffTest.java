package com.hadkarmeals;

import com.hadkarmeals.dto.OrderResponse;
import com.hadkarmeals.dto.PlaceOrderRequest;
import com.hadkarmeals.entity.*;
import com.hadkarmeals.exception.BusinessException;
import com.hadkarmeals.repository.MealRepository;
import com.hadkarmeals.repository.StudentRepository;
import com.hadkarmeals.service.LedgerService;
import com.hadkarmeals.service.OrderService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class OrderAndCutoffTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private MealRepository mealRepository;

    @Autowired
    private LedgerService ledgerService;

    private Student getOrCreateTestStudent() {
        return studentRepository.findByPhoneNumber("9820000004").orElseGet(() -> {
            return studentRepository.save(Student.builder()
                    .phoneNumber("9820000004")
                    .fullName("Rahul Sharma")
                    .active(true)
                    .build());
        });
    }

    @Test
    @Transactional
    void testOrderPlacementAndMultipleOrders() {
        Student rahul = getOrCreateTestStudent();
        Meal dinner = mealRepository.findByMealDateAndMealType(LocalDate.now(), MealType.DINNER).orElseThrow();

        BigDecimal balanceBefore = ledgerService.calculateCurrentBalance(rahul.getId());

        // 1. Place Full Order
        OrderResponse order = orderService.placeOrder(rahul.getId(), PlaceOrderRequest.builder()
                .mealId(dinner.getId())
                .orderType(OrderType.FULL)
                .quantity(1)
                .build());

        assertNotNull(order);
        assertEquals(dinner.getFullPrice(), order.getPriceAtOrder());
        assertEquals(OrderStatus.CONFIRMED, order.getStatus());

        // Balance must increase by full price
        BigDecimal balanceAfter = ledgerService.calculateCurrentBalance(rahul.getId());
        assertEquals(balanceBefore.add(dinner.getFullPrice()), balanceAfter);

        // 2. Multiple orders for same student and meal are supported!
        OrderResponse secondOrder = orderService.placeOrder(rahul.getId(), PlaceOrderRequest.builder()
                .mealId(dinner.getId())
                .orderType(OrderType.HALF)
                .quantity(2)
                .build());
        assertNotNull(secondOrder);
        assertEquals(OrderStatus.CONFIRMED, secondOrder.getStatus());

        // 3. Cancel first order before cutoff
        OrderResponse cancelled = orderService.cancelOrder(order.getId(), rahul.getId(), "Change of plans");
        assertEquals(OrderStatus.CANCELLED, cancelled.getStatus());
    }
}
