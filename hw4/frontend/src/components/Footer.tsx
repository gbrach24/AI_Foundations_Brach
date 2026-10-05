import { Link } from 'react-router-dom'
import { openChat } from '../lib/chatBus'
import { Monogram } from './Icons'

const YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="cheetah-band" aria-hidden="true" />
      <div className="footer-inner">
        <div className="footer-about">
          <Monogram size={52} />
          <p className="footer-brand">Campus Customs</p>
          <p className="muted-light">Yale apparel for students, alumni, families, and fans. Made in the spirit of New Haven.</p>
        </div>
        <div>
          <p className="footer-heading">Shop</p>
          <Link to="/products">All products</Link>
          <Link to="/products?category=Hoodies">Hoodies</Link>
          <Link to="/products?category=Crewnecks">Crewnecks</Link>
          <Link to="/products?collection=residential-colleges">Residential colleges</Link>
        </div>
        <div>
          <p className="footer-heading">Help</p>
          <button className="footer-link" onClick={() => openChat()}>
            Ask the shop assistant
          </button>
          <Link to="/cart">Your bag</Link>
          <Link to="/login">Log in</Link>
          <Link to="/create-account">Create account</Link>
        </div>
        <div>
          <p className="footer-heading">Visit</p>
          <p className="muted-light">
            57 Broadway
            <br />
            New Haven, CT 06511
          </p>
          <Link to="/about">About us</Link>
        </div>
      </div>
      <p className="footer-wordmark" aria-hidden="true">
        Campus Customs
      </p>
      <p className="footer-fine">© {YEAR} Campus Customs · Course project storefront</p>
    </footer>
  )
}
