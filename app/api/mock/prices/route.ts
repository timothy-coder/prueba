import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"
import type { Price, PriceStore } from "@/types/price"

export const runtime = "nodejs"

const PRICE_FILE = path.join(process.cwd(), "data", "prices.json")
const MODEL_FILE = path.join(process.cwd(), "data", "models.json")
const BRAND_FILE = path.join(process.cwd(), "data", "brands.json")
const SUBTYPE_FILE = path.join(process.cwd(), "data", "subtypes.json")
const TYPE_FILE = path.join(process.cwd(), "data", "types.json")

/* ===============================
   Helpers
================================*/
async function readJSON(file: string) {
  try {
    const raw = await fs.readFile(file, "utf-8")
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function readPrices(): Promise<PriceStore> {
  const data = await readJSON(PRICE_FILE)
  if (!data) {
    const init: PriceStore = { lastId: 0, prices: [] }
    await writePrices(init)
    return init
  }
  return data
}

async function writePrices(store: PriceStore) {
  await fs.mkdir(path.dirname(PRICE_FILE), { recursive: true })
  await fs.writeFile(PRICE_FILE, JSON.stringify(store, null, 2))
}

/* ===============================
   ✅ GET – JOIN mock completo
================================*/
export async function GET() {
  const priceStore = await readPrices()

  const models = (await readJSON(MODEL_FILE))?.models || []
  const brands = (await readJSON(BRAND_FILE))?.brands || []
  const subtypes = (await readJSON(SUBTYPE_FILE))?.subtypes || []
  const types = (await readJSON(TYPE_FILE))?.types || []

  const result = priceStore.prices
    .map(p => {
      const model = models.find((m: any) => m.id === p.model_id && m.is_active)
      if (!model) return null

      const brand = brands.find((b: any) => b.id === model.brand_id)

      const subtype = subtypes.find((s: any) => s.id === p.subtype_id && s.is_active)
      if (!subtype) return null

      const type = types.find((t: any) => t.id === subtype.type_id)

      return {
        ...p,
        model_name: model.name,
        year: model.year,
        version: model.version,
        brand_name: brand?.name || null,
        subtype_name: subtype.name,
        type_name: type?.name || null
      }
    })
    .filter(Boolean)

  return NextResponse.json(result)
}

/* ===============================
   ✅ POST – Guardar matriz
================================*/
export async function POST(req: Request) {
  try {
    const data = await req.json()
    const store = await readPrices()

    for (const [modelId, subtypes] of Object.entries(data)) {
      for (const [subtypeId, price] of Object.entries(subtypes as any)) {

        if (!price || isNaN(Number(price))) continue

        const existing = store.prices.find(
          p =>
            p.model_id === Number(modelId) &&
            p.subtype_id === Number(subtypeId)
        )

        if (existing) {
          existing.price = Number(price)
          existing.updated_at = new Date().toISOString()
        } else {
          const newId = store.lastId + 1

          const newPrice: Price = {
            id: newId,
            model_id: Number(modelId),
            subtype_id: Number(subtypeId),
            price: Number(price),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          store.lastId = newId
          store.prices.push(newPrice)
        }
      }
    }

    await writePrices(store)

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json(
      { message: "Error al guardar precios", detail: error.message },
      { status: 500 }
    )
  }
}
