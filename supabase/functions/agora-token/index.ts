import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// ── Agora RtcTokenBuilder (Deno-compatible pure TS implementation) ──────────
// Reference: https://github.com/AgoraIO/Tools/tree/master/DynamicKey/AgoraDynamicKey

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Privilege enums ──
const Role = { PUBLISHER: 1, SUBSCRIBER: 2 }

// ── HMAC-SHA256 via Web Crypto ──
async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, data)
  return new Uint8Array(sig)
}

// ── CRC32 table ──
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return t
})()

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff
  for (const b of buf) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

// ── Pack little-endian helpers ──
function packUint16LE(v: number): Uint8Array {
  return new Uint8Array([v & 0xff, (v >> 8) & 0xff])
}
function packUint32LE(v: number): Uint8Array {
  return new Uint8Array([v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff])
}
function packString(s: string): Uint8Array {
  const enc = new TextEncoder().encode(s)
  return new Uint8Array([...packUint16LE(enc.length), ...enc])
}
function packMap(m: Map<number, number>): Uint8Array {
  const entries = Array.from(m.entries()).sort((a, b) => a[0] - b[0])
  const parts: Uint8Array[] = [packUint16LE(entries.length)]
  for (const [k, v] of entries) {
    parts.push(packUint16LE(k))
    parts.push(packUint32LE(v))
  }
  const total = parts.reduce((s, p) => s + p.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const p of parts) { out.set(p, off); off += p.length }
  return out
}
function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const a of arrays) { out.set(a, off); off += a.length }
  return out
}

// ── Build RTC token ──
async function buildTokenWithUid(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: number,
  role: number,
  privilegeExpiredTs: number,
): Promise<string> {
  const VERSION = '006'
  const salt    = Math.floor(Math.random() * 0xffffffff) + 1
  const ts      = Math.floor(Date.now() / 1000)

  // Privileges map: key = privilege type, value = expiry timestamp
  const privileges = new Map<number, number>([
    [1, privilegeExpiredTs], // join channel
    [2, privilegeExpiredTs], // publish audio
    [3, privilegeExpiredTs], // publish video
    [4, privilegeExpiredTs], // publish data
  ])
  if (role === Role.SUBSCRIBER) {
    privileges.set(7, privilegeExpiredTs) // subscribe audio
    privileges.set(8, privilegeExpiredTs) // subscribe video
  }

  // Message = salt + ts + privileges
  const message = concat(
    packUint32LE(salt),
    packUint32LE(ts),
    packMap(privileges),
  )

  // Signing string = appId + channelName + uid + message
  const uidStr = uid === 0 ? '' : String(uid)
  const toSign = concat(
    new TextEncoder().encode(appId),
    new TextEncoder().encode(channelName),
    new TextEncoder().encode(uidStr),
    message,
  )

  const certBytes = new TextEncoder().encode(appCertificate)
  const signature = await hmacSha256(certBytes, toSign)

  // Content = signature + appId + channelName + uid + message
  const content = concat(
    packString(String.fromCharCode(...signature)),
    packString(appId),
    packString(channelName),
    packString(uidStr),
    message,
  )

  // CRC check bytes
  const crcChannel = crc32(new TextEncoder().encode(channelName))
  const crcUid     = crc32(new TextEncoder().encode(uidStr))
  const checksum = concat(packUint32LE(crcChannel), packUint32LE(crcUid))

  // Final token = VERSION + base64(checksum + content)
  const tokenBytes = concat(checksum, content)
  const b64 = btoa(String.fromCharCode(...tokenBytes))
  return `${VERSION}${b64}`
}

// ── Edge Function handler ────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { channelName, uid, role } = await req.json() as {
      channelName: string
      uid: number
      role?: number
    }

    if (!channelName || uid === undefined) {
      return new Response(
        JSON.stringify({ error: 'channelName and uid are required' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const APP_ID   = Deno.env.get('AGORA_APP_ID')!
    const APP_CERT = Deno.env.get('AGORA_APP_CERTIFICATE')!

    if (!APP_ID || !APP_CERT) {
      return new Response(
        JSON.stringify({ error: 'Agora credentials not configured on server' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    // Token valid for 1 hour
    const expiry = Math.floor(Date.now() / 1000) + 3600
    const token  = await buildTokenWithUid(
      APP_ID,
      APP_CERT,
      channelName,
      uid,
      role ?? Role.PUBLISHER,
      expiry,
    )

    return new Response(
      JSON.stringify({ token, expiry }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
