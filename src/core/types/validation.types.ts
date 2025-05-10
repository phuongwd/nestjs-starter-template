/**
 * @type ValidationError
 * @description Type for validation error messages
 */
export type ValidationError = {
  property: string;
  constraints?: Record<string, string>;
};
