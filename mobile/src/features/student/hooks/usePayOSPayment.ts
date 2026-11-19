/**
 * PayOS Payment Lifecycle & Checkout Hook (TASK ST-04)
 * Manages online payment order creation, dynamic QR rendering,
 * backend-authoritative status reconciliation, idempotency, and unmount safety.
 */

import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { studentApi } from '../services/studentApi';
import { PayOSPaymentLinkResponse, Tuition } from '../types';

export type PaymentCheckoutStatus =
  | 'idle'
  | 'creating'
  | 'checkout_ready'
  | 'verifying'
  | 'success'
  | 'failed'
  | 'error';

export interface PayOSPaymentState {
  status: PaymentCheckoutStatus;
  paymentData: PayOSPaymentLinkResponse | null;
  verifiedTuition: Tuition | null;
  errorMessage: string | null;
}

export const usePayOSPayment = () => {
  const queryClient = useQueryClient();
  const isLockedRef = useRef(false);

  const [state, setState] = useState<PayOSPaymentState>({
    status: 'idle',
    paymentData: null,
    verifiedTuition: null,
    errorMessage: null,
  });

  /**
   * Initiate PayOS Checkout by requesting a dynamic payment link from Backend.
   */
  const initiateCheckout = useCallback(
    async (semester?: string) => {
      if (isLockedRef.current) return;
      isLockedRef.current = true;

      setState({
        status: 'creating',
        paymentData: null,
        verifiedTuition: null,
        errorMessage: null,
      });

      try {
        const response = await studentApi.createPayOSPaymentLink({
          semester,
          returnUrl: 'rikkei-eduportal://tuition/payos-return',
          cancelUrl: 'rikkei-eduportal://tuition/payos-cancel',
        });

        setState({
          status: 'checkout_ready',
          paymentData: response,
          verifiedTuition: null,
          errorMessage: null,
        });
        return response;
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Không thể khởi tạo cổng thanh toán PayOS. Vui lòng thử lại sau.';
        setState({
          status: 'error',
          paymentData: null,
          verifiedTuition: null,
          errorMessage: msg,
        });
        throw err;
      } finally {
        isLockedRef.current = false;
      }
    },
    []
  );

  /**
   * Verify and reconcile payment status with Backend (Backend is Single Source of Truth).
   * Never declare payment success based on client redirect URLs alone.
   */
  const verifyPaymentWithBackend = useCallback(
    async (orderCode?: number, semester?: string) => {
      const targetOrderCode = orderCode || state.paymentData?.orderCode;
      if (!targetOrderCode) return null;

      setState((prev) => ({
        ...prev,
        status: 'verifying',
        errorMessage: null,
      }));

      try {
        const updatedTuition = await studentApi.checkPayOSStatus(targetOrderCode, semester);

        const isPaid = updatedTuition.status === 'PAID';
        setState({
          status: isPaid ? 'success' : 'checkout_ready',
          paymentData: state.paymentData,
          verifiedTuition: updatedTuition,
          errorMessage: isPaid ? null : 'Giao dịch chưa hoàn tất hoặc đang chờ ngân hàng quyết toán.',
        });

        if (isPaid) {
          queryClient.invalidateQueries({ queryKey: ['student'] });
        }

        return updatedTuition;
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Không thể đồng bộ trạng thái thanh toán từ máy chủ.';
        setState((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: msg,
        }));
        throw err;
      }
    },
    [state.paymentData, queryClient]
  );

  /**
   * Reset checkout state back to idle.
   */
  const resetCheckout = useCallback(() => {
    isLockedRef.current = false;
    setState({
      status: 'idle',
      paymentData: null,
      verifiedTuition: null,
      errorMessage: null,
    });
  }, []);

  return {
    state,
    paymentData: state.paymentData,
    verifiedTuition: state.verifiedTuition,
    errorMessage: state.errorMessage,
    isCreating: state.status === 'creating',
    isCheckoutReady: state.status === 'checkout_ready',
    isVerifying: state.status === 'verifying',
    isSuccess: state.status === 'success',
    initiateCheckout,
    verifyPaymentWithBackend,
    verifyPaymentStatus: verifyPaymentWithBackend,
    resetCheckout,
    reset: resetCheckout,
  };
};
