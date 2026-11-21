import { describe, expect, it } from 'vitest'
import { loginSchema } from './loginSchema'

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    expect(loginSchema.safeParse({ logonName: 'jsmith', password: 'Pass123!' }).success).toBe(true)
  })

  it('trims spaces around the logon name', () => {
    const result = loginSchema.safeParse({ logonName: '  jsmith  ', password: 'Pass123!' })
    expect(result.success && result.data.logonName).toBe('jsmith')
  })

  it.each([
    ['', 'empty'],
    ['abc', 'too short'],
    ['abcdefghijklmnopq', 'too long (17)'],
    ['j.smith', 'punctuation'],
  ])('rejects logon name %j (%s)', (logonName) => {
    expect(loginSchema.safeParse({ logonName, password: 'Pass123!' }).success).toBe(false)
  })

  it.each([
    ['', 'empty'],
    ['abc', 'too short'],
    ['pass word', 'contains a space'],
  ])('rejects password %j (%s)', (password) => {
    expect(loginSchema.safeParse({ logonName: 'jsmith', password }).success).toBe(false)
  })
})
