package com.yuhai.backend;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@MapperScan({"com.yuhai.backend.health", "com.yuhai.backend.machine"})
@SpringBootApplication
public class YuhaiBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(YuhaiBackendApplication.class, args);
    }
}
