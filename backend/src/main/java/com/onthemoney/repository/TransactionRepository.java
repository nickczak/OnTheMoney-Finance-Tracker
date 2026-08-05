package com.onthemoney.repository;

import com.onthemoney.entity.TransactionEntity;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransactionRepository extends JpaRepository<TransactionEntity, Long> {
  List<TransactionEntity> findByDateBetween(LocalDate start, LocalDate end);

  List<TransactionEntity> findByFromAccountIdOrToAccountId(Long fromAccountId, Long toAccountId);
}
