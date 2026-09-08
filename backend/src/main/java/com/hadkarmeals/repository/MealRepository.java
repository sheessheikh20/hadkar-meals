package com.hadkarmeals.repository;

import com.hadkarmeals.entity.Meal;
import com.hadkarmeals.entity.MealStatus;
import com.hadkarmeals.entity.MealType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MealRepository extends JpaRepository<Meal, Long> {
    Optional<Meal> findByMealDateAndMealType(LocalDate mealDate, MealType mealType);
    List<Meal> findByMealDate(LocalDate mealDate);
    List<Meal> findByMealDateBetweenOrderByMealDateAsc(LocalDate startDate, LocalDate endDate);
    List<Meal> findByMealDateAndStatus(LocalDate mealDate, MealStatus status);
}
