package com.hadkarmeals.service;

import com.hadkarmeals.dto.OrderResponse;
import com.hadkarmeals.dto.PlaceOrderRequest;
import com.hadkarmeals.entity.*;
import com.hadkarmeals.exception.BusinessException;
import com.hadkarmeals.exception.ResourceNotFoundException;
import com.hadkarmeals.repository.MealRepository;
import com.hadkarmeals.repository.OrderRepository;
import com.hadkarmeals.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final MealRepository mealRepository;
    private final StudentRepository studentRepository;
    private final ServiceStatusService serviceStatusService;
    private final LedgerService ledgerService;
    private final NotificationService notificationService;
    private final FirebaseNotificationService firebaseNotificationService;
    private final AuditLogService auditLogService;
    private final BillingService billingService;

    public OrderService(
            OrderRepository orderRepository,
            MealRepository mealRepository,
            StudentRepository studentRepository,
            ServiceStatusService serviceStatusService,
            LedgerService ledgerService,
            NotificationService notificationService,
            FirebaseNotificationService firebaseNotificationService,
            AuditLogService auditLogService,
            @Lazy BillingService billingService) {
        this.orderRepository = orderRepository;
        this.mealRepository = mealRepository;
        this.studentRepository = studentRepository;
        this.serviceStatusService = serviceStatusService;
        this.ledgerService = ledgerService;
        this.notificationService = notificationService;
        this.firebaseNotificationService = firebaseNotificationService;
        this.auditLogService = auditLogService;
        this.billingService = billingService;
    }

    @Transactional
    public OrderResponse placeOrder(Long studentId, PlaceOrderRequest request) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + studentId));

        if (!student.getActive()) {
            throw new BusinessException("Your account is currently inactive. Please contact Hadkar Meals admin.");
        }

        Meal meal = mealRepository.findById(request.getMealId())
                .orElseThrow(() -> new ResourceNotFoundException("Meal not found with ID: " + request.getMealId()));

        LocalDate orderDate = meal.getMealDate();
        MealType mealType = meal.getMealType();

        // 1. Check Service Closure
        if (serviceStatusService.isServiceClosed(orderDate, mealType)) {
            String reason = serviceStatusService.getClosureReason(orderDate, mealType);
            throw new BusinessException("Service is closed for " + mealType + " on " + orderDate + (reason != null ? " (" + reason + ")" : ""));
        }

        // 2. Check Meal Status
        if (meal.getStatus() != MealStatus.PUBLISHED) {
            throw new BusinessException("Orders are not currently open for this meal");
        }

        // 3. Check Cutoff Time
        if (orderDate.isEqual(LocalDate.now()) && LocalTime.now().isAfter(meal.getOrderCutoffTime())) {
            throw new BusinessException("Orders closed at " + meal.getOrderCutoffTime() + ". New orders can no longer be accepted.");
        }

        // 4. Quantity & Half Tiffin Choice & Price Snapshot
        int qty = (request.getQuantity() != null && request.getQuantity() > 0) ? request.getQuantity() : 1;
        String halfChoice = request.getHalfTiffinChoice();
        String selectedSabzi = request.getSelectedSabzi();
        int extraRotis = (request.getExtraRotis() != null && request.getExtraRotis() > 0) ? request.getExtraRotis() : 0;

        if (request.getOrderType() == OrderType.HALF) {
            if ("DAL_RICE".equalsIgnoreCase(halfChoice)) {
                // If Dal + Rice is chosen for Half Tiffin: NO extra rotis option!
                extraRotis = 0;
                selectedSabzi = "Dal + Steamed Rice";
                halfChoice = "DAL_RICE";
            } else {
                halfChoice = "SABZI_ROTI";
                if (selectedSabzi == null || selectedSabzi.trim().isEmpty()) {
                    selectedSabzi = meal.getMenuItems().stream()
                            .filter(item -> item.getCategory() == MenuItemCategory.SABZI)
                            .map(MenuItem::getName)
                            .findFirst()
                            .orElse("Today's Sabzi");
                }
            }
        } else {
            // Full Tiffin: comes with Sabzi + Roti + Dal + Rice
            halfChoice = "FULL";
            if (selectedSabzi == null || selectedSabzi.trim().isEmpty()) {
                selectedSabzi = meal.getMenuItems().stream()
                        .filter(item -> item.getCategory() == MenuItemCategory.SABZI)
                        .map(MenuItem::getName)
                        .findFirst()
                        .orElse("Today's Sabzi");
            }
        }

        // Validate if chosen sabzi is active (in stock)
        if (selectedSabzi != null && !selectedSabzi.contains("Dal")) {
            final String sabziCheck = selectedSabzi;
            boolean isSoldOut = meal.getMenuItems().stream()
                    .anyMatch(item -> item.getName().equalsIgnoreCase(sabziCheck) && Boolean.FALSE.equals(item.getActive()));
            if (isSoldOut) {
                throw new BusinessException("Orders for '" + selectedSabzi + "' have been stopped (Out of Stock). Please choose another available sabzi.");
            }
        }

        BigDecimal basePrice = request.getOrderType() == OrderType.FULL ? meal.getFullPrice() : meal.getHalfPrice();
        BigDecimal extraRotiCharge = new BigDecimal(extraRotis).multiply(new BigDecimal("6.00"));
        BigDecimal priceAtOrder = basePrice.multiply(new BigDecimal(qty)).add(extraRotiCharge);

        Order order = Order.builder()
                .student(student)
                .meal(meal)
                .orderDate(orderDate)
                .mealType(mealType)
                .orderType(request.getOrderType())
                .priceAtOrder(priceAtOrder)
                .selectedSabzi(selectedSabzi)
                .extraRotis(extraRotis)
                .quantity(qty)
                .halfTiffinChoice(halfChoice)
                .status(OrderStatus.CONFIRMED)
                .createdAt(LocalDateTime.now())
                .build();

        order = orderRepository.save(order);

        // 5. Record Ledger Charge
        String desc = (qty > 1 ? qty + "x " : "") + order.getOrderType() + " " + mealType + (extraRotis > 0 ? " (+" + extraRotis + " Extra Rotis)" : "") + " on " + orderDate;
        ledgerService.recordTransaction(
                student,
                priceAtOrder,
                TransactionType.ORDER_CHARGE,
                desc,
                "ORDER-" + order.getId(),
                "STUDENT:" + student.getPhoneNumber()
        );

        // 7. Audit Log
        auditLogService.log(
                "ORDER_PLACED",
                student.getPhoneNumber(),
                "Order",
                String.valueOf(order.getId()),
                "Placed " + order.getOrderType() + " " + mealType + " order" + (extraRotis > 0 ? " with " + extraRotis + " extra rotis" : "") + " (₹" + priceAtOrder + ")"
        );

        // 8. Notification
        notificationService.sendStudentNotification(
                student,
                "🍱 Order Confirmed!",
                "Your " + order.getOrderType() + " " + mealType + " order has been placed successfully for ₹" + priceAtOrder + ".",
                NotificationType.ORDER_CONFIRMATION,
                NotificationChannel.IN_APP
        );

        // 9. Update Monthly Bill
        String currentMonth = java.time.YearMonth.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM"));
        billingService.generateOrUpdateStudentBill(student.getId(), currentMonth, null);

        return mapToResponse(order);
    }

    @Transactional
    public OrderResponse cancelOrder(Long orderId, Long studentId, String reason) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));

        if (!order.getStudent().getId().equals(studentId)) {
            throw new BusinessException("You are not authorized to cancel this order");
        }

        if (order.getStatus() != OrderStatus.CONFIRMED) {
            throw new BusinessException("Order cannot be cancelled because it is in " + order.getStatus() + " status");
        }

        // Enforce Cutoff and Closed State (with 30-min grace period after order creation)
        Meal meal = order.getMeal();
        boolean withinGracePeriod = order.getCreatedAt() != null && 
                order.getCreatedAt().isAfter(LocalDateTime.now().minusMinutes(30));
        boolean beforeCutoff = order.getOrderDate().isEqual(LocalDate.now())
                && LocalTime.now().isBefore(meal.getOrderCutoffTime())
                && meal.getStatus() != MealStatus.CLOSED;

        if (!beforeCutoff && !withinGracePeriod) {
            throw new BusinessException("Dinner order accepting has closed (cutoff was " + meal.getOrderCutoffTime() + "). Cancellations are no longer available as kitchen preparation has begun.");
        }

        order.setStatus(OrderStatus.CANCELLED);
        order.setCancellationReason(reason != null ? reason : "Cancelled by student");
        order.setCancelledAt(LocalDateTime.now());
        order = orderRepository.save(order);

        // Reverse financial charge in ledger
        ledgerService.recordTransaction(
                order.getStudent(),
                order.getPriceAtOrder(),
                TransactionType.ORDER_REVERSAL,
                "Order #" + order.getId() + " cancellation reversal (" + order.getOrderType() + " " + order.getMealType() + ")",
                "ORDER-REV-" + order.getId(),
                "STUDENT:" + order.getStudent().getPhoneNumber()
        );

        // Audit log
        auditLogService.log(
                "ORDER_CANCELLED",
                order.getStudent().getPhoneNumber(),
                "Order",
                String.valueOf(order.getId()),
                "Student cancelled order #" + order.getId()
        );

        // Notification
        notificationService.sendStudentNotification(
                order.getStudent(),
                "❌ Order Cancelled",
                "Your " + order.getMealType() + " order has been cancelled and ₹" + order.getPriceAtOrder() + " has been reversed to your balance.",
                NotificationType.ORDER_CANCELLATION,
                NotificationChannel.IN_APP
        );

        // Update Monthly Bill
        String currentMonth = java.time.YearMonth.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM"));
        billingService.generateOrUpdateStudentBill(order.getStudent().getId(), currentMonth, null);

        return mapToResponse(order);
    }

    @Transactional
    public OrderResponse editOrder(Long orderId, Long studentId, PlaceOrderRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));

        if (!order.getStudent().getId().equals(studentId)) {
            throw new BusinessException("You are not authorized to edit this order.");
        }

        if (order.getStatus() != OrderStatus.CONFIRMED) {
            throw new BusinessException("Order cannot be edited because it is in " + order.getStatus() + " status.");
        }

        Meal meal = order.getMeal();
        if (!order.getOrderDate().isEqual(LocalDate.now())
                || LocalTime.now().isAfter(meal.getOrderCutoffTime())
                || meal.getStatus() == MealStatus.CLOSED) {
            throw new BusinessException("Orders closed at " + meal.getOrderCutoffTime() + ". Edits can no longer be accepted.");
        }

        // 1. Calculate new options
        String halfChoice = request.getHalfTiffinChoice();
        String selectedSabzi = request.getSelectedSabzi();
        int extraRotis = (request.getExtraRotis() != null && request.getExtraRotis() > 0) ? request.getExtraRotis() : 0;
        int qty = (request.getQuantity() != null && request.getQuantity() > 0) ? request.getQuantity() : 1;

        if (request.getOrderType() == OrderType.HALF) {
            if ("DAL_RICE".equalsIgnoreCase(halfChoice)) {
                extraRotis = 0;
                selectedSabzi = "Dal + Steamed Rice";
                halfChoice = "DAL_RICE";
            } else {
                halfChoice = "SABZI_ROTI";
                if (selectedSabzi == null || selectedSabzi.trim().isEmpty()) {
                    selectedSabzi = meal.getMenuItems().stream()
                            .filter(item -> item.getCategory() == MenuItemCategory.SABZI)
                            .map(MenuItem::getName)
                            .findFirst()
                            .orElse("Today's Sabzi");
                }
            }
        } else {
            halfChoice = "FULL";
            if (selectedSabzi == null || selectedSabzi.trim().isEmpty()) {
                selectedSabzi = meal.getMenuItems().stream()
                        .filter(item -> item.getCategory() == MenuItemCategory.SABZI)
                        .map(MenuItem::getName)
                        .findFirst()
                        .orElse("Today's Sabzi");
            }
        }

        BigDecimal basePrice = request.getOrderType() == OrderType.FULL ? meal.getFullPrice() : meal.getHalfPrice();
        BigDecimal extraRotiCharge = new BigDecimal(extraRotis).multiply(new BigDecimal("6.00"));
        BigDecimal newPrice = basePrice.multiply(new BigDecimal(qty)).add(extraRotiCharge);

        BigDecimal oldPrice = order.getPriceAtOrder();
        BigDecimal diff = newPrice.subtract(oldPrice);

        if (diff.compareTo(BigDecimal.ZERO) > 0) {
            ledgerService.recordTransaction(
                    order.getStudent(),
                    diff,
                    TransactionType.ORDER_CHARGE,
                    "Order #" + order.getId() + " modification charge adjustment",
                    "ORDER-ADJ-" + order.getId(),
                    "STUDENT:" + order.getStudent().getPhoneNumber()
            );
        } else if (diff.compareTo(BigDecimal.ZERO) < 0) {
            ledgerService.recordTransaction(
                    order.getStudent(),
                    diff.abs(),
                    TransactionType.ORDER_REVERSAL,
                    "Order #" + order.getId() + " modification credit adjustment",
                    "ORDER-ADJ-" + order.getId(),
                    "STUDENT:" + order.getStudent().getPhoneNumber()
            );
        }

        order.setOrderType(request.getOrderType());
        order.setHalfTiffinChoice(halfChoice);
        order.setSelectedSabzi(selectedSabzi);
        order.setExtraRotis(extraRotis);
        order.setQuantity(qty);
        order.setPriceAtOrder(newPrice);
        order = orderRepository.save(order);

        auditLogService.log(
                "ORDER_EDITED",
                order.getStudent().getPhoneNumber(),
                "Order",
                String.valueOf(order.getId()),
                "Student edited order #" + order.getId() + ": " + qty + "x " + order.getOrderType() + " (₹" + newPrice + ")"
        );

        notificationService.sendStudentNotification(
                order.getStudent(),
                "✏️ Order Updated!",
                "Your order #" + order.getId() + " has been updated. Total amount: ₹" + newPrice + ".",
                NotificationType.ORDER_CONFIRMATION,
                NotificationChannel.IN_APP
        );

        // Update Monthly Bill
        String currentMonth = java.time.YearMonth.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM"));
        billingService.generateOrUpdateStudentBill(order.getStudent().getId(), currentMonth, null);

        return mapToResponse(order);
    }

    @Transactional
    public OrderResponse adminCancelOrder(Long orderId, String reason, String adminUsername) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));

        order.setStatus(OrderStatus.CANCELLED_BY_ADMIN);
        order.setCancellationReason(reason != null ? reason : "Cancelled by Admin");
        order.setCancelledAt(LocalDateTime.now());
        order = orderRepository.save(order);

        ledgerService.recordTransaction(
                order.getStudent(),
                order.getPriceAtOrder(),
                TransactionType.ORDER_REVERSAL,
                "Admin cancellation of order #" + order.getId() + ": " + reason,
                "ORDER-REV-" + order.getId(),
                adminUsername
        );

        auditLogService.log(
                "ORDER_CANCELLED_BY_ADMIN",
                adminUsername,
                "Order",
                String.valueOf(order.getId()),
                "Admin cancelled order #" + order.getId() + " (Reason: " + reason + ")"
        );

        notificationService.sendStudentNotification(
                order.getStudent(),
                "⚠️ Order Cancelled by Admin",
                "Your order #" + order.getId() + " was cancelled by admin (" + reason + "). ₹" + order.getPriceAtOrder() + " was credited back.",
                NotificationType.ORDER_CANCELLATION,
                NotificationChannel.IN_APP
        );

        // Update Monthly Bill
        String currentMonth = java.time.YearMonth.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM"));
        billingService.generateOrUpdateStudentBill(order.getStudent().getId(), currentMonth, null);

        return mapToResponse(order);
    }

    @Transactional
    public OrderResponse deliverOrder(Long orderId, String adminUsername) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));

        order.setStatus(OrderStatus.DELIVERED);
        order = orderRepository.save(order);

        String hostelName = order.getStudent().getHostel() != null ? order.getStudent().getHostel().getName() : "your hostel";

        auditLogService.log(
                "ORDER_DELIVERED",
                adminUsername != null ? adminUsername : "ADMIN",
                "Order",
                String.valueOf(order.getId()),
                "Order #" + order.getId() + " delivered to " + hostelName
        );

        notificationService.sendStudentNotification(
                order.getStudent(),
                "🎉 Dinner Order Delivered!",
                "Your hot dinner tiffin has been delivered to " + hostelName + "! Please collect your tiffin now. Enjoy your meal! 🍱",
                NotificationType.ORDER_DELIVERED,
                NotificationChannel.IN_APP
        );

        if (order.getStudent().getUser() != null) {
            firebaseNotificationService.sendPushToUser(
                    order.getStudent().getUser().getId(),
                    "🎉 Dinner Order Delivered!",
                    "Your hot dinner tiffin has been delivered to " + hostelName + "! Please collect your tiffin now. Enjoy your meal! 🍱",
                    "/student/dashboard"
            );
        }

        return mapToResponse(order);
    }

    @Transactional
    public int deliverOrdersByHostel(Long hostelId, LocalDate date, String adminUsername) {
        LocalDate queryDate = date != null ? date : LocalDate.now();
        List<Order> orders = orderRepository.findByDateAndHostelIdAndStatus(queryDate, hostelId, OrderStatus.CONFIRMED);

        String hostelName = "your hostel";
        for (Order order : orders) {
            order.setStatus(OrderStatus.DELIVERED);
            orderRepository.save(order);

            if (order.getStudent().getHostel() != null) {
                hostelName = order.getStudent().getHostel().getName();
            }

            auditLogService.log(
                    "ORDER_DELIVERED_HOSTEL",
                    adminUsername != null ? adminUsername : "ADMIN",
                    "Order",
                    String.valueOf(order.getId()),
                    "Delivered order #" + order.getId() + " to " + hostelName
            );

            notificationService.sendStudentNotification(
                    order.getStudent(),
                    "🎉 Dinner Order Delivered!",
                    "Your hot dinner tiffin has been delivered to " + hostelName + "! Please collect your tiffin now. Enjoy your meal! 🍱",
                    NotificationType.ORDER_DELIVERED,
                    NotificationChannel.IN_APP
            );
        }

        // Send FCM multicast push to all students of this hostel
        if (!orders.isEmpty()) {
            firebaseNotificationService.sendPushToHostel(
                    hostelId,
                    "🎉 Dinner Tiffins Delivered!",
                    "Hot dinner tiffins have arrived at " + hostelName + "! Please collect your meal now. Enjoy! 🍱",
                    "/student/dashboard"
            );
        }

        return orders.size();
    }

    public List<OrderResponse> getStudentOrders(Long studentId) {
        return orderRepository.findByStudentIdOrderByOrderDateDesc(studentId)
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public List<OrderResponse> getAllOrders(LocalDate date, MealType mealType) {
        List<Order> orders;
        if (date != null && mealType != null) {
            orders = orderRepository.findByOrderDateAndMealTypeAndStatusIn(
                    date, mealType, List.of(OrderStatus.CONFIRMED, OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.CANCELLED_BY_ADMIN, OrderStatus.COMPLETED));
        } else if (date != null) {
            orders = orderRepository.findByOrderDateAndStatusIn(
                    date, List.of(OrderStatus.CONFIRMED, OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.CANCELLED_BY_ADMIN, OrderStatus.COMPLETED));
        } else {
            orders = orderRepository.findAll();
        }
        return orders.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    private OrderResponse mapToResponse(Order order) {
        boolean withinGracePeriod = order.getCreatedAt() != null && 
                order.getCreatedAt().isAfter(LocalDateTime.now().minusMinutes(30));
        boolean canCancel = order.getStatus() == OrderStatus.CONFIRMED
                && (withinGracePeriod || (order.getOrderDate().isEqual(LocalDate.now())
                && LocalTime.now().isBefore(order.getMeal().getOrderCutoffTime())
                && order.getMeal().getStatus() == com.hadkarmeals.entity.MealStatus.PUBLISHED));

        return OrderResponse.builder()
                .id(order.getId())
                .studentId(order.getStudent().getId())
                .studentName(order.getStudent().getFullName())
                .studentPhone(order.getStudent().getPhoneNumber())
                .hostelName(order.getStudent().getHostel() != null ? order.getStudent().getHostel().getName() : "")
                .mealId(order.getMeal().getId())
                .orderDate(order.getOrderDate())
                .mealType(order.getMealType())
                .orderType(order.getOrderType())
                .halfTiffinChoice(order.getHalfTiffinChoice())
                .priceAtOrder(order.getPriceAtOrder())
                .selectedSabzi(order.getSelectedSabzi())
                .extraRotis(order.getExtraRotis() != null ? order.getExtraRotis() : 0)
                .quantity(order.getQuantity() != null ? order.getQuantity() : 1)
                .status(order.getStatus())
                .cancellationReason(order.getCancellationReason())
                .cancelledAt(order.getCancelledAt())
                .createdAt(order.getCreatedAt())
                .canCancel(canCancel)
                .build();
    }
}
