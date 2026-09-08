package com.hadkarmeals.repository;

import com.hadkarmeals.entity.MealType;
import com.hadkarmeals.entity.Order;
import com.hadkarmeals.entity.OrderStatus;
import com.hadkarmeals.entity.OrderType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByStudentIdOrderByOrderDateDesc(Long studentId);

    List<Order> findByStudentIdAndOrderDateBetweenOrderByOrderDateAsc(Long studentId, LocalDate start, LocalDate end);

    Optional<Order> findByStudentIdAndOrderDateAndMealTypeAndStatusIn(
            Long studentId, LocalDate orderDate, MealType mealType, Collection<OrderStatus> statuses);

    List<Order> findAllByStudentIdAndOrderDateAndMealTypeAndStatusIn(
            Long studentId, LocalDate orderDate, MealType mealType, Collection<OrderStatus> statuses);

    List<Order> findByOrderDateAndMealTypeAndStatusIn(
            LocalDate orderDate, MealType mealType, Collection<OrderStatus> statuses);

    List<Order> findByMealIdAndStatusIn(Long mealId, Collection<OrderStatus> statuses);

    long countByMealId(Long mealId);

    List<Order> findByOrderDateAndStatusIn(LocalDate orderDate, Collection<OrderStatus> statuses);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.orderDate = :date AND o.mealType = :mealType AND o.orderType = :orderType AND o.status = :status")
    long countOrders(@Param("date") LocalDate date, @Param("mealType") MealType mealType, @Param("orderType") OrderType orderType, @Param("status") OrderStatus status);

    @Query("SELECT o FROM Order o WHERE o.orderDate = :date AND o.status = 'CONFIRMED' ORDER BY o.student.hostel.name ASC, o.student.fullName ASC")
    List<Order> findConfirmedOrdersForKitchen(@Param("date") LocalDate date);

    @Query("SELECT o FROM Order o WHERE o.orderDate = :date AND o.student.hostel.id = :hostelId AND o.status = :status")
    List<Order> findByDateAndHostelIdAndStatus(@Param("date") LocalDate date, @Param("hostelId") Long hostelId, @Param("status") OrderStatus status);
}
