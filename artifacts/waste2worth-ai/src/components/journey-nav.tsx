import { Link, useLocation } from 'wouter';
import { Check } from 'lucide-react';
import { useBiomass } from '@/lib/biomass-state';
import { parseSupply } from '@/lib/biomass';

const STEPS = [
  { href: '/analyze', n: '01', label: 'Identify', sub: 'Photo or manual' },
  { href: '/exchange', n: '02', label: 'Exchange', sub: 'Supply and demo demand' },
  { href: '/impact', n: '03', label: 'Impact', sub: 'Unverified summary' },
];

export function JourneyNav() {
  const [location] = useLocation();
  const { state } = useBiomass();
  const done = [
    !!state.supply.material,
    parseSupply(state.supply).ok,
    !!state.reportCreatedAt,
  ];
  return (
    <nav className="journey" aria-label="Journey steps" data-testid="nav-journey">
      <ol>
        {STEPS.map((s, i) => {
          const active = location === s.href;
          return (
            <li key={s.href}>
              <Link href={s.href} className={`journey-step ${active ? 'active' : ''} ${done[i] ? 'done' : ''}`} aria-current={active ? 'step' : undefined} data-testid={`link-journey-${s.label.toLowerCase()}`}>
                <span className="journey-num">{done[i] && !active ? <Check size={12} /> : s.n}</span>
                <span className="journey-text"><strong>{s.label}</strong><small>{s.sub}</small></span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
