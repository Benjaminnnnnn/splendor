import axios from 'axios';

// Track if interceptors have been set up to prevent duplicates
let interceptorsSetup = false;

/**
 * Setup axios to automatically include JWT token in requests
 */
export const setupAxiosInterceptors = () => {
  // Prevent adding interceptors multiple times
  if (interceptorsSetup) {
    return;
  }
  interceptorsSetup = true;

  // Set default timeout to prevent hanging requests
  axios.defaults.timeout = 10000; // 10 seconds

  // Request interceptor to add token to headers
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('splendor_token');
    //   console.log('Axios interceptor triggered for:', config.url);
    //   console.log('Token from localStorage:', token ? `${token.substring(0, 20)}...` : 'NULL');
      
      if (token) {
        // Ensure headers object exists
        if (!config.headers) {
          config.headers = {} as any;
        }
        config.headers.Authorization = `Bearer ${token}`;
        // console.log('Axios interceptor: Token added to headers');
      } else {
        // Only warn for endpoints that require authentication
        const requiresAuth = (config.url?.includes('/chat/') || 
                           config.url?.includes('/friends')) &&
                           !config.url?.includes('/login') &&
                           !config.url?.includes('/register');
        if (requiresAuth) {
          console.warn('Axios interceptor: No token found for authenticated endpoint:', config.url);
        }
      }
      return config;
    },
    (error) => {
      console.error('Axios request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle 401 errors (token expired)
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      // Handle timeout errors
      if (error.code === 'ECONNABORTED') {
        console.error('Request timeout:', error.config?.url);
      }
      
      // Handle network errors
      if (!error.response) {
        console.error('Network error - server might be down:', error.message);
      }
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Token might be expired or invalid
        const currentPath = window.location.pathname;
        if (currentPath !== '/auth') {
          // Clear local storage and redirect to auth page
          localStorage.removeItem('splendor_user');
          localStorage.removeItem('splendor_token');
          console.log('Token expired or invalid, redirecting to auth page');
          // Don't actually redirect here - let the app handle it
        }
      }
      return Promise.reject(error);
    }
  );
};
