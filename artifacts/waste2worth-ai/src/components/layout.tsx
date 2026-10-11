import { Link, useLocation } from 'wouter';
import { Camera, Sprout } from 'lucide-react';

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Waste2Worth AI home" data-testid="link-home-brand">
      <span className="brand-mark"><Sprout size={21} strokeWidth={1.7} /></span>
      <span className="brand-name">Waste<span>2</span>Worth</span>
    </Link>
  );
}

export function Header() {
  const [location] = useLocation();
  const link = (href: string, label: string, id: string) => (
    <Link href={href} className={`nav-link ${location === href ? 'active' : ''}`} data-testid={id}>{label}</Link>
  );
  return (
    <header className="site-header" data-testid="site-header">
      <Brand />
      <nav className="nav-links" aria-label="Main navigation">
        {link('/', 'How it works', 'link-home')}
        {link('/exchange', 'Exchange', 'link-exchange')}
        {link('/impact', 'Impact', 'link-impact')}
        <Link href="/analyze" className="nav-cta" data-testid="link-analyze">
          <Camera size={15} /> Identify a material
        </Link>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer" data-testid="site-footer">
      <Brand />
      <span>Practical ideas for the materials already growing around us.</span>
      <span>Photo guidance, not a laboratory result. Demo data only.</span>
    </footer>
  );
}
