package com.onthemoney.repository;

import com.onthemoney.entity.CreditScoreEntity;
import com.onthemoney.entity.UserEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface CreditScoreRepository extends JpaRepository<CreditScoreEntity, Long> {
  List<CreditScoreEntity> findTop2ByUserOrderByDateDescIdDesc(UserEntity user);

  /** Derived delete removes rows entity-by-entity and must run in a transaction. */
  @Transactional
  void deleteByUser(UserEntity user);
}
