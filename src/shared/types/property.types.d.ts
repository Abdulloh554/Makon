/**
 * @file property.types.ts
 * @layer Shared
 * @responsibility Property and listing-related types
 */
export declare const PROPERTY_TYPES: readonly ["apartment", "house", "cottage", "dacha", "commercial", "land"];
export type PropertyType = (typeof PROPERTY_TYPES)[number];
export declare const DEAL_TYPES: readonly ["daily", "sale", "rent", "installment"];
export type DealType = (typeof DEAL_TYPES)[number];
export declare const PROPERTY_STATUSES: readonly ["ready", "half-ready", "land", "sold"];
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];
export interface PropertyLocation {
    lat: number;
    lng: number;
    address: string;
    district?: string;
    city: string;
}
export interface FloorPlanRoom {
    id: string;
    name: string;
    image: string;
}
export interface FloorPlanFloor {
    id: string;
    name: string;
    image?: string;
    rooms: FloorPlanRoom[];
}
export interface FloorPlan {
    floors: FloorPlanFloor[];
}
export interface Property {
    id: string;
    sellerId: string;
    title: string;
    description: string;
    price: number;
    type: PropertyType;
    dealType: DealType;
    status: PropertyStatus;
    rooms: number;
    area: number;
    floor?: number;
    totalFloors?: number;
    installmentMonths?: number;
    installmentPrice?: number;
    location: PropertyLocation;
    images: string[];
    floorPlan?: FloorPlan;
    views: number;
    favorites: string[];
    isActive: boolean;
    expiresAt?: string;
    createdAt: string;
    updatedAt: string;
}
export interface PropertyFilters {
    dealType?: DealType | 'all';
    propertyType?: PropertyType | 'all';
    status?: PropertyStatus | 'all';
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    city?: string;
    district?: string;
    minRooms?: number;
    maxRooms?: number;
    sort?: string;
    page?: number;
    limit?: number;
}
export interface CreatePropertyRequest {
    title: string;
    description?: string;
    price: number;
    type: PropertyType;
    dealType: DealType;
    status?: PropertyStatus;
    rooms?: number;
    area?: number;
    floor?: number;
    totalFloors?: number;
    installmentMonths?: number;
    installmentPrice?: number;
    location: PropertyLocation;
    images?: string[];
}
export interface UpdatePropertyRequest extends Partial<CreatePropertyRequest> {
    isActive?: boolean;
}
//# sourceMappingURL=property.types.d.ts.map