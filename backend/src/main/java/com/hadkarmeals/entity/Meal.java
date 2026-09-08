package com.hadkarmeals.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "meals", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"meal_date", "meal_type"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Meal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "meal_date", nullable = false)
    private LocalDate mealDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_type", nullable = false, length = 20)
    private MealType mealType;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal halfPrice;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal fullPrice;

    @Column(nullable = false)
    private LocalTime orderOpenTime;

    @Column(nullable = false)
    private LocalTime orderCutoffTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MealStatus status = MealStatus.PUBLISHED;

    private String emergencyReason;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "meal_menu_items",
        joinColumns = @JoinColumn(name = "meal_id"),
        inverseJoinColumns = @JoinColumn(name = "menu_item_id")
    )
    @Builder.Default
    private List<MenuItem> menuItems = new ArrayList<>();

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
