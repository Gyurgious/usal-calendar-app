import { z } from 'zod'
import { LIMITS, LOGIN_NAME_REGEX, PASSWORD_REGEX, PRINTABLE_REGEX } from '../../shared/validation/patterns'

const printableMessage = (label: string) =>
  `${label} can only contain printable characters (letters, numbers, punctuation and spaces).`

/** V3: printable, up to 25 characters. `required` for first and last name; middle name may be blank. */
const name = (label: string, required: boolean) =>
  z
    .string()
    .trim()
    .min(required ? 1 : 0, `${label} is required.`)
    .max(LIMITS.name, `${label} must be ${LIMITS.name} characters or fewer.`)
    .regex(PRINTABLE_REGEX, printableMessage(label))

const passwordMessage = 'Password must be 4–16 letters, numbers or punctuation (no spaces).'

/**
 * Same rules as UserRequest on the server (V1 login name, V2 password, V3 names).
 * New user: password required. Edit: leave it blank to keep the current password.
 */
export function userSchema(mode: 'create' | 'edit') {
  return z.object({
    firstName: name('First name', true),
    middleName: name('Middle name', false),
    lastName: name('Last name', true),
    loginName: z
      .string()
      .trim()
      .min(1, 'Login name is required.')
      .regex(LOGIN_NAME_REGEX, 'Login name must be 4–16 letters or numbers.'),
    password:
      mode === 'create'
        ? z.string().min(1, 'Password is required.').regex(PASSWORD_REGEX, passwordMessage)
        : z.string().refine((value) => value === '' || PASSWORD_REGEX.test(value), passwordMessage),
    isApprover: z.boolean(),
  })
}

export type UserFormValues = z.infer<ReturnType<typeof userSchema>>