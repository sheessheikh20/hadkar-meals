package com.hadkarmeals.dto;

import com.hadkarmeals.entity.MenuItemCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateMenuItemRequest {
    @NotBlank(message = "Item name is required")
    private String name;

    @NotNull(message = "Category is required")
    private MenuItemCategory category;

    private String description;
}
