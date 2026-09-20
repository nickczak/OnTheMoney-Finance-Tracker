package com.onthemoney.repository;

import com.onthemoney.entity.PlaidItemEntity;
import com.onthemoney.entity.UserEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlaidItemRepository extends JpaRepository<PlaidItemEntity, Long> {
  Optional<PlaidItemEntity> findByPlaidItemId(String plaidItemId);

  List<PlaidItemEntity> findByUser(UserEntity user);

  Optional<PlaidItemEntity> findByIdAndUser(Long id, UserEntity user);
}
