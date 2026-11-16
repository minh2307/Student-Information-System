/**
 * Custom Hook: useProfile
 * Fetches and synchronizes user profile via TanStack Query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../services/authApi';
import { queryKeys } from '@/api/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import { UpdateProfileRequest, UserProfileResponse } from '@/types';

export const useProfile = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const profileQuery = useQuery<UserProfileResponse>({
    queryKey: queryKeys.auth.me(user?.id),
    queryFn: () => authApi.getProfile(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateProfileRequest) => authApi.updateProfile(data),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(queryKeys.auth.me(user?.id), updatedProfile);
      if (updatedProfile.user) {
        useAuthStore.getState().updateSession({
          accessToken: '', // Keep existing token
          user: updatedProfile.user,
          studentProfile: updatedProfile.studentProfile,
          lecturerProfile: updatedProfile.lecturerProfile,
        });
      }
    },
  });

  return {
    ...profileQuery,
    profile: profileQuery.data,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdating: updateProfileMutation.isPending,
    updateError: updateProfileMutation.error,
  };
};
