import { readFileSync } from 'fs'
import { resolve } from 'path'
import { request } from 'undici'

const SCHEMA_FILE = resolve('supabase', 'schema.sql')
const PROJECT_REF = 'aklxvxvblziftcwtiria'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrbHh2eHZibHppZnRjd3RpcmlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTEzNjM1MywiZXhwIjoyMDk0NzEyMzUzfQ.tiZljxSpuCqlYVFKlZe0IvwDVrVGFfENtdOzghmM7Xk'

function exec(sql) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`
  return request(url, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
}

/** Split SQL into individual statements, honouring dollar-quoting. */
function splitStatements(sql) {
  const stmts = []
  let cur = ''
  let i = 0
  while (i < sql.length) {
    // Dollar-quote open
    if (sql[i] === '$') {
      let j = i + 1
      while (j < sql.length && /[\w]/.test(sql[j])) j++
      const tag = sql.slice(i + 1, j)
      if (j < sql.length && sql[j] === '$') {
        cur += sql.slice(i, j + 1)   // $ + tag + $
        i = j + 1
        const endTag = tag === '' ? '$$' : `$$${tag}$`
        let found = false
        while (i < sql.length) {
          if (sql[i] === '$') {
            let k = i + 1
            while (k < sql.length && /[\w]/.test(sql[k])) k++
            const candidate = sql.slice(i, k + 1)
            if (candidate === endTag) {
              cur += candidate
              i = k + 1
              found = true
              break
            }
          }
          cur += sql[i]
          i++
        }
        if (!found) {
          cur += sql[i] ?? ''
          i++
        }
        continue
      }
    }

    // Line comment
    if (sql[i] === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++
      continue
    }

    // Statement terminator
    if (sql[i] === ';') {
      const part = cur.trim()
      if (part) stmts.push(part)
      cur = ''
      i++
      while (i < sql.length && /\s/.test(sql[i])) i++
      continue
    }

    cur += sql[i]
    i++
  }
  const tail = cur.trim()
  if (tail) stmts.push(tail)
  return stmts
}

async function main() {
  let raw = readFileSync(SCHEMA_FILE, 'utf8')
  raw = raw.replace(/\/\*[\s\S]*?\*\//g, '')
  const statements = splitStatements(raw).filter(
    s => s.length > 0 && !/^\s*--/.test(s) && !/^\s*$/.test(s)
  )
  console.log(`Found ${statements.length} SQL statements to apply…\n`)

  for (let i = 0; i < statements.length; i++) {
    const preview = statements[i].replace(/\s+/g, ' ').split('\n')[0].slice(0, 70)
    try {
      const res = await exec(statements[i])
      let body
      try { body = await res.body.json() } catch { body = { message: 'no JSON body' } }
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`[${String(i + 1).padStart(3)}] ✓`, preview)
      } else if (res.statusCode === 409 || (body.message ?? '').includes('already exists')) {
        console.log(`[${String(i + 1).padStart(3)}] –`, preview, '(already exists)')
      } else {
        console.log(`[${String(i + 1).padStart(3)}] ✗`, preview)
        console.log('      Error:', JSON.stringify(body).slice(0, 250))
      }
    } catch (e) {
      console.log(`[${String(i + 1).padStart(3)}] ✗`, preview, `→`, e.message)
    }
  }
  console.log('\nDone.')
}

main()
