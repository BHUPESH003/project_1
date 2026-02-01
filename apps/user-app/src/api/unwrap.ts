/**
 * Backend wraps all responses in { code, data, message }.
 * Use this to extract data from axios response.
 */

export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

export function unwrap<T>(response: { data: ApiResponse<T> | T }): T {
  const body = response.data;
  if (body && typeof body === 'object' && 'data' in body && 'code' in body) {
    return (body as ApiResponse<T>).data;
  }
  return body as T;
}
