import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { errorMessage } from './api';
import { useAuth } from './auth';
import type { Ticket } from './catalog';

/** The signed-in user's requests, reloaded whenever the screen comes into focus. */
export function useTickets() {
  const { api } = useAuth();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await api<{ tickets: Ticket[] }>('/tickets');
      setTickets(res.tickets);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { tickets, error, reload };
}
