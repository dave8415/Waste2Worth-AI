import { Link, useLocation } from 'wouter';
import { ArrowRight, Check } from 'lucide-react';
import { useJourney } from '@/lib/journey-state';

export function JourneyNav() {
  const [location] = useLocation();
  const { active } = useJourney();
  const scanned = !!active; const offered = !!active?.offer; const reported = !!active?.report;
  const onScan = location === '/scan' || location === '/analyze';
  const steps = [
    { key: 'scan', href: '/scan', n: '01', label: 'Scan', sub: 'Photo or manual', done: scanned, current: onScan && !scanned },
    { key: 'offer', href: '/scan', n: '02', label: 'Offer', sub: 'Quantity, price, place', done: offered, current: onScan && scanned && !offered },
    { key: 'market', href: '/market', n: '03', label: 'Market', sub: 'Demo matches', done: offered && reported, current: location === '/market' || location === '/exchange' },
    { key: 'reports', href: '/reports', n: '04', label: 'Reports', sub: 'Unverified summary', done: reported, current: location.startsWith('/reports') || location === '/impact' },
  ];
  const next = !scanned ? { href: '/scan', label: 'Scan a material' }
    : !offered ? { href: '/scan', label: 'Offer this material' }
    : !reported ? { href: '/market', label: 'See demo matches' }
    : { href: '/reports', label: 'Open report' };
  const showNext = !(next.href === '/scan' && onScan) && !(next.href === '/market' && steps[2].current) && !(next.href === '/reports' && steps[3].current);
  return (
    <nav className="journey" aria-label="Journey steps" data-testid="nav-journey">
      <ol>
        {steps.map(s => (
          <li key={s.key}>
            <Link href={s.href} className={`journey-step ${s.current ? 'active' : ''} ${s.done ? 'done' : ''}`} aria-current={s.current ? 'step' : undefined} data-testid={`link-journey-${s.key}`}>
              <span className="journey-num">{s.done && !s.current ? <Check size={12} /> : s.n}</span>
              <span className="journey-text"><strong>{s.label}</strong><small>{s.sub}</small></span>
            </Link>
          </li>
        ))}
      </ol>
      {showNext && <Link href={next.href} className="journey-next" data-testid="link-journey-next">Next: {next.label} <ArrowRight size={14} /></Link>}
    </nav>
  );
}
