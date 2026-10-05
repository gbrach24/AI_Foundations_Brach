import type { ProductSummary } from '../lib/api'
import ProductCard from './ProductCard'

export default function ProductGrid({ products }: { products: ProductSummary[] }) {
  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.product_id} product={product} />
      ))}
    </div>
  )
}
