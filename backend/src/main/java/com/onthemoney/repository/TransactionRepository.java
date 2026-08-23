package com.onthemoney.repository;

import com.onthemoney.entity.TransactionEntity;
import com.onthemoney.entity.UserEntity;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface TransactionRepository extends JpaRepository<TransactionEntity, Long> {
  List<TransactionEntity> findByUserOrderByDateDescIdDesc(UserEntity user);

  List<TransactionEntity> findByUserAndDateBetween(UserEntity user, LocalDate start, LocalDate end);

  Optional<TransactionEntity> findByIdAndUser(Long id, UserEntity user);

  List<TransactionEntity> findByUserAndFromAccountIdOrUserAndToAccountId(
      UserEntity user1, Long fromAccountId, UserEntity user2, Long toAccountId);

  /** Derived delete removes rows entity-by-entity and must run in a transaction. */
  @Transactional
  void deleteByUser(UserEntity user);
}
