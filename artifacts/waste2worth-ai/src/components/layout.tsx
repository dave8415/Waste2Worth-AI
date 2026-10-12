import { Link, useLocation } from 'wouter';
import { BarChart3, Camera, Home, Store, Sprout, UserRound } from 'lucide-react';

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Waste2Worth AI home" data-testid="link-home-brand">
      <span className="brand-mark"><Sprout size={21} strokeWidth={1.7} /></span>
      <span className="brand-name">Waste<span>2</span>Worth</span>
    </Link>
  );
}

const NAV = [
  { href: '/', label: 'Home', icon: Home, alias: [] as string[] },
  { href: '/market', label: 'Market', icon: Store, alias: ['/exchange'] },
  { href: '/scan', label: 'Scan', icon: Camera, alias: ['/analyze'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, alias: ['/impact', '/reports/legacy'] },
  { href: '/profile', label: 'Profile', icon: UserRound, alias: [] as string[] },
];

function isActive(location: string, item: typeof NAV[number]) {
  return location === item.href || item.alias.includes(location);
}

export function Header() {
  const [location] = useLocation();
  return (
    <>
      <header className="site-header" data-testid="site-header">
        <Brand />
        <nav className="nav-links" aria-label="Main navigation">
          {NAV.filter(n => n.href !== '/scan').map(n => (
            <Link key={n.href} href={n.href} className={`nav-link ${isActive(location, n) ? 'active' : ''}`} aria-current={isActive(location, n) ? 'page' : undefined} data-testid={`link-nav-${n.label.toLowerCase()}`}>{n.label}</Link>
          ))}
          <Link href="/scan" className="nav-cta" aria-current={isActive(location, NAV[2]) ? 'page' : undefined} data-testid="link-nav-scan">
            <Camera size={15} /> Scan material
          </Link>
        </nav>
      </header>
      <nav className="mobile-nav" aria-label="Mobile navigation" data-testid="nav-mobile">
        {NAV.map(n => {
          const Icon = n.icon; const active = isActive(location, n);
          return (
            <Link key={n.href} href={n.href} className={`mobile-nav-item ${n.href === '/scan' ? 'scan' : ''} ${active ? 'active' : ''}`} aria-label={n.label} aria-current={active ? 'page' : undefined} data-testid={`link-mobile-${n.label.toLowerCase()}`}>
              <span className="mobile-nav-icon"><Icon size={n.href === '/scan' ? 22 : 19} /></span>
              <span className="mobile-nav-label">{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function Footer() {
  return (
    <footer className="site-footer" data-testid="site-footer">
      <Brand />
      <span>One batch, kept together from photo to report.</span>
      <span>Photo guidance, not a laboratory result. Demo buyers are fictional. Records stay in this browser.</span>
    </footer>
  );
}
