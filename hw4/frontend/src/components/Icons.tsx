// Small inline SVG icons (stroke = currentColor) so they inherit text color and scale crisply.
import type { SVGProps } from 'react'

const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
})

export const SearchIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
)
export const BagIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></svg>
)
export const MenuIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
)
export const CloseIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>
)
export const SendIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 12 20 4l-6 16-2.5-6.5z" /><path d="m11.5 13.5 3-3" /></svg>
)
export const ArrowIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)
export const ChatIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 18.5V6.8A1.8 1.8 0 0 1 6.8 5h10.4A1.8 1.8 0 0 1 19 6.8v7.4a1.8 1.8 0 0 1-1.8 1.8H9z" /><path d="M9 9.5h6M9 12.5h4" /></svg>
)
export const PinIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 21s-6-5.4-6-10.5a6 6 0 0 1 12 0C18 15.6 12 21 12 21z" /><circle cx="12" cy="10.5" r="2" /></svg>
)

/** The Campus Customs shield monogram. */
export function Monogram({ size = 44, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={`monogram ${className}`} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 2 43 8v14c0 12.4-8 20.6-19 24C13 42.6 5 34.4 5 22V8z" fill="var(--navy-900)" />
      <path d="M24 5.2 40 10.3v11.6c0 10.5-6.6 17.6-16 20.8-9.4-3.2-16-10.3-16-20.8V10.3z" fill="none" stroke="var(--cheetah)" strokeWidth="1.6" />
      <text x="24" y="30" textAnchor="middle" fontFamily="Graduate, Georgia, serif" fontSize="15" fill="#fff" letterSpacing="0.5">
        CC
      </text>
    </svg>
  )
}
