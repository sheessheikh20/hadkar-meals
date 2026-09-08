package com.hadkarmeals.service;

import com.hadkarmeals.dto.KitchenSheetResponse;
import com.hadkarmeals.entity.MealType;
import com.hadkarmeals.entity.Order;
import com.hadkarmeals.entity.OrderStatus;
import com.hadkarmeals.entity.OrderType;
import com.hadkarmeals.repository.OrderRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

@Service
public class KitchenService {

    private static final java.time.ZoneId IST = java.time.ZoneId.of("Asia/Kolkata");
    private final OrderRepository orderRepository;

    public KitchenService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public KitchenSheetResponse getKitchenSheet(LocalDate date, MealType mealType) {
        LocalDate queryDate = date != null ? date : LocalDate.now(IST);
        MealType queryType = MealType.DINNER; // Dinner-only service

        List<Order> orders = orderRepository.findByOrderDateAndMealTypeAndStatusIn(
                queryDate, queryType, List.of(OrderStatus.CONFIRMED, OrderStatus.DELIVERED));

        // Sort by Location (Hostel) name, then student name
        orders.sort((a, b) -> {
            String h1 = a.getStudent().getHostel() != null ? a.getStudent().getHostel().getName() : "";
            String h2 = b.getStudent().getHostel() != null ? b.getStudent().getHostel().getName() : "";
            int cmp = h1.compareToIgnoreCase(h2);
            if (cmp != 0) return cmp;
            return a.getStudent().getFullName().compareToIgnoreCase(b.getStudent().getFullName());
        });

        long fullCount = 0;
        long halfCount = 0;
        long totalRotis = 0;
        long totalExtraRotis = 0;
        List<KitchenSheetResponse.KitchenOrderItem> items = new ArrayList<>();
        Map<String, KitchenSheetResponse.HostelCount> breakdown = new HashMap<>();

        Map<String, Long> sabziBreakdown = new HashMap<>();

        for (Order o : orders) {
            int qty = o.getQuantity() != null && o.getQuantity() > 0 ? o.getQuantity() : 1;
            if (o.getOrderType() == OrderType.FULL) fullCount += qty;
            else halfCount += qty;

            int extra = o.getExtraRotis() != null ? o.getExtraRotis() : 0;
            totalExtraRotis += extra;
            boolean isDalRice = o.getOrderType() == OrderType.HALF && "DAL_RICE".equalsIgnoreCase(o.getHalfTiffinChoice());
            if (!isDalRice) {
                totalRotis += (4L * qty) + extra; // 4 rotis per tiffin + extra rotis (Dal+Rice has 0 rotis)
            }

            String hostelName = o.getStudent().getHostel() != null ? o.getStudent().getHostel().getName() : "Unassigned";
            String sabziName = isDalRice ? "Dal + Steamed Rice" : (o.getSelectedSabzi() != null ? o.getSelectedSabzi() : "Standard Sabzi");
            sabziBreakdown.put(sabziName, sabziBreakdown.getOrDefault(sabziName, 0L) + qty);

            LocalTime orderTime = o.getCreatedAt() != null ? o.getCreatedAt().toLocalTime() : LocalTime.now(IST);

            items.add(KitchenSheetResponse.KitchenOrderItem.builder()
                    .orderId(o.getId())
                    .hostelName(hostelName)
                    .studentName(o.getStudent().getFullName())
                    .studentPhone(o.getStudent().getPhoneNumber())
                    .orderType(o.getOrderType())
                    .halfTiffinChoice(o.getHalfTiffinChoice())
                    .selectedSabzi(sabziName)
                    .extraRotis(extra)
                    .quantity(qty)
                    .orderedAt(orderTime)
                    .build());

            KitchenSheetResponse.HostelCount hc = breakdown.computeIfAbsent(hostelName,
                    k -> new KitchenSheetResponse.HostelCount(0, 0, 0));
            if (o.getOrderType() == OrderType.FULL) {
                hc.setFull(hc.getFull() + qty);
            } else {
                hc.setHalf(hc.getHalf() + qty);
            }
            hc.setTotal(hc.getTotal() + qty);
        }

        return KitchenSheetResponse.builder()
                .date(queryDate)
                .mealType(queryType)
                .totalOrders(orders.size())
                .totalFull(fullCount)
                .totalHalf(halfCount)
                .totalRotis(totalRotis)
                .totalExtraRotis(totalExtraRotis)
                .items(items)
                .hostelBreakdown(breakdown)
                .sabziBreakdown(sabziBreakdown)
                .build();
    }
}
