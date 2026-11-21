/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The style tests read the colour tokens and motion rules from the real stylesheet; vitest stubs CSS otherwise.
  test: { css: { include: [/index\.css/] } },
})
