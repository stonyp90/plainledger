/** All feature APIs share refreshed authentication, tenant scoping, and response handling. */
export { api as apiClient, api as default, ApiException, addRequestInterceptor, addResponseInterceptor } from '../../lib/api';
export type { ApiResponse, ApiError, RequestOptions } from '../../lib/api';
