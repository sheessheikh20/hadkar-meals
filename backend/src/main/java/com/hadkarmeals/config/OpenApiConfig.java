package com.hadkarmeals.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI hadkarMealsOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("🍱 Hadkar Meals API")
                        .description("Hostel Tiffin Management, Ordering & Billing Platform - Fresh Meals. Every Day. (Ghar Ka Khana, Hostel Tak.)")
                        .version("1.0.0")
                        .contact(new Contact().name("Hadkar Meals Team").url("https://hadkarmeals.com")))
                .addSecurityItem(new SecurityRequirement().addList("BearerAuth"))
                .components(new Components()
                        .addSecuritySchemes("BearerAuth", new SecurityScheme()
                                .name("BearerAuth")
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
