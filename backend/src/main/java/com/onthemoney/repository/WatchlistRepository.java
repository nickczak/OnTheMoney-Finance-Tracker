package com.onthemoney.repository;

import com.onthemoney.entity.UserEntity;
import com.onthemoney.entity.WatchlistEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface WatchlistRepository extends JpaRepository<WatchlistEntity, Long> {
  List<WatchlistEntity> findByUser(UserEntity user);

  Optional<WatchlistEntity> findByUserAndSymbolIgnoreCase(UserEntity user, String symbol);

  /** Derived delete removes rows entity-by-entity and must run in a transaction. */
  @Transactional
  void deleteByUser(UserEntity user);
}
