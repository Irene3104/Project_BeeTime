import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '../lib/api';
import { TimeGridEntry } from '../types/index';

export function useTimeEntries() {
  const queryClient = useQueryClient();

  const entries = useQuery('timeEntries', () => api.timeEntries.getAll());

  const createEntry = useMutation(
    (entry: Omit<TimeGridEntry, 'id'>) => api.timeEntries.create(entry),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('timeEntries');
      },
    }
  );

  const updateEntry = useMutation(
    ({ id, entry }: { id: string; entry: Partial<TimeGridEntry> }) =>
      api.timeEntries.update(id, entry),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('timeEntries');
      },
    }
  );

  return {
    entries: entries.data,
    isLoading: entries.isLoading,
    createEntry,
    updateEntry,
  };
}