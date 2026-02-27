/**
 * Centralized API configuration.
 * Uses VITE_API_URL env variable if set, otherwise defaults to localhost.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
