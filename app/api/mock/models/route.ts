import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"
import type { Model, ModelStore } from "@/types/model"

export const runtime = "nodejs"

const DATA_FILE = path.join(process.cwd(), "data", "models.json")

/* ===============================
   Helpers
================================*/
async function readStore(): Promise<ModelStore> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8")
    const parsed = JSON.parse(raw)

    return {
      lastId: Number(parsed.lastId || 0),
      models: Array.isArray(parsed.models) ? parsed.models : []
    }
  } catch (err: any) {
    if (err.code === "ENOENT") {
      const initial: ModelStore = { lastId: 0, models: [] }
      await writeStore(initial)
      return initial
    }
    throw err
  }
}

async function writeStore(store: ModelStore) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2))
}

/* ===============================
   ✅ GET – Listar / Buscar
================================*/
export async function GET(request: Request) {
  const store = await readStore()
  const url = new URL(request.url)

  const idParam = url.searchParams.get("id")
  const brandParam = url.searchParams.get("brand_id")
  const qParam = url.searchParams.get("q")
  const activeParam = url.searchParams.get("active")

  let result = store.models

  if (idParam) {
    const id = Number(idParam)
    result = result.filter(m => m.id === id)
  }

  if (brandParam) {
    const brand_id = Number(brandParam)
    result = result.filter(m => m.brand_id === brand_id)
  }

  if (qParam) {
    const q = qParam.toLowerCase()
    result = result.filter(m =>
      `${m.name} ${m.version}`.toLowerCase().includes(q)
    )
  }

  if (activeParam === "true") {
    result = result.filter(m => m.is_active)
  }

  if (activeParam === "false") {
    result = result.filter(m => !m.is_active)
  }

  return NextResponse.json(result)
}

/* ===============================
   ✅ POST – Crear
================================*/
export async function POST(request: Request) {
  try {
    const store = await readStore()
    const body = await request.json()

    const name = String(body.name || "").trim()
    const year = Number(body.year || 0)
    const version = String(body.version || "").trim()
    const brand_id = Number(body.brand_id || 0)

    if (!name || !year || !brand_id) {
      return NextResponse.json({ message: "Campos obligatorios faltantes" }, { status: 400 })
    }

    const now = new Date().toISOString()
    const newId = store.lastId + 1

    const newModel: Model = {
      id: newId,
      name,
      year,
      version,
      brand_id,
      is_active: true,
      created_at: now,
      updated_at: now
    }

    store.lastId = newId
    store.models.push(newModel)

    await writeStore(store)

    return NextResponse.json({ ok: true, data: newModel })
  } catch (error: any) {
    return NextResponse.json(
      { message: "Error al crear modelo", detail: error.message },
      { status: 500 }
    )
  }
}

/* ===============================
   ✅ PUT – Editar
================================*/
export async function PUT(request: Request) {
  try {
    const store = await readStore()
    const body = await request.json()

    const id = Number(body.id || 0)

    if (!id) return NextResponse.json({ message: "Falta id" }, { status: 400 })

    const idx = store.models.findIndex(m => m.id === id)

    if (idx === -1) {
      return NextResponse.json({ message: "Modelo no encontrado" }, { status: 404 })
    }

    const current = store.models[idx]

    const updated: Model = {
      ...current,
      ...body,
      id: current.id,
      updated_at: new Date().toISOString()
    }

    if (updated.year !== undefined) updated.year = Number(updated.year)
    if (updated.brand_id !== undefined) updated.brand_id = Number(updated.brand_id)
    if (updated.is_active !== undefined) updated.is_active = Boolean(updated.is_active)

    store.models[idx] = updated
    await writeStore(store)

    return NextResponse.json({ ok: true, data: updated })
  } catch (error: any) {
    return NextResponse.json(
      { message: "Error al editar modelo", detail: error.message },
      { status: 500 }
    )
  }
}

/* ===============================
   ✅ DELETE – Eliminar
================================*/
export async function DELETE(request: Request) {
  try {
    const store = await readStore()
    const body = await request.json()

    const id = Number(body.id || 0)

    const idx = store.models.findIndex(m => m.id === id)

    if (idx === -1) {
      return NextResponse.json({ message: "Modelo no encontrado" }, { status: 404 })
    }

    const deleted = store.models.splice(idx, 1)[0]

    await writeStore(store)

    return NextResponse.json({ ok: true, data: deleted })
  } catch (error: any) {
    return NextResponse.json(
      { message: "Error al eliminar modelo", detail: error.message },
      { status: 500 }
    )
  }
}
