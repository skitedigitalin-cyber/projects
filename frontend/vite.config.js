import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Plugin to ensure .htaccess is always created in dist/ for Apache SPA routing
const htaccessPlugin = () => ({
  name: 'generate-htaccess',
  closeBundle() {
    const htaccessContent = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
`
    const distDir = path.resolve(__dirname, 'dist')
    if (fs.existsSync(distDir)) {
      fs.writeFileSync(path.join(distDir, '.htaccess'), htaccessContent, 'utf-8')
      console.log('✓ Successfully generated .htaccess in dist/')
    }
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    htaccessPlugin(),
  ],
})
