package com.hadkarmeals.security;

import com.hadkarmeals.entity.User;
import com.hadkarmeals.repository.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        User user = userRepository.findByPhoneNumber(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .orElseThrow(() -> new UsernameNotFoundException("User not found with phone/email: " + identifier));

        java.util.List<SimpleGrantedAuthority> authorities = new java.util.ArrayList<>();
        if (user.getRole() == com.hadkarmeals.entity.Role.ROLE_ADMIN) {
            authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
        } else {
            authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
        }

        return new org.springframework.security.core.userdetails.User(
                user.getPhoneNumber() != null ? user.getPhoneNumber() : user.getEmail(),
                "", // No password used with OTP auth
                user.getActive(),
                true,
                true,
                true,
                authorities
        );
    }
}
