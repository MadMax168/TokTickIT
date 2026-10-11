import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('API-07/API-09/AC-02: Requester dashboard contract', () => {
  it('registers the requester dashboard route and contract metrics', () => {
    const source = readFileSync(resolve('src/app.ts'), 'utf8')
    expect(source).toContain("'/api/requester/dashboard'")
    expect(source).toContain('totalOpen')
    expect(source).toContain('waitingForRequester')
    expect(source).toContain('recentlyUpdated')
    expect(source).toContain('recentlyResolved')
  })
})
