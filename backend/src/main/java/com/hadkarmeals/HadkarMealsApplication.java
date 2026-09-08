package com.hadkarmeals;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class HadkarMealsApplication {

    public static void main(String[] args) {
        SpringApplication.run(HadkarMealsApplication.class, args);
    }
}
