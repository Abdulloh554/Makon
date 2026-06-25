/**
 * @file api.types.ts
 * @layer Shared
 * @responsibility Standard API response envelope types for all endpoints
 */
export interface PaginationMeta {
    total: number;
    page: number;
    totalPages: number;
    limit: number;
}
export interface ApiSuccess<T> {
    success: true;
    data: T;
    meta?: PaginationMeta;
}
export interface ApiErrorDetail {
    field: string;
    message: string;
}
export interface ApiErrorBody {
    code: string;
    message: string;
    details?: ApiErrorDetail[] | unknown;
}
export interface ApiError {
    success: false;
    error: ApiErrorBody;
}
export type ApiResponse<T> = ApiSuccess<T> | ApiError;
export declare const ERROR_CODES: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly CONFLICT: "CONFLICT";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED";
    readonly UNPROCESSABLE: "UNPROCESSABLE";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
};
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
//# sourceMappingURL=api.types.d.ts.map