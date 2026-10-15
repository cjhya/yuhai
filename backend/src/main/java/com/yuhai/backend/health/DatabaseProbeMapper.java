package com.yuhai.backend.health;

import org.apache.ibatis.annotations.Select;

public interface DatabaseProbeMapper {

    @Select("SELECT 1")
    Integer selectOne();
}

