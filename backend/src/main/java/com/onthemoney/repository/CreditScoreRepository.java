package com.onthemoney.repository;

import com.onthemoney.entity.CreditScoreEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CreditScoreRepository extends JpaRepository<CreditScoreEntity, Long> {
  List<CreditScoreEntity> findTop2ByOrderByDateDescIdDesc();
}
