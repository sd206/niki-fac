export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

export interface WhoAmIResponse {
  uid: string;
  email: string | null;
  displayName: string | null;
  families: Array<{ familyId: string; role: string }>;
}
