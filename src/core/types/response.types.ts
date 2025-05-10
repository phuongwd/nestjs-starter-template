/**
 * @interface Response
 * @description Standard response wrapper for API responses
 */
export interface Response<T> {
  data: T;
  metadata: {
    timestamp: string;
    path: string;
  };
}
