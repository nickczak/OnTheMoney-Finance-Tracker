package com.onthemoney.repository;

import com.onthemoney.entity.TransactionEntity;
import com.onthemoney.entity.UserEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface TransactionRepository extends JpaRepository<TransactionEntity, Long> {
  List<TransactionEntity> findByUserOrderByDateDescIdDesc(UserEntity user);

  Optional<TransactionEntity> findByIdAndUser(Long id, UserEntity user);

  Optional<TransactionEntity> findByUserAndPlaidTransactionId(
      UserEntity user, String plaidTransactionId);

  List<TransactionEntity> findByUserAndFromAccountIdOrUserAndToAccountId(
      UserEntity user1, Long fromAccountId, UserEntity user2, Long toAccountId);

  /** Derived delete removes rows entity-by-entity and must run in a transaction. */
  @Transactional
  void deleteByUser(UserEntity user);
}
