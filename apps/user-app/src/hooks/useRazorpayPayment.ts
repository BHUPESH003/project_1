/**
 * Razorpay Payment Hook
 * Handles Razorpay payment flow integration
 */

import { useState, useCallback } from 'react';
import RazorpayCheckout from 'react-native-razorpay';
import { paymentsApi, PaymentProvider } from '@/api/payments.api';
import { useRouter } from 'expo-router';

export interface RazorpayPaymentConfig {
  keyId: string;
  amount: number;
  orderId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  description?: string;
  imageUrl?: string;
  theme?: {
    color?: string;
  };
  notes?: Record<string, unknown>;
}

export interface UseRazorpayPaymentResult {
  isLoading: boolean;
  error: string | null;
  initiatePayment: (config: RazorpayPaymentConfig) => Promise<void>;
  verifyPayment: (razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string) => Promise<boolean>;
}

/**
 * Hook for Razorpay payment integration
 * Handles payment initiation, verification, and success/failure handling
 */
export function useRazorpayPayment(orderId: string): UseRazorpayPaymentResult {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initiate Razorpay payment
   * Opens Razorpay payment modal and handles result
   */
  const initiatePayment = useCallback(
    async (config: RazorpayPaymentConfig) => {
      setIsLoading(true);
      setError(null);

      try {
        // Prepare Razorpay configuration
        const razorpayConfig = {
          key: config.keyId,
          amount: Math.round(config.amount * 100), // Convert to paise
          currency: 'INR',
          name: 'Local Commerce Platform',
          description: config.description || `Order #${orderId}`,
          order_id: config.orderId,
          image: config.imageUrl || 'https://via.placeholder.com/150',
          prefill: {
            name: config.customerName || '',
            email: config.customerEmail || '',
            contact: config.customerPhone || '',
          },
          theme: config.theme || {
            color: '#3399cc',
          },
          notes: config.notes || {
            orderId,
            provider: PaymentProvider.RAZORPAY,
          },
          timeout: 900, // 15 minutes
          method: {
            upi: true,
            card: true,
            wallet: true,
            netbanking: true,
          },
        };

        // Open Razorpay checkout
        await new Promise<void>((resolve, reject) => {
          RazorpayCheckout.open(razorpayConfig)
            .then((paymentData: any) => {
              // Payment successful - paymentData contains razorpay_payment_id, razorpay_order_id, razorpay_signature
              resolve();
            })
            .catch((error: any) => {
              // Payment failed or user cancelled
              if (error?.code === 'CANCELLED') {
                setError('Payment cancelled by user');
              } else {
                setError(`Payment failed: ${error?.message || 'Unknown error'}`);
              }
              reject(error);
            });
        });
      } catch (err: any) {
        const errorMessage = err?.message || 'Payment initiation failed';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [orderId],
  );

  /**
   * Verify payment with backend
   * Called after successful Razorpay payment
   */
  const verifyPayment = useCallback(
    async (razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        // Verify payment with backend
        const response = await paymentsApi.verifyPayment(orderId, {
          razorpay_payment_id: razorpayPaymentId,
          razorpay_order_id: razorpayOrderId,
          razorpay_signature: razorpaySignature,
        });

        if (response.status === 'SUCCESS') {
          return true;
        } else if (response.status === 'FAILED') {
          setError(response.failure_reason || 'Payment verification failed');
          return false;
        } else {
          setError('Payment status unknown');
          return false;
        }
      } catch (err: any) {
        const errorMessage = err?.message || 'Payment verification failed';
        setError(errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [orderId],
  );

  return {
    isLoading,
    error,
    initiatePayment,
    verifyPayment,
  };
}
