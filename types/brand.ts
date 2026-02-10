export interface Brand {
  id: number
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BrandStore {
  lastId: number
  brands: Brand[]
}
