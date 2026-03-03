import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

// Create a client
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            gcTime: 1000 * 60 * 60 * 24, // 24 hours
            staleTime: 1000 * 60, // 1 minute (data becomes stale much faster)
            refetchOnWindowFocus: true, // Always refetch when user switches tabs/windows
            retry: 1,
        },
    },
})

// Create a persister
export const persister = createSyncStoragePersister({
    storage: window.localStorage,
})
