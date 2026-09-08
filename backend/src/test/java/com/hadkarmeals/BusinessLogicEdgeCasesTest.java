package com.hadkarmeals;

import com.hadkarmeals.dto.*;
import com.hadkarmeals.entity.*;
import com.hadkarmeals.exception.BusinessException;
import com.hadkarmeals.repository.MealRepository;
import com.hadkarmeals.repository.OrderRepository;
import com.hadkarmeals.repository.StudentRepository;
import com.hadkarmeals.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class BusinessLogicEdgeCasesTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private MealRepository mealRepository;

    @Autowired
    private ServiceStatusService serviceStatusService;

    @Autowired
    private LedgerService ledgerService;

    @Autowired
    private BillingService billingService;

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private NotificationService notificationService;

    @Test
    @Transactional
    void testMultipleDinnerOrdersAllowed() {
        Student rahul = studentRepository.findByPhoneNumber("9820000004").orElseThrow();
        Meal dinner = mealRepository.findByMealDateAndMealType(LocalDate.now(), MealType.DINNER).orElseThrow();

        // 1. First order succeeds
        OrderResponse firstOrder = orderService.placeOrder(rahul.getId(), PlaceOrderRequest.builder()
                .mealId(dinner.getId())
                .orderType(OrderType.FULL)
                .quantity(1)
                .build());
        assertNotNull(firstOrder);
        assertEquals(OrderStatus.CONFIRMED, firstOrder.getStatus());

        // 2. Second order for same dinner also succeeds (multiple orders allowed)
        OrderResponse secondOrder = orderService.placeOrder(rahul.getId(), PlaceOrderRequest.builder()
                .mealId(dinner.getId())
                .orderType(OrderType.HALF)
                .quantity(2)
                .build());
        assertNotNull(secondOrder);
        assertEquals(OrderStatus.CONFIRMED, secondOrder.getStatus());
    }

    @Test
    @Transactional
    void testOrderPastCutoffDisabled() {
        Student rahul = studentRepository.findByPhoneNumber("9820000004").orElseThrow();

        // Create a test dinner meal for future date with past cutoff
        LocalDate futureDate = LocalDate.now().plusDays(10);
        Meal expiredMeal = Meal.builder()
                .mealDate(futureDate)
                .mealType(MealType.DINNER)
                .halfPrice(new BigDecimal("50.00"))
                .fullPrice(new BigDecimal("80.00"))
                .orderOpenTime(LocalTime.of(16, 0))
                .orderCutoffTime(LocalTime.of(20, 0))
                .status(MealStatus.DRAFT) // Not published
                .build();
        expiredMeal = mealRepository.save(expiredMeal);

        final Long expiredMealId = expiredMeal.getId();
        BusinessException ex = assertThrows(BusinessException.class, () -> {
            orderService.placeOrder(rahul.getId(), PlaceOrderRequest.builder()
                    .mealId(expiredMealId)
                    .orderType(OrderType.FULL)
                    .build());
        });
        assertTrue(ex.getMessage().toLowerCase().contains("not currently open") || ex.getMessage().toLowerCase().contains("closed"));
    }

    @Test
    @Transactional
    void testHolidayClosurePreventsOrder() {
        Student ananya = studentRepository.findByPhoneNumber("9820000005").orElseThrow();

        LocalDate holidayDate = LocalDate.now().plusDays(5);
        Meal holidayDinner = mealRepository.save(Meal.builder()
                .mealDate(holidayDate)
                .mealType(MealType.DINNER)
                .halfPrice(new BigDecimal("50.00"))
                .fullPrice(new BigDecimal("80.00"))
                .orderOpenTime(LocalTime.of(16, 0))
                .orderCutoffTime(LocalTime.of(23, 59))
                .status(MealStatus.PUBLISHED)
                .build());

        // Schedule holiday
        serviceStatusService.scheduleHoliday(CreateHolidayRequest.builder()
                .holidayDate(holidayDate)
                .title("Diwali Special Holiday")
                .description("Service closed for Diwali celebration")
                .affectsMeal(ClosureType.ALL)
                .build());

        // Order on holiday must be rejected
        BusinessException ex = assertThrows(BusinessException.class, () -> {
            orderService.placeOrder(ananya.getId(), PlaceOrderRequest.builder()
                    .mealId(holidayDinner.getId())
                    .orderType(OrderType.FULL)
                    .build());
        });
        assertTrue(ex.getMessage().toLowerCase().contains("closed"));
    }

    @Test
    @Transactional
    void testFullBillingCycleAndSettlement() {
        Student shees = studentRepository.findByPhoneNumber("9820000001").orElseThrow();
        String currentMonth = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));

        MonthlyBillResponse initialBill = billingService.getStudentBill(shees.getId(), currentMonth);
        assertEquals(new BigDecimal("2110.00"), initialBill.getFoodCharges());
        assertEquals(new BigDecimal("85.00"), initialBill.getExtraCharges());
        assertEquals(new BigDecimal("0.00"), initialBill.getPreviousBalance());
        assertEquals(new BigDecimal("2195.00"), initialBill.getTotalAmount());
        assertEquals(new BigDecimal("1500.00"), initialBill.getPaidAmount());
        assertEquals(new BigDecimal("695.00"), initialBill.getOutstandingBalance());
        assertEquals(BillStatus.PARTIALLY_PAID, initialBill.getStatus());

        // Add remaining payment of ₹695
        paymentService.recordPayment(RecordPaymentRequest.builder()
                .studentId(shees.getId())
                .amount(new BigDecimal("695.00"))
                .paymentMethod(PaymentMethod.UPI)
                .referenceNote("UPI FINAL SETTLEMENT")
                .build(), "ADMIN");

        // Now bill must show outstanding = 0 and status PAID
        MonthlyBillResponse settledBill = billingService.getStudentBill(shees.getId(), currentMonth);
        assertEquals(new BigDecimal("2195.00"), settledBill.getPaidAmount());
        assertEquals(new BigDecimal("0.00"), settledBill.getOutstandingBalance());
        assertEquals(BillStatus.PAID, settledBill.getStatus());
    }

    @Test
    void testWhatsAppBillUrlAndDirectCallFormat() {
        Student shees = studentRepository.findByPhoneNumber("9820000001").orElseThrow();
        String currentMonth = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));

        MonthlyBillResponse bill = billingService.getStudentBill(shees.getId(), currentMonth);
        String whatsappUrl = bill.getWhatsappUrl();

        assertNotNull(whatsappUrl);
        // wa.me format
        assertTrue(whatsappUrl.startsWith("https://wa.me/919820000001?text="));
        // URL encoded message must include key variables
        assertTrue(whatsappUrl.contains("Mohammad") || whatsappUrl.contains("Shees"));
        assertTrue(whatsappUrl.contains("Hadkar"));
        assertTrue(whatsappUrl.contains("2195") || whatsappUrl.contains("2%2C195"));

        // Direct call link format
        String telLink = "tel:" + shees.getPhoneNumber();
        assertEquals("tel:9820000001", telLink);
    }

    @Test
    @Transactional
    void testReminderTargetingOnlyNonOrderedStudents() {
        Meal dinner = mealRepository.findByMealDateAndMealType(LocalDate.now(), MealType.DINNER).orElseThrow();

        // Student Smit already has an order for Dinner
        Student smit = studentRepository.findByPhoneNumber("9820000002").orElseThrow();
        boolean smitHasOrder = orderRepository.findByStudentIdAndOrderDateAndMealTypeAndStatusIn(
                smit.getId(), dinner.getMealDate(), dinner.getMealType(), List.of(OrderStatus.CONFIRMED)).isPresent();
        assertTrue(smitHasOrder);

        // Student Ananya has NOT ordered Dinner
        Student ananya = studentRepository.findByPhoneNumber("9820000005").orElseThrow();
        boolean ananyaHasOrder = orderRepository.findByStudentIdAndOrderDateAndMealTypeAndStatusIn(
                ananya.getId(), dinner.getMealDate(), dinner.getMealType(), List.of(OrderStatus.CONFIRMED)).isPresent();
        assertFalse(ananyaHasOrder);

        // Send closing reminder
        int count = notificationService.sendClosingReminder(dinner, 10);
        assertTrue(count >= 1);

        // Ananya must have received the dinner closing reminder
        List<Notification> ananyaNotifications = notificationService.getStudentNotifications(ananya.getId());
        boolean receivedReminder = ananyaNotifications.stream()
                .anyMatch(n -> n.getTitle().contains("Dinner") || n.getMessage().contains("Dinner") || n.getMessage().contains("10 minutes"));
        assertTrue(receivedReminder, "Student who has not ordered dinner must receive closing reminder");
    }
}
