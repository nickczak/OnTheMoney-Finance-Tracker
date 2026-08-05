package com.onthemoney.repository;

import com.onthemoney.entity.WatchlistEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WatchlistRepository extends JpaRepository<WatchlistEntity, Long> {
  Optional<WatchlistEntity> findBySymbol(String symbol);
}
