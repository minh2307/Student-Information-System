/**
 * Notifications React Query Hook & Mutations
 * Manages notification state, unread counts, and optimistic read updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import { notificationApi } from '../services/notificationApi';
import { NotificationDto } from '../types';
import { SYNC_POLICIES } from '@/features/sync/syncPolicy';

export function useNotifications() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const scope = user ? `user_${user.id}` : 'current';
  const queryKey = queryKeys.notifications.list(scope);

  const query = useQuery<NotificationDto[], Error>({
    queryKey,
    queryFn: () => notificationApi.getNotifications(),
    enabled: Boolean(user),
    staleTime: SYNC_POLICIES.NOTIFICATIONS.staleTime,
    gcTime: SYNC_POLICIES.NOTIFICATIONS.gcTime,
    refetchOnReconnect: SYNC_POLICIES.NOTIFICATIONS.refetchOnReconnect,
    retry: 1,
  });

  const notifications = query.data || [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  /**
   * Optimistic mutation for marking a single notification as read.
   */
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationApi.markAsRead(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<NotificationDto[]>(queryKey);

      if (previous) {
        queryClient.setQueryData<NotificationDto[]>(
          queryKey,
          previous.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
      }

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  /**
   * Optimistic mutation for marking all notifications as read.
   */
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<NotificationDto[]>(queryKey);

      if (previous) {
        queryClient.setQueryData<NotificationDto[]>(
          queryKey,
          previous.map((n) => ({ ...n, isRead: true }))
        );
      }

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingRead: markAsReadMutation.isPending || markAllAsReadMutation.isPending,
  };
}
