import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('API-08/AC-06: Staff/Admin dashboard contract', () => {
  it('registers the staff dashboard route and concise metric names', () => {
    const source = readFileSync(resolve('src/app.ts'), 'utf8')
    expect(source).toContain("'/api/staff/dashboard'")
    expect(source).toContain('unassigned')
    expect(source).toContain('ownedByCurrentUser')
    expect(source).toContain('byStatus')
    expect(source).toContain('byPriority')
    expect(source).toContain('recentlyUpdated')
  })
})
