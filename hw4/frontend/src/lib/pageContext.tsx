import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import type { ChatPageContext, PageType } from './api'

interface CurrentProduct {
  product_id: string
  product_name: string
}

interface PageContextValue {
  product: CurrentProduct | null
  setProduct: (product: CurrentProduct | null) => void
}

const Ctx = createContext<PageContextValue | null>(null)

/** Lets pages (e.g. ProductPage) tell the chat widget which product is on screen. */
export function PageContextProvider({ children }: { children: ReactNode }) {
  const [product, setProduct] = useState<CurrentProduct | null>(null)
  const value = useMemo(() => ({ product, setProduct }), [product])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

function useCtx(): PageContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('Page context hooks must be used inside <PageContextProvider>')
  return ctx
}

/** Called by ProductPage once its product has loaded; cleared when the page unmounts. */
// eslint-disable-next-line react-refresh/only-export-components
export function useRegisterCurrentProduct(product: CurrentProduct | null) {
  const { setProduct } = useCtx()
  const id = product?.product_id
  const name = product?.product_name
  useEffect(() => {
    if (!id || !name) return
    setProduct({ product_id: id, product_name: name })
    return () => setProduct(null)
  }, [id, name, setProduct])
}

function pageTypeFor(pathname: string): PageType {
  if (pathname === '/') return 'home'
  if (pathname === '/products') return 'products'
  if (pathname.startsWith('/products/')) return 'product'
  if (pathname === '/about') return 'about'
  if (pathname === '/login') return 'login'
  if (pathname === '/create-account') return 'create_account'
  return 'other'
}

/** The structured page context sent with each chat message. */
// eslint-disable-next-line react-refresh/only-export-components
export function useChatPageContext(): ChatPageContext {
  const { product } = useCtx()
  const { pathname, search } = useLocation()
  const pageType = pageTypeFor(pathname)
  // Only attach the product when it belongs to the URL being shown (guards against stale state).
  const onThisProduct = pageType === 'product' && product && pathname === `/products/${product.product_id}`
  return {
    page_type: pageType,
    path: pathname + search,
    ...(onThisProduct ? { product_id: product.product_id, product_name: product.product_name } : {}),
  }
}
