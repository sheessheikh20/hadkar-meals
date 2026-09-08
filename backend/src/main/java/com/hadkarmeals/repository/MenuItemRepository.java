package com.hadkarmeals.repository;

import com.hadkarmeals.entity.MenuItem;
import com.hadkarmeals.entity.MenuItemCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {
    Optional<MenuItem> findByName(String name);
    List<MenuItem> findByActive(Boolean active);
    List<MenuItem> findByCategory(MenuItemCategory category);
}
