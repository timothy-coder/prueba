import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"
import type { Brand, BrandStore } from "@/types/brand"

export const runtime = "nodejs"

const DATA_FILE = path.join(process.cwd(), "data", "brands.json")

/* ===============================
   Helpers
================================*/
async function readStore(): Promise<BrandStore> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8")
    const parsed = JSON.parse(raw)

    return {
      lastId: Number(parsed.lastId || 0),
      brands: Array.isArray(parsed.brands) ? parsed.brands : []
    }
  } catch (err: any) {
    if (err.code === "ENOENT") {
      const initial: BrandStore = { lastId: 0, brands: [] }
      await writeStore(initial)
      return initial
    }
    throw err
  }
}

async function writeStore(store: BrandStore) {
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
  const qParam = url.searchParams.get("q")
  const activeParam = url.searchParams.get("active")

  let result = store.brands

  if (idParam) {
    const id = Number(idParam)
    result = result.filter(b => b.id === id)
  }

  if (qParam) {
    const q = qParam.toLowerCase()
    result = result.filter(b =>
      b.name.toLowerCase().includes(q)
    )
  }

  if (activeParam === "true") {
    result = result.filter(b => b.is_active)
  }

  if (activeParam === "false") {
    result = result.filter(b => !b.is_active)
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

    if (!name) {
      return NextResponse.json({ message: "Nombre requerido" }, { status: 400 })
    }

    const exists = store.brands.some(
      b => b.name.toLowerCase() === name.toLowerCase()
    )

    if (exists) {
      return NextResponse.json({ message: "Marca ya existe" }, { status: 400 })
    }

    const now = new Date().toISOString()
    const newId = store.lastId + 1

    const newBrand: Brand = {
      id: newId,
      name,
      is_active: true,
      created_at: now,
      updated_at: now
    }

    store.lastId = newId
    store.brands.push(newBrand)

    await writeStore(store)

    return NextResponse.json({ ok: true, data: newBrand })
  } catch (error: any) {
    return NextResponse.json(
      { message: "Error al crear marca", detail: error.message },
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

    const idx = store.brands.findIndex(b => b.id === id)
    if (idx === -1) return NextResponse.json({ message: "Marca no encontrada" }, { status: 404 })

    const name = body.name !== undefined
      ? String(body.name).trim()
      : store.brands[idx].name

    const is_active = body.is_active !== undefined
      ? Boolean(body.is_active)
      : store.brands[idx].is_active

    const updated: Brand = {
      ...store.brands[idx],
      name,
      is_active,
      updated_at: new Date().toISOString()
    }

    store.brands[idx] = updated
    await writeStore(store)

    return NextResponse.json({ ok: true, data: updated })
  } catch (error: any) {
    return NextResponse.json(
      { message: "Error al editar marca", detail: error.message },
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

    const idx = store.brands.findIndex(b => b.id === id)
    if (idx === -1) return NextResponse.json({ message: "Marca no encontrada" }, { status: 404 })

    const deleted = store.brands.splice(idx, 1)[0]

    await writeStore(store)

    return NextResponse.json({ ok: true, data: deleted })
  } catch (error: any) {
    return NextResponse.json(
      { message: "Error al eliminar marca", detail: error.message },
      { status: 500 }
    )
  }
}
