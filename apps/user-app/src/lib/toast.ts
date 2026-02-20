import Toast from 'react-native-toast-message';
import type { ToastShowParams } from 'react-native-toast-message';
import type { AppToastType, AppToastProps } from '@/components/ToastHost';

export interface ShowToastOptions {
  type: AppToastType;
  message: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

export function showToast({
  type,
  message,
  description,
  actionLabel,
  onAction,
  duration = 3000,
}: ShowToastOptions) {
  const payload: ToastShowParams = {
    type,
    text1: message,
    text2: description,
    position: 'top',
    visibilityTime: duration,
    autoHide: true,
    swipeable: true,
    props: {
      actionLabel,
      onAction,
    } as AppToastProps,
  };

  Toast.show(payload);
}

export function hideToast() {
  Toast.hide();
}

export default showToast;
