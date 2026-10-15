CREATE TABLE IF NOT EXISTS machine_info (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    asset_number VARCHAR(64) NOT NULL,
    asset_name VARCHAR(100) NOT NULL,
    specifications VARCHAR(120) NULL,
    classification VARCHAR(80) NULL,
    tonnage DECIMAL(10, 2) NULL,
    total_power DECIMAL(10, 2) NULL,
    screw_diameter DECIMAL(10, 2) NULL,
    created_at BIGINT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_machine_info_asset_number (asset_number)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = '机器信息';
