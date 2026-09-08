package com.hadkarmeals.service;

import com.hadkarmeals.dto.DashboardStatsResponse;
import com.hadkarmeals.dto.OrderResponse;
import com.hadkarmeals.entity.*;
import com.hadkarmeals.repository.MealRepository;
import com.hadkarmeals.repository.MonthlyBillRepository;
import com.hadkarmeals.repository.OrderRepository;
import com.hadkarmeals.repository.StudentRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class ReportService {

    private final OrderRepository orderRepository;
    private final MealRepository mealRepository;
    private final StudentRepository studentRepository;
    private final MonthlyBillRepository billRepository;
    private final ServiceStatusService serviceStatusService;
    private final LedgerService ledgerService;

    public ReportService(
            OrderRepository orderRepository,
            MealRepository mealRepository,
            StudentRepository studentRepository,
            MonthlyBillRepository billRepository,
            ServiceStatusService serviceStatusService,
            LedgerService ledgerService) {
        this.orderRepository = orderRepository;
        this.mealRepository = mealRepository;
        this.studentRepository = studentRepository;
        this.billRepository = billRepository;
        this.serviceStatusService = serviceStatusService;
        this.ledgerService = ledgerService;
    }

    public DashboardStatsResponse getDashboardStats() {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        // 1. Today active dinner orders (CONFIRMED + DELIVERED)
        List<Order> todayOrders = orderRepository.findByOrderDateAndStatusIn(
                today, List.of(OrderStatus.CONFIRMED, OrderStatus.DELIVERED));

        int totalTiffinsCount = todayOrders.stream()
                .mapToInt(o -> o.getQuantity() != null && o.getQuantity() > 0 ? o.getQuantity() : 1)
                .sum();

        BigDecimal todayEstimatedRevenue = todayOrders.stream()
                .map(Order::getPriceAtOrder)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 2. Active students
        List<Student> activeStudents = studentRepository.findByActive(true);
        long activeStudentsCount = activeStudents.size();

        // 3. Live ledger outstanding balances across all active customers
        BigDecimal totalOutstanding = BigDecimal.ZERO;
        long pendingBillsCount = 0;
        for (Student student : activeStudents) {
            BigDecimal balance = ledgerService.calculateCurrentBalance(student.getId());
            if (balance.compareTo(BigDecimal.ZERO) > 0) {
                totalOutstanding = totalOutstanding.add(balance);
                pendingBillsCount++;
            }
        }

        // 4. Dinner details & stats
        List<Meal> meals = mealRepository.findByMealDate(today);
        Optional<Meal> dinnerOpt = meals.stream().filter(m -> m.getMealType() == MealType.DINNER).findFirst();

        DashboardStatsResponse.MealStat dinnerStat = buildMealStat(today, MealType.DINNER, dinnerOpt, todayOrders);

        // 5. Overall Dinner Service Status & Banner
        String serviceStatus = "OPEN";
        String serviceBanner = "🟢 Hadkar Meals Dinner Service is OPEN";
        List<String> alerts = new ArrayList<>();

        boolean isDinnerClosed = serviceStatusService.isDinnerServiceClosed(today);

        if (isDinnerClosed) {
            serviceStatus = "HOLIDAY";
            serviceBanner = "🏖️ Dinner Service is CLOSED today: " + serviceStatusService.getClosureReason(today, MealType.DINNER);
        } else if (dinnerOpt.isEmpty()) {
            alerts.add("⚠️ Today's Dinner menu has not been published.");
            serviceStatus = "CLOSED";
            serviceBanner = "🔴 Today's Dinner menu has not been published yet.";
        } else {
            Meal d = dinnerOpt.get();
            if (d.getStatus() == MealStatus.PUBLISHED) {
                if (now.isBefore(d.getOrderCutoffTime())) {
                    long minutesLeft = java.time.Duration.between(now, d.getOrderCutoffTime()).toMinutes();
                    if (minutesLeft <= 30) {
                        serviceStatus = "CLOSING_SOON";
                        serviceBanner = "🟡 Dinner orders close in " + minutesLeft + " minutes (" + d.getOrderCutoffTime() + ")!";
                    } else {
                        serviceBanner = "🟢 Dinner orders open until " + d.getOrderCutoffTime();
                    }
                } else {
                    serviceStatus = "CLOSED";
                    serviceBanner = "🔒 Dinner orders closed at " + d.getOrderCutoffTime();
                }
            } else if (d.getStatus() == MealStatus.CLOSED) {
                serviceStatus = "CLOSED";
                String reason = d.getEmergencyReason();
                if (reason != null && !reason.isBlank() && !reason.toLowerCase().contains("admin") && !reason.toLowerCase().contains("manual")) {
                    serviceBanner = "⛔ Dinner orders closed (" + reason + ")";
                } else {
                    serviceBanner = "⛔ Dinner orders are closed for tonight";
                }
            } else {
                serviceStatus = "CLOSED";
                serviceBanner = "⛔ Dinner orders are closed for tonight";
            }
        }

        if (pendingBillsCount > 0) {
            alerts.add("💰 " + pendingBillsCount + " customers have pending balance (Total: ₹" + totalOutstanding + ")");
        }

        List<OrderResponse> recentOrders = todayOrders.stream()
                .map(o -> OrderResponse.builder()
                        .id(o.getId())
                        .studentId(o.getStudent().getId())
                        .studentName(o.getStudent().getFullName())
                        .studentPhone(o.getStudent().getPhoneNumber())
                        .hostelName(o.getStudent().getHostel() != null ? o.getStudent().getHostel().getName() : "")
                        .mealId(o.getMeal().getId())
                        .orderDate(o.getOrderDate())
                        .mealType(o.getMealType())
                        .orderType(o.getOrderType())
                        .halfTiffinChoice(o.getHalfTiffinChoice())
                        .selectedSabzi(o.getSelectedSabzi())
                        .quantity(o.getQuantity() != null ? o.getQuantity() : 1)
                        .extraRotis(o.getExtraRotis() != null ? o.getExtraRotis() : 0)
                        .priceAtOrder(o.getPriceAtOrder())
                        .status(o.getStatus())
                        .createdAt(o.getCreatedAt())
                        .build())
                .sorted(java.util.Comparator.comparing(com.hadkarmeals.dto.OrderResponse::getId).reversed())
                .toList();

        return DashboardStatsResponse.builder()
                .todayOrdersCount(totalTiffinsCount)
                .todayEstimatedRevenue(todayEstimatedRevenue)
                .activeStudentsCount(activeStudentsCount)
                .pendingBillsCount(pendingBillsCount)
                .totalOutstandingAmount(totalOutstanding)
                .dinner(dinnerStat)
                .serviceStatus(serviceStatus)
                .serviceBannerText(serviceBanner)
                .alerts(alerts)
                .recentOrders(recentOrders)
                .build();
    }

    private DashboardStatsResponse.MealStat buildMealStat(LocalDate today, MealType type, Optional<Meal> mealOpt, List<Order> orders) {
        long full = orders.stream()
                .filter(o -> o.getMealType() == type && o.getOrderType() == OrderType.FULL)
                .mapToLong(o -> o.getQuantity() != null && o.getQuantity() > 0 ? o.getQuantity() : 1)
                .sum();
        long half = orders.stream()
                .filter(o -> o.getMealType() == type && o.getOrderType() == OrderType.HALF)
                .mapToLong(o -> o.getQuantity() != null && o.getQuantity() > 0 ? o.getQuantity() : 1)
                .sum();

        boolean serviceClosed = serviceStatusService.isDinnerServiceClosed(today);
        boolean mealClosed = mealOpt.map(m -> m.getStatus() == MealStatus.CLOSED).orElse(false);

        return DashboardStatsResponse.MealStat.builder()
                .fullCount(full)
                .halfCount(half)
                .totalCount(full + half)
                .status(mealOpt.map(m -> m.getStatus().name()).orElse("NOT_CREATED"))
                .cutoffTime(mealOpt.map(m -> m.getOrderCutoffTime().toString()).orElse("N/A"))
                .isPublished(mealOpt.map(m -> m.getStatus() == MealStatus.PUBLISHED).orElse(false))
                .isClosed(serviceClosed || mealClosed)
                .build();
    }
}
