/** "Smith, John Michael" → "JS" (first name, then last name), for avatars. */
export function initialsOf(displayName: string): string {
  const [last = '', rest = ''] = displayName.split(',').map((part) => part.trim())
  return `${rest.charAt(0)}${last.charAt(0)}`.toUpperCase()
}
