import { useEffect, useState } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { notificationsApi } from '@/api/notifications.api';

/**
 * Hook to get device push token and register with backend.
 * Does NOT request permissions; permissions flow to be implemented in UI.
 */
export const usePushNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prepare = async () => {
      try {
        if (!Device.isDevice) {
          setError('Must use physical device for push notifications');
          return;
        }

        // NOTE: Permissions are not requested here. This hook only
        // retrieves token assuming permissions have been granted elsewhere.
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;
        setExpoPushToken(token);

        // Send token to backend
        await notificationsApi.registerDeviceToken(token);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to register for notifications');
      }
    };

    prepare();
  }, []);

  return { expoPushToken, error };
};

export default usePushNotifications;
