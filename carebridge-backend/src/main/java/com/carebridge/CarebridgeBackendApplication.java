package com.carebridge;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CarebridgeBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(CarebridgeBackendApplication.class, args);
	}

}
