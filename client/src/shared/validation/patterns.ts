// Keeping these validations in sync with server/UsalCalendar.Core/Rules/ValidationRules.cs
export const LOGIN_NAME = /^[A-Za-z0-9]{4,16}$/
export const PASSWORD = /^[\x21-\x7E]{4,16}$/
export const PRINTABLE = /^[\x20-\x7E]*$/

export const LIMITS = {
  name: 25,
  location: 50,
  title: 25,
  description: 255,
  maxApprovedEventsPerDay: 10,
} as const