export interface Client {
  id: number
  dni: string
  placa: string
  vin: string
  kms: number
  celular: string
  email: string
  estado: boolean
  model_id: number
  brand_id: number
  created_at: string
  updated_at: string
}

export interface ClientStore {
  lastId: number
  clients: Client[]
}
