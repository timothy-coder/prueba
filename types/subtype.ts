export interface Subtype {
  id: number
  name: string
  type_id: number
  year?: number | null
  version?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SubtypeStore {
  lastId: number
  subtypes: Subtype[]
}
