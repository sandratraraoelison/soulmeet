import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import {
  notificationService,
  notificationsSupported,
} from '@/services/notification.service';

/**
 * Configures push notifications, keeps the push token in sync with the
 * server while authenticated, and navigates to the conversation when the
 * user taps a notification.
 */
export function useNotifications(isAuthenticated: boolean) {
  useEffect(() => {
    void notificationService.configure();
  }, []);

  useEffect(() => {
    if (isAuthenticated) void notificationService.syncWithServer();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!notificationsSupported) return;
    let active = true;
    let subscription: { remove: () => void } | undefined;
    void import('expo-notifications').then((api) => {
      if (!active) return;
      subscription = api.addNotificationResponseReceivedListener((response) => {
        const conversationId =
          response.notification.request.content.data?.conversationId;
        const route = response.notification.request.content.data?.route;
        if (typeof route === 'string') {
          router.push(route as Href);
          return;
        }
        if (typeof conversationId === 'string')
          router.push(`/(app)/conversation/${conversationId}`);
      });
    });
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);
}
