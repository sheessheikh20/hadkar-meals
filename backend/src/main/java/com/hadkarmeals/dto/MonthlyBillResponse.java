package com.hadkarmeals.dto;

import com.hadkarmeals.entity.BillStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlyBillResponse {
    private Long id;
    private Long studentId;
    private String studentName;
    private String phoneNumber;
    private String hostelName;

    private String monthYear;
    private BigDecimal foodCharges;
    private BigDecimal extraCharges;
    private BigDecimal previousBalance;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal outstandingBalance;

    private BillStatus status;
    private LocalDate dueDate;
    private LocalDateTime generatedAt;

    private String whatsappUrl;
    private String whatsappMessage;
}
