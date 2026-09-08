package com.hadkarmeals.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "monthly_bills", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"student_id", "month_year"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlyBill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(name = "month_year", nullable = false, length = 7) // "2026-09"
    private String monthYear;

    @Column(nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal foodCharges = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal extraCharges = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal previousBalance = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal outstandingBalance = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private BillStatus status = BillStatus.PENDING;

    private LocalDate dueDate;
    private LocalDateTime generatedAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        generatedAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        recalculate();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        recalculate();
    }

    public void recalculate() {
        if (foodCharges == null) foodCharges = BigDecimal.ZERO;
        if (extraCharges == null) extraCharges = BigDecimal.ZERO;
        if (previousBalance == null) previousBalance = BigDecimal.ZERO;
        if (paidAmount == null) paidAmount = BigDecimal.ZERO;

        totalAmount = foodCharges.add(extraCharges).add(previousBalance);
        outstandingBalance = totalAmount.subtract(paidAmount);

        if (outstandingBalance.compareTo(BigDecimal.ZERO) <= 0) {
            status = BillStatus.PAID;
        } else {
            status = BillStatus.PENDING;
        }
    }
}
