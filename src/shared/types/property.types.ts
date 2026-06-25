/**
 * @file property.types.ts
 * @layer Shared
 * @responsibility Property and listing-related types
 */

export const PROPERTY_TYPES = ['apartment', 'house', 'cottage', 'dacha', 'commercial', 'land'] as const
export type PropertyType = (typeof PROPERTY_TYPES)[number]

export const DEAL_TYPES = ['daily', 'sale', 'rent', 'installment'] as const
export type DealType = (typeof DEAL_TYPES)[number]

export const PROPERTY_STATUSES = ['ready', 'half-ready', 'land', 'sold'] as const
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number]

export interface PropertyLocation {
  lat: number
  lng: number
  address: string
  district?: string
  city: string
}

export interface FloorPlanRoom {
  id: string
  name: string
  image: string
}

export interface FloorPlanFloor {
  id: string
  name: string
  image?: string
  rooms: FloorPlanRoom[]
}

export interface FloorPlan {
  floors: FloorPlanFloor[]
}

export interface Property {
  id: string
  sellerId: string
  title: string
  description: string
  price: number
  type: PropertyType
  dealType: DealType
  status: PropertyStatus
  rooms: number
  area: number
  floor?: number
  totalFloors?: number
  installmentMonths?: number
  installmentPrice?: number
  location: PropertyLocation
  images: string[]
  floorPlan?: FloorPlan
  views: number
  favorites: string[]
  isActive: boolean
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

export interface PropertyFilters {
  dealType?: DealType | 'all'
  propertyType?: PropertyType | 'all'
  status?: PropertyStatus | 'all'
  minPrice?: number
  maxPrice?: number
  search?: string
  city?: string
  district?: string
  minRooms?: number
  maxRooms?: number
  sort?: string
  page?: number
  limit?: number
}

export interface CreatePropertyRequest {
  title: string
  description?: string
  price: number
  type: PropertyType
  dealType: DealType
  status?: PropertyStatus
  rooms?: number
  area?: number
  floor?: number
  totalFloors?: number
  installmentMonths?: number
  installmentPrice?: number
  location: PropertyLocation
  images?: string[]
}

export interface UpdatePropertyRequest extends Partial<CreatePropertyRequest> {
  isActive?: boolean
}
