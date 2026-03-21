const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? '';

export const API_BASE_URL = baseUrl.replace(/\/$/, '');

export const getApiUrl = (path: string) => `${API_BASE_URL}${path}`;

