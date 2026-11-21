// Runs before every test file (configured in vite.config.ts).
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup() // unmount whatever the test rendered
  localStorage.clear() // no token leaks between tests
})
