package com.aprovase.app.repository;

import com.aprovase.app.entity.Simulation;
import com.aprovase.app.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SimulationRepository extends JpaRepository<Simulation, Long> {
    List<Simulation> findByUserOrderByCreatedAtDesc(User user);
}
