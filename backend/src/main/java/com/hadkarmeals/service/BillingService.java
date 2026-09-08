package com.hadkarmeals.service;

import com.hadkarmeals.dto.MonthlyBillResponse;
import com.hadkarmeals.entity.*;
import com.hadkarmeals.exception.ResourceNotFoundException;
import com.hadkarmeals.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class BillingService {

    @Value("${hadkar.app.backend-base-url:http://localhost:8081}")
    private String backendBaseUrl;

    @Value("${hadkar.app.frontend-base-url:http://localhost:5174}")
    private String frontendBaseUrl;

    private final MonthlyBillRepository billRepository;
    private final StudentRepository studentRepository;
    private final OrderRepository orderRepository;
    private final ExtraChargeRepository extraChargeRepository;
    private final PaymentRepository paymentRepository;
    private final AuditLogService auditLogService;

    public BillingService(
            MonthlyBillRepository billRepository,
            StudentRepository studentRepository,
            OrderRepository orderRepository,
            ExtraChargeRepository extraChargeRepository,
            PaymentRepository paymentRepository,
            AuditLogService auditLogService) {
        this.billRepository = billRepository;
        this.studentRepository = studentRepository;
        this.orderRepository = orderRepository;
        this.extraChargeRepository = extraChargeRepository;
        this.paymentRepository = paymentRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public MonthlyBill generateOrUpdateStudentBill(Long studentId, String monthYear, String adminUsername) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + studentId));

        YearMonth ym = YearMonth.parse(monthYear);
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();

        // 1. Food charges from confirmed and delivered orders
        List<Order> orders = orderRepository.findByStudentIdAndOrderDateBetweenOrderByOrderDateAsc(studentId, start, end)
                .stream().filter(o -> o.getStatus() == OrderStatus.CONFIRMED || o.getStatus() == OrderStatus.DELIVERED || o.getStatus() == OrderStatus.COMPLETED).toList();
        BigDecimal foodCharges = orders.stream()
                .map(Order::getPriceAtOrder)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        // 2. Extra charges
        List<ExtraCharge> extras = extraChargeRepository.findByStudentIdAndChargeDateBetweenAndActiveTrue(studentId, start, end);
        BigDecimal extraCharges = extras.stream()
                .map(ExtraCharge::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        // 3. Previous balance carried over from previous month
        String prevMonthYear = ym.minusMonths(1).format(DateTimeFormatter.ofPattern("yyyy-MM"));
        BigDecimal previousBalance = billRepository.findByStudentIdAndMonthYear(studentId, prevMonthYear)
                .map(MonthlyBill::getOutstandingBalance)
                .filter(b -> b.compareTo(BigDecimal.ZERO) > 0)
                .orElse(BigDecimal.ZERO)
                .setScale(2, RoundingMode.HALF_UP);

        // 4. Payments made during this month
        List<Payment> payments = paymentRepository.findByStudentIdAndPaymentDateBetween(studentId, start, end);
        BigDecimal paidAmount = payments.stream()
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        MonthlyBill bill = billRepository.findByStudentIdAndMonthYear(studentId, monthYear)
                .orElseGet(() -> MonthlyBill.builder()
                        .student(student)
                        .monthYear(monthYear)
                        .dueDate(end.plusDays(5))
                        .build());

        bill.setFoodCharges(foodCharges);
        bill.setExtraCharges(extraCharges);
        bill.setPreviousBalance(previousBalance);
        bill.setPaidAmount(paidAmount);
        bill.recalculate();

        bill = billRepository.save(bill);

        if (adminUsername != null) {
            auditLogService.log(
                    "BILL_GENERATED",
                    adminUsername,
                    "MonthlyBill",
                    String.valueOf(bill.getId()),
                    "Generated bill for " + student.getFullName() + " for " + monthYear + " (Total: ₹" + bill.getTotalAmount() + ")"
            );
        }

        return bill;
    }

    @Transactional
    public List<MonthlyBillResponse> generateAllBillsForMonth(String monthYear, String adminUsername) {
        List<Student> students = studentRepository.findAll();
        List<MonthlyBillResponse> responses = new ArrayList<>();

        for (Student s : students) {
            MonthlyBill bill = generateOrUpdateStudentBill(s.getId(), monthYear, adminUsername);
            responses.add(mapToResponse(bill));
        }
        return responses;
    }

    public List<MonthlyBillResponse> getBillingSheet(String monthYear, Long hostelId, BillStatus status, String search) {
        String queryMonth = monthYear != null ? monthYear : YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        String currentMonth = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));

        List<MonthlyBill> bills = billRepository.findByMonthYearOrderByStudentHostelNameAscStudentFullNameAsc(queryMonth);

        // Auto-generate for current month or refresh so live orders immediately reflect
        if (queryMonth.equals(currentMonth)) {
            List<Student> students = studentRepository.findAll();
            List<MonthlyBill> refreshed = new ArrayList<>();
            for (Student s : students) {
                refreshed.add(generateOrUpdateStudentBill(s.getId(), queryMonth, null));
            }
            bills = refreshed;
        }

        return bills.stream()
                .filter(b -> {
                    if (status == null) return true;
                    if (status == BillStatus.PAID) {
                        return b.getStatus() == BillStatus.PAID || (b.getOutstandingBalance() != null && b.getOutstandingBalance().compareTo(BigDecimal.ZERO) <= 0);
                    }
                    if (status == BillStatus.UNPAID || status == BillStatus.PENDING) {
                        return b.getStatus() != BillStatus.PAID && (b.getOutstandingBalance() != null && b.getOutstandingBalance().compareTo(BigDecimal.ZERO) > 0);
                    }
                    return b.getStatus() == status;
                })
                .filter(b -> search == null || search.trim().isEmpty() ||
                        b.getStudent().getFullName().toLowerCase().contains(search.toLowerCase()) ||
                        b.getStudent().getPhoneNumber().contains(search))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public MonthlyBillResponse getStudentBill(Long studentId, String monthYear) {
        String queryMonth = monthYear != null ? monthYear : YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        String currentMonth = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        MonthlyBill bill;
        if (queryMonth.equals(currentMonth)) {
            bill = generateOrUpdateStudentBill(studentId, queryMonth, null);
        } else {
            bill = billRepository.findByStudentIdAndMonthYear(studentId, queryMonth)
                    .orElseGet(() -> generateOrUpdateStudentBill(studentId, queryMonth, "SYSTEM"));
        }
        return mapToResponse(bill);
    }

    public List<MonthlyBillResponse> getStudentBillHistory(Long studentId) {
        return billRepository.findByStudentIdOrderByMonthYearDesc(studentId)
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public MonthlyBillResponse mapToResponse(MonthlyBill bill) {
        Student student = bill.getStudent();
        String cleanPhone = student.getPhoneNumber().replaceAll("[^0-9]", "");
        if (!cleanPhone.startsWith("91") && cleanPhone.length() == 10) {
            cleanPhone = "91" + cleanPhone;
        }

        // Format month as "September, 2026" instead of "2026-09"
        String formattedMonth = bill.getMonthYear();
        try {
            YearMonth ym = YearMonth.parse(bill.getMonthYear());
            formattedMonth = ym.format(DateTimeFormatter.ofPattern("MMMM, yyyy", Locale.ENGLISH));
        } catch (Exception ignored) {}

        String statusLabel = (bill.getOutstandingBalance() != null && bill.getOutstandingBalance().compareTo(BigDecimal.ZERO) <= 0) ? "PAID" : "UNPAID";
        String cleanBackend = (backendBaseUrl != null && backendBaseUrl.endsWith("/"))
                ? backendBaseUrl.substring(0, backendBaseUrl.length() - 1)
                : (backendBaseUrl != null ? backendBaseUrl : "http://localhost:8081");
        String cleanFrontend = (frontendBaseUrl != null && frontendBaseUrl.endsWith("/"))
                ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1)
                : (frontendBaseUrl != null ? frontendBaseUrl : "http://localhost:5174");

        String rawMessage = String.format(
                "🍱 *HADKAR MEALS - MONTHLY DINNER INVOICE*\n" +
                "👤 *Customer:* %s\n" +
                "📍 *Hostel:* %s\n" +
                "📅 *Billing Month:* %s\n\n" +
                "*Bill Breakdown:*\n" +
                "🍱 Food Charges: ₹%s\n" +
                "➕ Extra Charges: ₹%s\n" +
                "💰 Previous Balance: ₹%s\n" +
                "─────────────────────\n" +
                "*Total Bill:* ₹%s\n" +
                "*Paid Amount:* ₹%s\n" +
                "*Status:* %s\n" +
                "*🔴 Net Balance Due:* ₹%s\n\n" +
                "📄 *Download Monthly Invoice PDF:*\n" +
                cleanBackend + "/api/billing/pdf/%d?month=%s\n\n" +
                "💳 *UPI ID:* hadkarmeals@okaxis\n" +
                "📞 *Contact / Phone:* +91 98765 43210\n" +
                "📲 *Direct UPI Pay:* upi://pay?pa=hadkarmeals@okaxis&pn=HadkarMeals&am=%s\n" +
                "🖼️ *Scan UPI QR Code:* " + cleanFrontend + "/assets/hadkar_upi_qr.jpg\n\n" +
                "Please share payment confirmation screenshot once done. Thank you! 🙏",
                student.getFullName(),
                student.getHostel() != null ? student.getHostel().getName() : "Hostel",
                formattedMonth,
                bill.getFoodCharges(),
                bill.getExtraCharges(),
                bill.getPreviousBalance(),
                bill.getTotalAmount(),
                bill.getPaidAmount(),
                statusLabel,
                bill.getOutstandingBalance(),
                student.getId(),
                bill.getMonthYear(),
                bill.getOutstandingBalance()
        );

        String whatsappUrl = "https://wa.me/" + cleanPhone + "?text=" + URLEncoder.encode(rawMessage, StandardCharsets.UTF_8);

        return MonthlyBillResponse.builder()
                .id(bill.getId())
                .studentId(student.getId())
                .studentName(student.getFullName())
                .phoneNumber(student.getPhoneNumber())
                .hostelName(student.getHostel() != null ? student.getHostel().getName() : "N/A")
                .monthYear(bill.getMonthYear())
                .foodCharges(bill.getFoodCharges())
                .extraCharges(bill.getExtraCharges())
                .previousBalance(bill.getPreviousBalance())
                .totalAmount(bill.getTotalAmount())
                .paidAmount(bill.getPaidAmount())
                .outstandingBalance(bill.getOutstandingBalance())
                .status(bill.getStatus())
                .dueDate(bill.getDueDate())
                .generatedAt(bill.getGeneratedAt())
                .whatsappUrl(whatsappUrl)
                .whatsappMessage(rawMessage)
                .build();
    }

    @Transactional
    public MonthlyBillResponse markBillAsPaid(Long billId, String recordedBy) {
        MonthlyBill bill = billRepository.findById(billId)
                .orElseThrow(() -> new ResourceNotFoundException("Bill not found with ID: " + billId));

        BigDecimal outstanding = bill.getOutstandingBalance();
        if (outstanding != null && outstanding.compareTo(BigDecimal.ZERO) > 0) {
            // Record the payment in the payments table
            paymentRepository.save(Payment.builder()
                    .student(bill.getStudent())
                    .amount(outstanding)
                    .paymentMethod(PaymentMethod.UPI)
                    .paymentDate(LocalDate.now())
                    .referenceNote("Cleared bill for " + bill.getMonthYear() + " (Marked Paid by Admin)")
                    .recordedBy(recordedBy)
                    .build());

            // Update the bill's paid amount and clear the outstanding balance
            bill.setPaidAmount(bill.getPaidAmount().add(outstanding));
            bill.setOutstandingBalance(BigDecimal.ZERO);
            bill.setStatus(BillStatus.PAID);
            bill = billRepository.save(bill);
        } else {
            // Already fully paid or zero balance - just mark as PAID
            bill.setStatus(BillStatus.PAID);
            bill = billRepository.save(bill);
        }

        auditLogService.log(
                "BILL_MARKED_PAID",
                recordedBy,
                "MonthlyBill",
                String.valueOf(bill.getId()),
                "Marked bill as PAID for " + bill.getStudent().getFullName() + " (" + bill.getMonthYear() + ") - Amount: ₹" + outstanding
        );

        return mapToResponse(bill);
    }
}
