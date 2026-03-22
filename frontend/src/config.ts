const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? '';

const shouldUseConfiguredBaseUrl = () => {
  if (!baseUrl) {
    return false;
  }

  if (import.meta.env.DEV) {
    return true;
  }

  try {
    const parsed = new URL(baseUrl);
    return !['127.0.0.1', 'localhost'].includes(parsed.hostname);
  } catch {
    return false;
  }
};

export const API_BASE_URL = shouldUseConfiguredBaseUrl() ? baseUrl.replace(/\/$/, '') : '';

export const getApiUrl = (path: string) => `${API_BASE_URL}${path}`;
