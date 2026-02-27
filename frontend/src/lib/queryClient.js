import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

// Create a client
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            gcTime: 1000 * 60 * 60 * 24, // 24 hours
            staleTime: 1000 * 60 * 10, // 10 minutes - Data stays fresh longer
            refetchOnWindowFocus: false, // Don't refetch on window focus
            retry: 1,
        },
    },
})

// Create a persister
export const persister = createSyncStoragePersister({
    storage: window.localStorage,
})
