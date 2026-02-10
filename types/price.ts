export interface Price {
  id: number
  model_id: number
  subtype_id: number
  price: number
  created_at: string
  updated_at: string
}

export interface PriceStore {
  lastId: number
  prices: Price[]
}
