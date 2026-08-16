import { useEffect } from 'react';
import { Alert } from 'react-native';
import { notificationService } from '@/services/notification.service';

export function NotificationPermissionPrompt({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void notificationService.status().then((status) => {
      if (!active || !status.supported || status.asked || status.granted) return;
      Alert.alert('Stay connected', 'Would you like Soulmeet to show a notification when someone sends you a new message?', [
        { text: 'Not now', style: 'cancel', onPress: () => void notificationService.decline() },
        { text: 'Allow notifications', onPress: () => void notificationService.request() },
      ]);
    });
    return () => { active = false; };
  }, [enabled]);
  return null;
}
