export interface Type {
  id: number
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TypeStore {
  lastId: number
  types: Type[]
}
