import { z } from 'zod'
import { LIMITS, PRINTABLE_REGEX } from '../../shared/validation/patterns'

const printableMessage = (label: string) =>
  `${label} can only contain printable characters (letters, numbers, punctuation and spaces; no line breaks).`

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .regex(PRINTABLE_REGEX, printableMessage(label))

// Same rules as CreateEventRequest on the server (V4 location, V5 title, V6 description).
export const eventSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(LIMITS.title, `Title must be ${LIMITS.title} characters or fewer.`)
    .regex(PRINTABLE_REGEX, printableMessage('Title')),
  location: optionalText('Location', LIMITS.location),
  description: optionalText('Description', LIMITS.description),
  date: z.string().min(1, 'Date is required.'), 
  time: z.string().min(1, 'Time is required.'), 
})

export const eventFormSchema = (today: string, currentDate?: string) =>
  eventSchema.refine((values) => values.date === '' || values.date >= today || values.date === currentDate, {
    path: ['date'],
    message: 'Pick today or a later date.',
  })

export type EventFormValues = z.infer<typeof eventSchema>