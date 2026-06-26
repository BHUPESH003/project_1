import { useMutation } from '@tanstack/react-query'
import { apiPost } from '@/api/client'

export type NotificationTarget = 'broadcast' | 'user'
export type AdminNotificationType = 'MARKETING' | 'SYSTEM' | 'ORDER_UPDATE'

export interface SendNotificationPayload {
  target: NotificationTarget
  userId?: string
  type: AdminNotificationType
  title: string
  body: string
}

export interface SendNotificationResult {
  sent: number
  target: NotificationTarget
  userId?: string
}

export function useSendNotification() {
  return useMutation({
    mutationFn: (payload: SendNotificationPayload) =>
      apiPost<SendNotificationResult>('/admin/notifications/push', payload),
  })
}
