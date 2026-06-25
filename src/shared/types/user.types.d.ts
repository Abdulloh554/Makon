/**
 * @file user.types.ts
 * @layer Shared
 * @responsibility User and auth-related types
 */
export declare const USER_ROLES: readonly ["user", "seller", "admin"];
export type UserRole = (typeof USER_ROLES)[number];
export declare const AUTH_PROVIDERS: readonly ["local", "telegram", "google"];
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];
export interface User {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    phone: string;
    email?: string;
    avatar: string;
    role: UserRole;
    isActive: boolean;
    isVerified: boolean;
    provider: AuthProvider;
    telegramId?: string;
    telegramUsername?: string;
    lastLoginAt?: string;
    createdAt: string;
    updatedAt: string;
}
export interface LoginRequest {
    phone: string;
    password: string;
}
export interface RegisterRequest {
    firstName: string;
    lastName: string;
    phone: string;
    password: string;
}
export interface AuthResponse {
    user: User;
    csrfToken: string;
}
export interface RefreshResponse {
    user: User;
    csrfToken: string;
}
export interface ForgotPasswordRequest {
    phone: string;
}
export interface ResetPasswordRequest {
    token: string;
    password: string;
}
//# sourceMappingURL=user.types.d.ts.map