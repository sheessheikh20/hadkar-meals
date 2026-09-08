package com.hadkarmeals;

import com.hadkarmeals.dto.AddExtraChargeRequest;
import com.hadkarmeals.dto.MonthlyBillResponse;
import com.hadkarmeals.dto.RecordPaymentRequest;
import com.hadkarmeals.entity.PaymentMethod;
import com.hadkarmeals.entity.Student;
import com.hadkarmeals.repository.StudentRepository;
import com.hadkarmeals.service.BillingService;
import com.hadkarmeals.service.ExtraChargeService;
import com.hadkarmeals.service.LedgerService;
import com.hadkarmeals.service.PaymentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class LedgerAndBillingTest {

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private LedgerService ledgerService;

    @Autowired
    private ExtraChargeService extraChargeService;

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private BillingService billingService;

    @Test
    @Transactional
    void testExtraChargeAndPaymentAffectsBalance() {
        Student ananya = studentRepository.findByPhoneNumber("9820000005").orElseThrow();
        BigDecimal initialBalance = ledgerService.calculateCurrentBalance(ananya.getId());

        // 1. Add extra charge: 2 Rotis @ 10 = 20
        extraChargeService.addExtraCharge(AddExtraChargeRequest.builder()
                .studentId(ananya.getId())
                .itemDescription("Extra Roti")
                .quantity(2)
                .unitPrice(new BigDecimal("10.00"))
                .build(), "TEST_ADMIN");

        BigDecimal balanceAfterCharge = ledgerService.calculateCurrentBalance(ananya.getId());
        assertEquals(initialBalance.add(new BigDecimal("20.00")), balanceAfterCharge);

        // 2. Record payment of 20
        paymentService.recordPayment(RecordPaymentRequest.builder()
                .studentId(ananya.getId())
                .amount(new BigDecimal("20.00"))
                .paymentMethod(PaymentMethod.UPI)
                .referenceNote("UPI-TEST")
                .build(), "TEST_ADMIN");

        BigDecimal balanceAfterPayment = ledgerService.calculateCurrentBalance(ananya.getId());
        assertEquals(initialBalance, balanceAfterPayment);
    }

    @Test
    void testPreSeededMohammadSheesBillValues() {
        Student shees = studentRepository.findByPhoneNumber("9820000001").orElseThrow();
        String currentMonth = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));

        MonthlyBillResponse bill = billingService.getStudentBill(shees.getId(), currentMonth);
        assertNotNull(bill);

        // Verification of business formula
        BigDecimal expectedTotal = bill.getFoodCharges().add(bill.getExtraCharges()).add(bill.getPreviousBalance());
        assertEquals(expectedTotal, bill.getTotalAmount());

        BigDecimal expectedOutstanding = bill.getTotalAmount().subtract(bill.getPaidAmount());
        assertEquals(expectedOutstanding, bill.getOutstandingBalance());

        // WhatsApp link should be generated with student phone and prefilled text
        assertNotNull(bill.getWhatsappUrl());
        assertTrue(bill.getWhatsappUrl().contains("wa.me"));
        assertTrue(bill.getWhatsappUrl().contains("9820000001"));
    }
}
