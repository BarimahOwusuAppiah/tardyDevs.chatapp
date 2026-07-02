/**
 * Agora RTC Token Builder — runs entirely in the browser.
 * Uses VITE_AGORA_APP_ID + VITE_AGORA_APP_CERTIFICATE from .env
 *
 * This is acceptable for development / small projects.
 * For production, move this to a server so the App Certificate stays secret.
 */

// ── HMAC-SHA256 via Web Crypto API ──────────────────────────────────────────
async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, data))
}

// ── CRC32 ────────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
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
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

// ── Pack helpers ─────────────────────────────────────────────────────────────
const enc = new TextEncoder()

function u16(v: number): Uint8Array {
  return new Uint8Array([v & 0xff, (v >> 8) & 0xff])
}
function u32(v: number): Uint8Array {
  return new Uint8Array([v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff])
}
function packStr(s: string): Uint8Array {
  const b = enc.encode(s)
  return cat(u16(b.length), b)
}
function packMap(m: Map<number, number>): Uint8Array {
  const entries = [...m.entries()].sort((a, b) => a[0] - b[0])
  const parts: Uint8Array[] = [u16(entries.length)]
  for (const [k, v] of entries) { parts.push(u16(k)); parts.push(u32(v)) }
  return cat(...parts)
}
function cat(...arrays: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(arrays.reduce((s, a) => s + a.length, 0))
  let off = 0
  for (const a of arrays) { out.set(a, off); off += a.length }
  return out
}

// ── Public builder ───────────────────────────────────────────────────────────
export async function buildAgoraToken(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: number,
  /** seconds from now — default 1 hour */
  expiresInSeconds = 3600,
): Promise<string> {
  const VERSION  = '006'
  const salt     = (Math.random() * 0xffffffff | 0) >>> 0 || 1
  const ts       = Math.floor(Date.now() / 1000)
  const expiry   = ts + expiresInSeconds
  const uidStr   = uid === 0 ? '' : String(uid)

  // Privilege map — publisher gets all privileges
  const privileges = new Map<number, number>([
    [1, expiry], // join channel
    [2, expiry], // publish audio
    [3, expiry], // publish video
    [4, expiry], // publish data stream
  ])

  const message = cat(u32(salt), u32(ts), packMap(privileges))

  // Signing string
  const toSign = cat(enc.encode(appId), enc.encode(channelName), enc.encode(uidStr), message)
  const sig    = await hmacSha256(enc.encode(appCertificate), toSign)

  // Content blob
  const content = cat(
    packStr(String.fromCharCode(...sig)),
    packStr(appId),
    packStr(channelName),
    packStr(uidStr),
    message,
  )

  // Checksum
  const checksum = cat(
    u32(crc32(enc.encode(channelName))),
    u32(crc32(enc.encode(uidStr))),
  )

  return VERSION + btoa(String.fromCharCode(...cat(checksum, content)))
}
