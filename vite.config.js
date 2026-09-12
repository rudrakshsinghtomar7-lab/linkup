import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Deployed at https://rudrakshsinghtomar7-lab.github.io/linkup/
export default defineConfig({
  base: '/linkup/',
  plugins: [react()],
})
