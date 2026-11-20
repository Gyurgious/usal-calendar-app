import { z } from 'zod'
import { LOGIN_NAME_REGEX, PASSWORD_REGEX } from '../../shared/validation/patterns'


// define the structure of data and enforce validation rules
export const loginSchema = z.object({
  logonName: z
    .string()
    .trim()
    .min(1, 'Login name is required.')
    .regex(LOGIN_NAME_REGEX, 'Login name must be 4–16 letters or numbers.'),
  password: z
    .string()
    .min(1, 'Password is required.')
    .regex(PASSWORD_REGEX, 'Password must be 4–16 letters, numbers or punctuation.'),
})

export type LoginFormValues = z.infer<typeof loginSchema>
