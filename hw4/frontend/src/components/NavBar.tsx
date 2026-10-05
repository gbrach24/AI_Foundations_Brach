import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useCart } from '../lib/cart'
import { displayName } from '../lib/format'
import { BagIcon, CloseIcon, MenuIcon, Monogram, SearchIcon } from './Icons'

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/products', label: 'Products' },
  { to: '/about', label: 'About Us' },
]

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const close = () => setMenuOpen(false)
  const { user, logout } = useAuth()
  const { count } = useCart()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [scrolled, setScrolled] = useState(false)

  // Condense the header once the page scrolls, so products get more room.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    const q = search.trim()
    close()
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products')
    setSearch('')
  }

  async function handleLogout() {
    close()
    await logout()
    navigate('/')
  }
  const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link active' : 'nav-link')

  return (
    <header className={scrolled ? 'site-header scrolled' : 'site-header'}>
      <div className="announcement">
        <span>
          Visit the shop at 57 Broadway, New Haven<span className="hide-sm"> · Bulldog pride, shipped anywhere</span>
        </span>
      </div>
      <nav className="navbar" aria-label="Main">
        <Link to="/" className="brand" onClick={close} aria-label="Campus Customs home">
          <Monogram size={42} className="brand-mark" />
          <span className="brand-text">
            Campus Customs
            <small>Yale Outfitters · New Haven</small>
          </span>
        </Link>

        <button
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="nav-links"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">Toggle menu</span>
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        <div id="nav-links" className={menuOpen ? 'nav-links open' : 'nav-links'}>
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={linkClass} onClick={close}>
              {link.label}
            </NavLink>
          ))}
          <span className="nav-divider" aria-hidden="true" />
          {user ? (
            <>
              <span className="nav-user" title={user.email}>
                <span className="nav-avatar" aria-hidden="true">
                  {displayName(user).charAt(0).toUpperCase()}
                </span>
                Hi, {displayName(user)}
              </span>
              <button className="nav-link nav-logout" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={linkClass} onClick={close}>
                Log in
              </NavLink>
              <NavLink
                to="/create-account"
                className={({ isActive }) => (isActive ? 'nav-cta active' : 'nav-cta')}
                onClick={close}
              >
                Create account
              </NavLink>
            </>
          )}
        </div>

        <form className="nav-search" role="search" onSubmit={submitSearch}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products"
            aria-label="Search products"
          />
          <button type="submit" aria-label="Search">
            <SearchIcon />
          </button>
        </form>

        <Link to="/cart" className="nav-bag" aria-label={`Bag, ${count} item${count === 1 ? '' : 's'}`} onClick={close}>
          <BagIcon width={21} height={21} />
          {/* Keyed by count so the badge replays its bump animation when items are added. */}
          {count > 0 && (
            <span key={count} className="bag-count">
              {count}
            </span>
          )}
        </Link>

      </nav>
    </header>
  )
}
