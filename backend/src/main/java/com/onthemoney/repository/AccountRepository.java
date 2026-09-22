package com.onthemoney.repository;

import com.onthemoney.entity.AccountEntity;
import com.onthemoney.entity.UserEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface AccountRepository extends JpaRepository<AccountEntity, Long> {
  List<AccountEntity> findByUser(UserEntity user);

  Optional<AccountEntity> findByIdAndUser(Long id, UserEntity user);

  Optional<AccountEntity> findByUserAndPlaidAccountId(UserEntity user, String plaidAccountId);

  List<AccountEntity> findByUserAndPlaidItemId(UserEntity user, String plaidItemId);

  /** Derived delete removes rows entity-by-entity and must run in a transaction. */
  @Transactional
  void deleteByUser(UserEntity user);
}
