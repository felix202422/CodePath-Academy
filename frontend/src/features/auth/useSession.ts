import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { getSession, logout, SESSION_QUERY_KEY, type SessionUser } from './authApi';

export function useSession() {
  return useQuery<SessionUser | null, Error>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: getSession,
  });
}

/** Shared logout action keeps the session cache and route in sync. */
export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData<SessionUser | null>(SESSION_QUERY_KEY, null);
      void queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
      navigate('/', { replace: true });
    },
  });
}
