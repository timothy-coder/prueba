import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"
import type { Type, TypeStore } from "@/types/type"

export const runtime = "nodejs"

const DATA_FILE = path.join(process.cwd(), "data", "types.json")

/* ===============================
   Helpers
================================*/
async function readStore(): Promise<TypeStore> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8")
    const parsed = JSON.parse(raw)

    return {
      lastId: Number(parsed.lastId || 0),
      types: Array.isArray(parsed.types) ? parsed.types : []
    }
  } catch (err: any) {
    if (err.code === "ENOENT") {
      const initial: TypeStore = { lastId: 0, types: [] }
      await writeStore(initial)
      return initial
    }
    throw err
  }
}

async function writeStore(store: TypeStore) {
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

  let result = store.types

  if (idParam) {
    const id = Number(idParam)
    result = result.filter(t => t.id === id)
  }

  if (qParam) {
    const q = qParam.toLowerCase()
    result = result.filter(t =>
      t.name.toLowerCase().includes(q)
    )
  }

  if (activeParam === "true") {
    result = result.filter(t => t.is_active)
  }

  if (activeParam === "false") {
    result = result.filter(t => !t.is_active)
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
      return NextResponse.json({ message: "Nombre obligatorio" }, { status: 400 })
    }

    const exists = store.types.some(
      t => t.name.toLowerCase() === name.toLowerCase()
    )

    if (exists) {
      return NextResponse.json({ message: "Tipo ya existe" }, { status: 400 })
    }

    const now = new Date().toISOString()
    const newId = store.lastId + 1

    const newType: Type = {
      id: newId,
      name,
      is_active: true,
      created_at: now,
      updated_at: now
    }

    store.lastId = newId
    store.types.push(newType)

    await writeStore(store)

    return NextResponse.json({ ok: true, data: newType })
  } catch (error: any) {
    return NextResponse.json(
      { message: "Error al crear tipo", detail: error.message },
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

    if (!id) {
      return NextResponse.json({ message: "Falta id" }, { status: 400 })
    }

    const idx = store.types.findIndex(t => t.id === id)

    if (idx === -1) {
      return NextResponse.json({ message: "Tipo no encontrado" }, { status: 404 })
    }

    const current = store.types[idx]

    const updated: Type = {
      ...current,
      ...body,
      id: current.id,
      updated_at: new Date().toISOString()
    }

    if (updated.is_active !== undefined) {
      updated.is_active = Boolean(updated.is_active)
    }

    store.types[idx] = updated
    await writeStore(store)

    return NextResponse.json({ ok: true, data: updated })
  } catch (error: any) {
    return NextResponse.json(
      { message: "Error al editar tipo", detail: error.message },
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

    const idx = store.types.findIndex(t => t.id === id)

    if (idx === -1) {
      return NextResponse.json({ message: "Tipo no encontrado" }, { status: 404 })
    }

    const deleted = store.types.splice(idx, 1)[0]

    await writeStore(store)

    return NextResponse.json({ ok: true, data: deleted })
  } catch (error: any) {
    return NextResponse.json(
      { message: "Error al eliminar tipo", detail: error.message },
      { status: 500 }
    )
  }
}
