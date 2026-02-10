import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"
import type { Subtype, SubtypeStore } from "@/types/subtype"

export const runtime = "nodejs"

const DATA_FILE = path.join(process.cwd(), "data", "subtypes.json")
const TYPES_FILE = path.join(process.cwd(), "data", "types.json")

/* ===============================
   Helpers
================================*/
async function readSubtypes(): Promise<SubtypeStore> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8")
    const parsed = JSON.parse(raw)

    return {
      lastId: Number(parsed.lastId || 0),
      subtypes: Array.isArray(parsed.subtypes) ? parsed.subtypes : []
    }
  } catch (err: any) {
    if (err.code === "ENOENT") {
      const initial: SubtypeStore = { lastId: 0, subtypes: [] }
      await writeSubtypes(initial)
      return initial
    }
    throw err
  }
}

async function writeSubtypes(store: SubtypeStore) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2))
}

async function readTypes() {
  try {
    const raw = await fs.readFile(TYPES_FILE, "utf-8")
    return JSON.parse(raw).types || []
  } catch {
    return []
  }
}

/* ===============================
   ✅ GET – Listar con JOIN mock
================================*/
export async function GET(request: Request) {
  const store = await readSubtypes()
  const types = await readTypes()

  const url = new URL(request.url)
  const idParam = url.searchParams.get("id")
  const typeParam = url.searchParams.get("type_id")
  const qParam = url.searchParams.get("q")

  let result = store.subtypes

  if (idParam) {
    const id = Number(idParam)
    result = result.filter(s => s.id === id)
  }

  if (typeParam) {
    const type_id = Number(typeParam)
    result = result.filter(s => s.type_id === type_id)
  }

  if (qParam) {
    const q = qParam.toLowerCase()
    result = result.filter(s =>
      `${s.name} ${s.version}`.toLowerCase().includes(q)
    )
  }

  // JOIN mock
  const enriched = result.map(s => ({
    ...s,
    type_name: types.find((t: any) => t.id === s.type_id)?.name || null
  }))

  return NextResponse.json(enriched)
}

/* ===============================
   ✅ POST – Crear
================================*/
export async function POST(request: Request) {
  try {
    const store = await readSubtypes()
    const body = await request.json()

    const name = String(body.name || "").trim()
    const type_id = Number(body.type_id || 0)
    const year = body.year ? Number(body.year) : null
    const version = String(body.version || "").trim()

    if (!name || !type_id) {
      return NextResponse.json({ message: "Nombre o tipo inválido" }, { status: 400 })
    }

    const now = new Date().toISOString()
    const newId = store.lastId + 1

    const newSubtype: Subtype = {
      id: newId,
      name,
      type_id,
      year,
      version,
      is_active: true,
      created_at: now,
      updated_at: now
    }

    store.lastId = newId
    store.subtypes.push(newSubtype)

    await writeSubtypes(store)

    return NextResponse.json({ ok: true, data: newSubtype })
  } catch (error: any) {
    return NextResponse.json(
      { message: "Error al crear subtipo", detail: error.message },
      { status: 500 }
    )
  }
}

/* ===============================
   ✅ PUT – Editar
================================*/
export async function PUT(request: Request) {
  try {
    const store = await readSubtypes()
    const body = await request.json()

    const id = Number(body.id || 0)
    if (!id) return NextResponse.json({ message: "Falta id" }, { status: 400 })

    const idx = store.subtypes.findIndex(s => s.id === id)

    if (idx === -1) {
      return NextResponse.json({ message: "Subtipo no encontrado" }, { status: 404 })
    }

    const current = store.subtypes[idx]

    const updated: Subtype = {
      ...current,
      ...body,
      id: current.id,
      updated_at: new Date().toISOString()
    }

    if (updated.type_id !== undefined) updated.type_id = Number(updated.type_id)
    if (updated.year !== undefined && updated.year !== null) updated.year = Number(updated.year)
    if (updated.is_active !== undefined) updated.is_active = Boolean(updated.is_active)

    store.subtypes[idx] = updated

    await writeSubtypes(store)

    return NextResponse.json({ ok: true, data: updated })
  } catch (error: any) {
    return NextResponse.json(
      { message: "Error al editar subtipo", detail: error.message },
      { status: 500 }
    )
  }
}

/* ===============================
   ✅ DELETE – Eliminar
================================*/
export async function DELETE(request: Request) {
  try {
    const store = await readSubtypes()
    const body = await request.json()

    const id = Number(body.id || 0)

    const idx = store.subtypes.findIndex(s => s.id === id)

    if (idx === -1) {
      return NextResponse.json({ message: "Subtipo no encontrado" }, { status: 404 })
    }

    const deleted = store.subtypes.splice(idx, 1)[0]

    await writeSubtypes(store)

    return NextResponse.json({ ok: true, data: deleted })
  } catch (error: any) {
    return NextResponse.json(
      { message: "Error al eliminar subtipo", detail: error.message },
      { status: 500 }
    )
  }
}
