package com.onthemoney.repository;

import com.onthemoney.entity.AccountEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountRepository extends JpaRepository<AccountEntity, Long> {
  Optional<AccountEntity> findByName(String name);
}
