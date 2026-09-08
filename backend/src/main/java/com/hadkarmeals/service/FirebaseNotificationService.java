package com.hadkarmeals.service;

import com.google.firebase.messaging.*;
import com.hadkarmeals.entity.User;
import com.hadkarmeals.entity.UserDeviceToken;
import com.hadkarmeals.repository.UserDeviceTokenRepository;
import com.hadkarmeals.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class FirebaseNotificationService {

    private static final Logger log = LoggerFactory.getLogger(FirebaseNotificationService.class);

    private final UserDeviceTokenRepository tokenRepository;
    private final UserRepository userRepository;

    public FirebaseNotificationService(UserDeviceTokenRepository tokenRepository, UserRepository userRepository) {
        this.tokenRepository = tokenRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void registerDeviceToken(String username, String token, String deviceType) {
        userRepository.findByPhoneNumber(username)
                .or(() -> userRepository.findByEmail(username))
                .ifPresent(user -> {
                    tokenRepository.findByUserIdAndFcmToken(user.getId(), token).ifPresentOrElse(
                            existing -> {
                                existing.setActive(true);
                                existing.setDeviceType(deviceType != null ? deviceType : "WEB");
                                tokenRepository.save(existing);
                            },
                            () -> {
                                tokenRepository.save(UserDeviceToken.builder()
                                        .user(user)
                                        .fcmToken(token)
                                        .deviceType(deviceType != null ? deviceType : "WEB")
                                        .active(true)
                                        .build());
                                log.info("Registered FCM device token for user: {}", username);
                            }
                    );
                });
    }

    @Transactional
    public void unregisterDeviceToken(String token) {
        tokenRepository.deleteByFcmToken(token);
        log.info("Unregistered FCM token: {}", token);
    }

    @Async
    public void sendPushToUser(Long userId, String title, String body, String clickUrl) {
        List<String> tokens = tokenRepository.findActiveTokensByUserId(userId);
        sendMulticast(tokens, title, body, clickUrl);
    }

    @Async
    public void sendPushToHostel(Long hostelId, String title, String body, String clickUrl) {
        List<String> tokens = tokenRepository.findActiveTokensByHostelId(hostelId);
        sendMulticast(tokens, title, body, clickUrl);
    }

    @Async
    public void sendPushToStudents(List<Long> studentIds, String title, String body, String clickUrl) {
        if (studentIds == null || studentIds.isEmpty()) return;
        List<String> tokens = tokenRepository.findActiveTokensByStudentIds(studentIds);
        sendMulticast(tokens, title, body, clickUrl);
    }

    @Async
    public void sendPushToAllActive(String title, String body, String clickUrl) {
        List<String> tokens = tokenRepository.findAllActiveTokens();
        sendMulticast(tokens, title, body, clickUrl);
    }

    private void sendMulticast(List<String> tokens, String title, String body, String clickUrl) {
        if (tokens == null || tokens.isEmpty()) {
            log.debug("No active FCM tokens found for push dispatch");
            return;
        }

        try {
            MulticastMessage message = MulticastMessage.builder()
                    .addAllTokens(tokens)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .setWebpushConfig(WebpushConfig.builder()
                            .setFcmOptions(WebpushFcmOptions.builder()
                                    .setLink(clickUrl != null ? clickUrl : "/")
                                    .build())
                            .putHeader("Urgency", "high")
                            .build())
                    .build();

            BatchResponse response = FirebaseMessaging.getInstance().sendEachForMulticast(message);
            log.info("🔥 FCM Push sent: {} success, {} failures out of {} tokens (Title: '{}')",
                    response.getSuccessCount(), response.getFailureCount(), tokens.size(), title);

            // Cleanup invalid / unregistered tokens automatically
            for (int i = 0; i < response.getResponses().size(); i++) {
                SendResponse r = response.getResponses().get(i);
                if (!r.isSuccessful() && r.getException() != null) {
                    MessagingErrorCode code = r.getException().getMessagingErrorCode();
                    if (code == MessagingErrorCode.UNREGISTERED || code == MessagingErrorCode.INVALID_ARGUMENT) {
                        String badToken = tokens.get(i);
                        tokenRepository.deleteByFcmToken(badToken);
                        log.debug("Removed stale FCM token: {}", badToken);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to send Firebase multicast message: {}", e.getMessage());
        }
    }
}
