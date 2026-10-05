import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// Self-hosted brand fonts (bundled by Vite, so they load without a third-party CDN).
import '@fontsource-variable/fraunces/opsz.css'
import '@fontsource-variable/fraunces/opsz-italic.css'
import '@fontsource-variable/instrument-sans/index.css'
import '@fontsource/graduate/400.css'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './lib/auth'
import { CartProvider } from './lib/cart'
import { PageContextProvider } from './lib/pageContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PageContextProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </PageContextProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
