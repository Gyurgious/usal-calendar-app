// Runs before every test file (configured in vite.config.ts).
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

const TEST_TODAY = new Date('2026-11-01T12:00:00')

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(TEST_TODAY)
})

afterEach(() => {
  cleanup() // unmount whatever the test rendered
  localStorage.clear() // no token leaks between tests
  vi.useRealTimers()
})