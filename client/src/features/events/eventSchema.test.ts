import { describe, expect, it } from 'vitest'
import { eventSchema } from './eventSchema'

const valid = { title: 'Bake Sale', location: 'Cafeteria', description: 'Fundraiser', date: '2026-12-01', time: '15:30' }
const errorFor = (overrides: Partial<typeof valid>) => {
  const result = eventSchema.safeParse({ ...valid, ...overrides })
  return result.success ? null : result.error.issues[0].message
}

describe('eventSchema', () => {
  it('accepts a valid event, and optional fields left empty', () => {
    expect(errorFor({})).toBeNull()
    expect(errorFor({ location: '', description: '' })).toBeNull()
  })

  it('accepts exactly the maximum lengths', () => {
    expect(errorFor({ title: 'T'.repeat(25), location: 'L'.repeat(50), description: 'D'.repeat(255) })).toBeNull()
  })

  it('trims spaces before checking (V5: title required)', () => {
    expect(errorFor({ title: '   ' })).toBe('Title is required.')
    expect(eventSchema.parse({ ...valid, title: '  Bake Sale  ' }).title).toBe('Bake Sale')
  })

  it.each([
    [{ title: 'T'.repeat(26) }, 'Title must be 25 characters or fewer.'],
    [{ location: 'L'.repeat(51) }, 'Location must be 50 characters or fewer.'],
    [{ description: 'D'.repeat(256) }, 'Description must be 255 characters or fewer.'],
    [{ date: '' }, 'Date is required.'],
    [{ time: '' }, 'Time is required.'],
  ])('rejects %j', (overrides, message) => {
    expect(errorFor(overrides)).toBe(message)
  })

  it.each([{ title: 'Café Night' }, { description: 'Line 1\nLine 2' }, { location: 'Room\t101' }])(
    'rejects non-printable characters: %j',
    (overrides) => {
      expect(errorFor(overrides)).toMatch(/can only contain printable characters/)
    },
  )
})