package com.hadkarmeals.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.InputStream;

@Configuration
public class FirebaseConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    @PostConstruct
    public void initialize() {
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                String envCredentials = System.getenv("FIREBASE_CREDENTIALS");
                InputStream serviceAccount;
                
                if (envCredentials != null && !envCredentials.trim().isEmpty()) {
                    serviceAccount = new java.io.ByteArrayInputStream(envCredentials.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                } else {
                    ClassPathResource resource = new ClassPathResource("firebase-service-account.json");
                    if (resource.exists()) {
                        serviceAccount = resource.getInputStream();
                    } else {
                        log.warn("⚠️ Firebase credentials not found in ENV or classpath. Firebase Auth will fail.");
                        return;
                    }
                }

                try (InputStream stream = serviceAccount) {
                    FirebaseOptions options = FirebaseOptions.builder()
                            .setCredentials(GoogleCredentials.fromStream(stream))
                            .setProjectId("hadkarmeals")
                            .build();

                    FirebaseApp.initializeApp(options);
                    log.info("🔥 Firebase Admin SDK initialized successfully for project: hadkarmeals");
                }
            }
        } catch (Exception e) {
            log.error("❌ Failed to initialize Firebase Admin SDK: {}", e.getMessage());
        }
    }
}
