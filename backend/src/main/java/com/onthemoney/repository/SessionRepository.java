package com.onthemoney.repository;

import com.onthemoney.entity.SessionEntity;
import com.onthemoney.entity.UserEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface SessionRepository extends JpaRepository<SessionEntity, Long> {
  Optional<SessionEntity> findByToken(String token);

  /** Derived delete removes rows entity-by-entity and must run in a transaction. */
  @Transactional
  void deleteByUser(UserEntity user);
}
