package com.hadkarmeals.service;

import com.hadkarmeals.dto.CreateMealRequest;
import com.hadkarmeals.dto.CreateMenuItemRequest;
import com.hadkarmeals.dto.MealResponse;
import com.hadkarmeals.dto.OrderResponse;
import com.hadkarmeals.entity.*;
import com.hadkarmeals.exception.BusinessException;
import com.hadkarmeals.exception.ResourceNotFoundException;
import com.hadkarmeals.repository.MealRepository;
import com.hadkarmeals.repository.MenuItemRepository;
import com.hadkarmeals.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class MenuService {

    private final MealRepository mealRepository;
    private final MenuItemRepository menuItemRepository;
    private final OrderRepository orderRepository;
    private final ServiceStatusService serviceStatusService;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    public MenuService(
            MealRepository mealRepository,
            MenuItemRepository menuItemRepository,
            OrderRepository orderRepository,
            ServiceStatusService serviceStatusService,
            NotificationService notificationService,
            AuditLogService auditLogService) {
        this.mealRepository = mealRepository;
        this.menuItemRepository = menuItemRepository;
        this.orderRepository = orderRepository;
        this.serviceStatusService = serviceStatusService;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public Meal createOrUpdateMeal(CreateMealRequest request, String adminUsername) {
        Optional<Meal> existing = mealRepository.findByMealDateAndMealType(request.getMealDate(), request.getMealType());

        List<MenuItem> items = new ArrayList<>();
        if (request.getMenuItemIds() != null && !request.getMenuItemIds().isEmpty()) {
            items = menuItemRepository.findAllById(request.getMenuItemIds());
        }

        Meal meal;
        if (existing.isPresent()) {
            meal = existing.get();
            meal.setHalfPrice(request.getHalfPrice());
            meal.setFullPrice(request.getFullPrice());
            meal.setOrderOpenTime(request.getOrderOpenTime());
            meal.setOrderCutoffTime(request.getOrderCutoffTime());
            meal.setMenuItems(items);
        } else {
            meal = Meal.builder()
                    .mealDate(request.getMealDate())
                    .mealType(request.getMealType())
                    .halfPrice(request.getHalfPrice())
                    .fullPrice(request.getFullPrice())
                    .orderOpenTime(request.getOrderOpenTime())
                    .orderCutoffTime(request.getOrderCutoffTime())
                    .status(MealStatus.PUBLISHED)
                    .menuItems(items)
                    .build();
        }

        meal = mealRepository.save(meal);

        auditLogService.log(
                "MEAL_SAVED",
                adminUsername,
                "Meal",
                String.valueOf(meal.getId()),
                "Saved " + meal.getMealType() + " menu for " + meal.getMealDate() + " (Half: ₹" + meal.getHalfPrice() + ", Full: ₹" + meal.getFullPrice() + ")"
        );

        return meal;
    }

    @Transactional
    public Meal publishMeal(Long mealId, boolean notifyStudents, String adminUsername) {
        Meal meal = mealRepository.findById(mealId)
                .orElseThrow(() -> new ResourceNotFoundException("Meal not found with ID: " + mealId));

        meal.setStatus(MealStatus.PUBLISHED);
        meal = mealRepository.save(meal);

        auditLogService.log(
                "MENU_PUBLISHED",
                adminUsername,
                "Meal",
                String.valueOf(meal.getId()),
                "Published " + meal.getMealType() + " menu for " + meal.getMealDate()
        );

        if (notifyStudents) {
            String mealName = meal.getMealType() == MealType.LUNCH ? "Lunch" : "Dinner";
            notificationService.broadcast(
                    "🍱 Today's " + mealName + " Menu is Live!",
                    "Today's " + mealName + " menu is now open for orders! Cutoff time: " + meal.getOrderCutoffTime() + ". Order via Hadkar Meals portal.",
                    NotificationChannel.IN_APP,
                    "ALL_ACTIVE",
                    null,
                    null,
                    null
            );
        }

        return meal;
    }

    @Transactional
    public void deleteMeal(Long mealId, String adminUsername) {
        Meal meal = mealRepository.findById(mealId)
                .orElseThrow(() -> new ResourceNotFoundException("Meal not found with ID: " + mealId));

        long ordersCount = orderRepository.countByMealId(mealId);
        if (ordersCount > 0) {
            // Revert status to CLOSED and clear menu items so it can be reconfigured cleanly
            meal.setStatus(MealStatus.CLOSED);
            meal.getMenuItems().clear();
            mealRepository.save(meal);
            auditLogService.log(
                    "MEAL_RESET",
                    adminUsername,
                    "Meal",
                    String.valueOf(meal.getId()),
                    "Reset dinner menu (" + ordersCount + " existing orders preserved)"
            );
        } else {
            mealRepository.delete(meal);
            auditLogService.log(
                    "MEAL_DELETED",
                    adminUsername,
                    "Meal",
                    String.valueOf(mealId),
                    "Deleted dinner menu for " + meal.getMealDate()
            );
        }
    }

    @Transactional
    public Meal closeMeal(Long mealId, String reason, String adminUsername) {
        Meal meal = mealRepository.findById(mealId)
                .orElseThrow(() -> new ResourceNotFoundException("Meal not found with ID: " + mealId));

        meal.setStatus(MealStatus.CLOSED);
        meal.setEmergencyReason(reason != null && !reason.trim().isEmpty() ? reason : "Dinner orders are closed for tonight");
        meal = mealRepository.save(meal);

        auditLogService.log(
                "MEAL_CLOSED",
                adminUsername,
                "Meal",
                String.valueOf(meal.getId()),
                "Closed dinner orders for " + meal.getMealDate() + " (Reason: " + meal.getEmergencyReason() + ")"
        );

        notificationService.broadcast(
                "⛔ Tonight's Dinner Orders Closed",
                "Tonight's dinner orders are closed (" + meal.getMealDate() + "). Thank you for ordering with Hadkar Meals!",
                NotificationChannel.IN_APP,
                "ALL_ACTIVE",
                null,
                null,
                null
        );
        return meal;
    }

    @Transactional
    public Meal reopenMeal(Long mealId, String adminUsername) {
        Meal meal = mealRepository.findById(mealId)
                .orElseThrow(() -> new ResourceNotFoundException("Meal not found with ID: " + mealId));

        meal.setStatus(MealStatus.PUBLISHED);
        meal.setEmergencyReason(null);
        meal = mealRepository.save(meal);

        auditLogService.log(
                "MEAL_REOPENED",
                adminUsername,
                "Meal",
                String.valueOf(meal.getId()),
                "Reopened dinner orders for " + meal.getMealDate()
        );

        notificationService.broadcast(
                "🟢 Tonight's Dinner Orders Re-Opened!",
                "Dinner orders for tonight (" + meal.getMealDate() + ") are now RE-OPENED! Place your tiffin orders now before " + meal.getOrderCutoffTime() + ".",
                NotificationChannel.IN_APP,
                "ALL_ACTIVE",
                null,
                null,
                null
        );
        return meal;
    }

    private static final java.time.ZoneId IST = java.time.ZoneId.of("Asia/Kolkata");

    public List<MealResponse> getTodayMeals(Long studentId) {
        LocalDate today = LocalDate.now(IST);
        LocalTime now = LocalTime.now(IST);

        List<Meal> meals = mealRepository.findByMealDate(today);
        List<MealResponse> responses = new ArrayList<>();

        MealType type = MealType.DINNER;
        Optional<Meal> mealOpt = meals.stream().filter(m -> m.getMealType() == type).findFirst();
        boolean isClosed = serviceStatusService.isDinnerServiceClosed(today);
        String closureReason = serviceStatusService.getClosureReason(today, type);

        if (mealOpt.isPresent()) {
            Meal m = mealOpt.get();
            boolean isBeforeOpen = m.getOrderOpenTime() != null && now.isBefore(m.getOrderOpenTime());
            boolean cutoff = m.getOrderCutoffTime() != null && now.isAfter(m.getOrderCutoffTime());
            boolean isOpen = m.getStatus() == MealStatus.PUBLISHED && !isClosed && !cutoff && !isBeforeOpen;

            OrderResponse userOrder = null;
            List<OrderResponse> userOrders = new ArrayList<>();
            if (studentId != null) {
                List<Order> activeOrders = orderRepository.findAllByStudentIdAndOrderDateAndMealTypeAndStatusIn(
                        studentId, today, type, List.of(OrderStatus.CONFIRMED, OrderStatus.DELIVERED));
                userOrders = activeOrders.stream().map(o -> OrderResponse.builder()
                        .id(o.getId())
                        .studentId(studentId)
                        .orderDate(o.getOrderDate())
                        .mealType(o.getMealType())
                        .orderType(o.getOrderType())
                        .halfTiffinChoice(o.getHalfTiffinChoice())
                        .selectedSabzi(o.getSelectedSabzi())
                        .extraRotis(o.getExtraRotis() != null ? o.getExtraRotis() : 0)
                        .quantity(o.getQuantity() != null ? o.getQuantity() : 1)
                        .priceAtOrder(o.getPriceAtOrder())
                        .status(o.getStatus())
                        .createdAt(o.getCreatedAt())
                        .canCancel(o.getStatus() == OrderStatus.CONFIRMED && ((o.getCreatedAt() != null && o.getCreatedAt().isAfter(java.time.LocalDateTime.now(IST).minusMinutes(30))) || (!cutoff && !isClosed)))
                        .build()).collect(Collectors.toList());

                if (!userOrders.isEmpty()) {
                    userOrder = userOrders.get(0);
                }
            }

            responses.add(MealResponse.builder()
                    .id(m.getId())
                    .mealDate(m.getMealDate())
                    .mealType(m.getMealType())
                    .halfPrice(m.getHalfPrice())
                    .fullPrice(m.getFullPrice())
                    .orderOpenTime(m.getOrderOpenTime())
                    .orderCutoffTime(m.getOrderCutoffTime())
                    .status(m.getStatus())
                    .emergencyReason(m.getEmergencyReason())
                    .menuItems(m.getMenuItems())
                    .cutoffReached(cutoff)
                    .notOpenYet(isBeforeOpen)
                    .open(isOpen)
                    .closedToday(isClosed)
                    .closureReason(closureReason)
                    .userActiveOrder(userOrder)
                    .userActiveOrders(userOrders)
                    .build());
        }
        return responses;
    }

    public List<MenuItem> getAllMenuItems() {
        return menuItemRepository.findAll();
    }

    @Transactional
    public MenuItem createMenuItem(CreateMenuItemRequest request) {
        if (menuItemRepository.findByName(request.getName()).isPresent()) {
            throw new BusinessException("Menu item with name '" + request.getName() + "' already exists");
        }
        MenuItem item = MenuItem.builder()
                .name(request.getName())
                .category(request.getCategory())
                .description(request.getDescription())
                .active(true)
                .build();
        return menuItemRepository.save(item);
    }

    @Transactional
    public MenuItem updateMenuItem(Long id, CreateMenuItemRequest request) {
        MenuItem item = menuItemRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Menu item not found with id: " + id));
        item.setName(request.getName());
        item.setCategory(request.getCategory());
        item.setDescription(request.getDescription());
        return menuItemRepository.save(item);
    }

    @Transactional
    public MenuItem toggleMenuItem(Long id) {
        MenuItem item = menuItemRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Menu item not found with id: " + id));
        item.setActive(!Boolean.TRUE.equals(item.getActive()));
        item = menuItemRepository.save(item);

        if (Boolean.TRUE.equals(item.getActive())) {
            notificationService.broadcast(
                    "🟢 " + item.getName() + " Orders Re-Opened!",
                    "Good news! Orders for " + item.getName() + " are now RE-OPENED for tonight. You can select it in your dinner tiffin.",
                    NotificationChannel.IN_APP,
                    "ALL_ACTIVE",
                    null,
                    null,
                    null
            );
        } else {
            notificationService.broadcast(
                    "⚠️ " + item.getName() + " Orders Closed",
                    "Orders for " + item.getName() + " have been stopped for tonight as stock has run out. Other menu items remain available.",
                    NotificationChannel.IN_APP,
                    "ALL_ACTIVE",
                    null,
                    null,
                    null
            );
        }

        return item;
    }

    @Transactional
    public void deleteMenuItem(Long id) {
        MenuItem item = menuItemRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Menu item not found with id: " + id));
        List<Meal> meals = mealRepository.findAll();
        for (Meal m : meals) {
            if (m.getMenuItems() != null && m.getMenuItems().removeIf(i -> i.getId().equals(id))) {
                mealRepository.save(m);
            }
        }
        menuItemRepository.delete(item);
    }
}
