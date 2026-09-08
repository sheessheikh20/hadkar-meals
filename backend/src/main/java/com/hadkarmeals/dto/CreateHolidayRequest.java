package com.hadkarmeals.dto;

import com.hadkarmeals.entity.ClosureType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateHolidayRequest {
    @NotNull(message = "Holiday date is required")
    private LocalDate holidayDate;

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @NotNull(message = "Affects meal is required")
    private ClosureType affectsMeal;
}
