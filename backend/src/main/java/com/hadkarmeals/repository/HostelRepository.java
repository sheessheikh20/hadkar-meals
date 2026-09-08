package com.hadkarmeals.repository;

import com.hadkarmeals.entity.Hostel;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface HostelRepository extends JpaRepository<Hostel, Long> {
    Optional<Hostel> findByName(String name);
}
