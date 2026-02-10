import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"
import type { Client, ClientStore } from "@/types/client"

export const runtime = "nodejs"

const DATA_FILE = path.join(process.cwd(), "data", "clients.json")

async function readStore(): Promise<ClientStore> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8")
    const parsed = JSON.parse(raw)
    return {
      lastId: Number(parsed.lastId || 0),
      clients: Array.isArray(parsed.clients) ? parsed.clients : [],
    }
  } catch (err: any) {
    if (err.code === "ENOENT") {
      const initial: ClientStore = { lastId: 0, clients: [] }
      await writeStore(initial)
      return initial
    }
    throw err
  }
}

async function writeStore(store: ClientStore): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf-8")
}

/* ===============================
   ✅ GET – Listar / Buscar
   /api/mock/clients
   Query params opcionales:
   - id=1
   - placa=B7K-123
   - dni=12345678
   - email=a@b.com
   - q=texto (dni/placa/vin/email/celular)
================================*/
export async function GET(request: Request) {
  const store = await readStore()
  const url = new URL(request.url)

  const idParam = url.searchParams.get("id")
  const placaParam = url.searchParams.get("placa")
  const dniParam = url.searchParams.get("dni")
  const emailParam = url.searchParams.get("email")
  const qParam = url.searchParams.get("q")

  let result = store.clients

  if (idParam) {
    const id = Number(idParam)
    result = result.filter((c) => c.id === id)
  }

  if (placaParam) {
    const placa = placaParam.trim().toUpperCase()
    result = result.filter((c) => String(c.placa).toUpperCase() === placa)
  }

  if (dniParam) {
    const dni = dniParam.trim()
    result = result.filter((c) => c.dni === dni)
  }

  if (emailParam) {
    const email = emailParam.trim().toLowerCase()
    result = result.filter((c) => String(c.email).toLowerCase() === email)
  }

  if (qParam) {
    const q = qParam.trim().toLowerCase()
    result = result.filter((c) => {
      const haystack = [
        c.dni,
        c.placa,
        c.vin,
        c.email,
        c.celular,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
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

    const dni = String(body.dni || "").trim()
    const placa = String(body.placa || "").trim().toUpperCase()
    const vin = String(body.vin || "").trim()
    const kms = Number(body.kms || 0)
    const celular = String(body.celular || "").trim()
    const email = String(body.email || "").trim().toLowerCase()
    const estado = Boolean(body.estado)
    const model_id = Number(body.model_id || 0)
    const brand_id = Number(body.brand_id || 0)

    if (!dni || !placa || !vin || !kms || !celular || !email || !model_id || !brand_id) {
      return NextResponse.json({ message: "Datos incompletos" }, { status: 400 })
    }

    const exists = store.clients.some(
      (c) => c.dni === dni || c.email === email || c.placa === placa
    )
    if (exists) {
      return NextResponse.json(
        { message: "Cliente ya existe (DNI, email o placa duplicada)" },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const newId = store.lastId + 1

    const newClient: Client = {
      id: newId,
      dni,
      placa,
      vin,
      kms,
      celular,
      email,
      estado,
      model_id,
      brand_id,
      created_at: now,
      updated_at: now,
    }

    store.lastId = newId
    store.clients.push(newClient)
    await writeStore(store)

    return NextResponse.json({ ok: true, data: newClient })
  } catch (error: any) {
    return NextResponse.json(
      { message: "Error al crear cliente", detail: error.message },
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

    const idx = store.clients.findIndex((c) => c.id === id)
    if (idx === -1) return NextResponse.json({ message: "Cliente no encontrado" }, { status: 404 })

    const nextDni = body.dni !== undefined ? String(body.dni).trim() : null
    const nextEmail = body.email !== undefined ? String(body.email).trim().toLowerCase() : null
    const nextPlaca = body.placa !== undefined ? String(body.placa).trim().toUpperCase() : null

    if (nextDni) {
      const taken = store.clients.some((c) => c.id !== id && c.dni === nextDni)
      if (taken) return NextResponse.json({ message: "DNI ya registrado" }, { status: 400 })
    }

    if (nextEmail) {
      const taken = store.clients.some((c) => c.id !== id && c.email === nextEmail)
      if (taken) return NextResponse.json({ message: "Email ya registrado" }, { status: 400 })
    }

    if (nextPlaca) {
      const taken = store.clients.some((c) => c.id !== id && c.placa === nextPlaca)
      if (taken) return NextResponse.json({ message: "Placa ya registrada" }, { status: 400 })
    }

    const current = store.clients[idx]

    const updated: Client = {
      ...current,
      ...body,
      id: current.id,
      dni: nextDni ?? current.dni,
      email: nextEmail ?? current.email,
      placa: nextPlaca ?? current.placa,
      updated_at: new Date().toISOString(),
    }

    if (updated.kms !== undefined) updated.kms = Number(updated.kms || 0)
    if (updated.model_id !== undefined) updated.model_id = Number(updated.model_id || 0)
    if (updated.brand_id !== undefined) updated.brand_id = Number(updated.brand_id || 0)
    if (updated.estado !== undefined) updated.estado = Boolean(updated.estado)

    store.clients[idx] = updated
    await writeStore(store)

    return NextResponse.json({ ok: true, data: updated })
  } catch (error: any) {
    return NextResponse.json(
      { message: "Error al editar cliente", detail: error.message },
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

    if (!id) return NextResponse.json({ message: "Falta id" }, { status: 400 })

    const idx = store.clients.findIndex((c) => c.id === id)
    if (idx === -1) return NextResponse.json({ message: "Cliente no encontrado" }, { status: 404 })

    const deleted = store.clients.splice(idx, 1)[0]
    await writeStore(store)

    return NextResponse.json({ ok: true, data: deleted })
  } catch (error: any) {
    return NextResponse.json(
      { message: "Error al eliminar cliente", detail: error.message },
      { status: 500 }
    )
  }
}
