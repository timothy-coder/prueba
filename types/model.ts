export interface Model {
  id: number
  name: string
  year: number
  version?: string
  brand_id: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ModelStore {
  lastId: number
  models: Model[]
}
