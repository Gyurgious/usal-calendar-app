import { describe, expect, it } from 'vitest'
import { userSchema, type UserFormValues } from './userSchema'

const valid: UserFormValues = {
  firstName: 'Pat',
  middleName: '',
  lastName: 'Lee',
  loginName: 'plee',
  password: 'Pass123!',
  isApprover: false,
}

/** The first error message for `field`, or undefined if the value is valid. */
function errorFor(mode: 'create' | 'edit', field: keyof UserFormValues, value: unknown) {
  const result = userSchema(mode).safeParse({ ...valid, [field]: value })
  return result.success ? undefined : result.error.issues.find((issue) => issue.path[0] === field)?.message
}

const name25 = 'ABCDEFGHIJKLMNOPQRSTUVWXY'

describe('userSchema', () => {
  it('accepts a valid user', () => {
    expect(userSchema('create').safeParse(valid).success).toBe(true)
  })

  // V3: names
  it.each([
    ['firstName', name25, undefined],
    ['firstName', name25 + 'Z', 'First name must be 25 characters or fewer.'],
    ['firstName', '', 'First name is required.'],
    ['firstName', '   ', 'First name is required.'],
    ['firstName', 'Jos\u00e9', 'First name can only contain printable characters (letters, numbers, punctuation and spaces).'],
    ['middleName', '', undefined],
    ['middleName', name25 + 'Z', 'Middle name must be 25 characters or fewer.'],
    ['lastName', '', 'Last name is required.'],
    ['lastName', name25, undefined],
  ] as const)('%s = "%s"', (field, value, expected) => {
    expect(errorFor('create', field, value)).toBe(expected)
  })

  // V1: login name
  it.each([
    ['abcd', true],
    ['abcdefghijklmnop', true],
    ['abc', false],
    ['abcdefghijklmnopq', false],
    ['p.lee', false],
  ])('login name "%s" valid: %s', (value, ok) => {
    expect(errorFor('create', 'loginName', value) === undefined).toBe(ok)
  })

  // V2: password
  it('requires a password for a new user, but not when editing', () => {
    expect(errorFor('create', 'password', '')).toBe('Password is required.')
    expect(errorFor('edit', 'password', '')).toBeUndefined()
  })

  it('checks the password format in both modes', () => {
    expect(errorFor('create', 'password', 'pass word')).toMatch(/no spaces/)
    expect(errorFor('edit', 'password', 'abc')).toMatch(/4–16/)
    expect(errorFor('edit', 'password', 'NewPass9!')).toBeUndefined()
  })
})