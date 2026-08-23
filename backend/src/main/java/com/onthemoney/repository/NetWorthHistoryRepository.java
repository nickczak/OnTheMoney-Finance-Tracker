package com.onthemoney.repository;

import com.onthemoney.entity.NetWorthHistoryEntity;
import com.onthemoney.entity.UserEntity;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface NetWorthHistoryRepository extends JpaRepository<NetWorthHistoryEntity, Long> {
  List<NetWorthHistoryEntity> findByUserOrderByDateAsc(UserEntity user);

  Optional<NetWorthHistoryEntity> findByUserAndDate(UserEntity user, LocalDate date);

  /** Derived delete removes rows entity-by-entity and must run in a transaction. */
  @Transactional
  void deleteByUser(UserEntity user);
}
