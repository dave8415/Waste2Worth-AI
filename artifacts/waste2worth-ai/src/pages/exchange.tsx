import { useMemo } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Inbox, SearchX } from 'lucide-react';
import { Header, Footer } from '@/components/layout';
import { JourneyNav } from '@/components/journey-nav';
import { StorageNotice } from '@/components/storage-notice';
import { SupplyForm } from '@/components/supply-form';
import { MatchCard } from '@/components/match-card';
import { useBiomass } from '@/lib/biomass-state';
import { DEMO_BUYERS, findMatches, materialLabel, parseSupply } from '@/lib/biomass';

export default function Exchange() {
  const { state } = useBiomass();
  const parsed = useMemo(() => parseSupply(state.supply), [state.supply]);
  const supply = parsed.ok ? parsed.value : null;
  const matches = useMemo(() => (supply ? findMatches(supply) : []), [supply]);

  return (
    <div className="app-shell">
      <Header />
      <main className="page-main">
        <JourneyNav />
        <section className="page-intro">
          <span className="eyebrow"><span className="eyebrow-dot" /> Step 02 · Exchange</span>
          <h1>Describe your supply.<br /><em>See who might need it.</em></h1>
          <p>Matches below come from fictional demo demand, filtered by material, quantity and region. They are indicative only: not confirmed buyers, offers, prices or deals.</p>
        </section>

        <div className="exchange-layout">
          <section className="panel" aria-labelledby="supply-heading">
            <span className="panel-kicker">YOUR MATERIAL</span>
            <h2 id="supply-heading" className="panel-title">Supply details</h2>
            <p className="panel-copy">Saved as you type, in this browser only.</p>
            <SupplyForm onValid={() => document.getElementById('matches')?.scrollIntoView({ behavior: 'smooth' })} />
          </section>

          <section className="panel" id="matches" aria-labelledby="matches-heading" aria-live="polite" data-testid="section-matches">
            <span className="panel-kicker">INDICATIVE MATCHES</span>
            <h2 id="matches-heading" className="panel-title">Demo demand that lists your material</h2>
            {!supply ? (
              <div className="empty-block" data-testid="status-matches-waiting">
                <Inbox size={22} />
                <p>Complete the supply details to see indicative matches. Material mismatches are never shown.</p>
              </div>
            ) : matches.length === 0 ? (
              <div className="empty-block" data-testid="status-no-matches">
                <SearchX size={22} />
                <p>No demo listing accepts <strong>{materialLabel(supply.material)}</strong>. That says nothing about real demand; it only reflects this small sample. You can still explore uses and record impact.</p>
                <Link href="/impact" className="button-secondary" data-testid="link-impact-no-match">Explore uses <ArrowRight size={14} /></Link>
              </div>
            ) : (
              <div className="match-list">
                {matches.map((m) => <MatchCard key={m.buyer.id} match={m} supply={supply} />)}
              </div>
            )}
            {supply && <Link href="/impact" className="button-primary next-step" data-testid="button-go-impact">Continue to impact <ArrowRight size={16} /></Link>}
          </section>
        </div>

        <section className="demo-table-wrap" aria-labelledby="demo-heading" data-testid="section-demo-buyers">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow"><span className="eyebrow-dot" /> Sample demand</span>
              <h2 id="demo-heading">All demo listings</h2>
            </div>
            <p><strong>Fictional demo data.</strong> These are not real companies, orders, specifications or contacts.</p>
          </div>
          <div className="table-scroll">
            <table className="demo-table">
              <thead><tr><th>Listing</th><th>Materials</th><th>Demo area</th><th>Min / demand</th><th>Requirements</th></tr></thead>
              <tbody>
                {DEMO_BUYERS.map((b) => (
                  <tr key={b.id} data-testid={`row-demo-buyer-${b.id}`}>
                    <td><strong>{b.name}</strong><small>{b.industry}</small></td>
                    <td>{b.materials.map(materialLabel).join(', ')}</td>
                    <td>{b.regions.join(', ')}</td>
                    <td className="mono">{b.minimumTonnes} t / {b.demandTonnes} t</td>
                    <td>{b.requirements}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel interests" aria-labelledby="interests-heading" data-testid="section-interests">
          <span className="panel-kicker">LOCAL RECORDS · {state.interests.length}/100</span>
          <h2 id="interests-heading" className="panel-title">Your recorded interest</h2>
          <p className="panel-copy">Kept in this browser only. Nothing was sent to any listing.</p>
          {state.interests.length >= 100 && <div className="status-message" role="alert" data-testid="status-interest-limit">Limit of 100 local records reached. Reset prototype data to add more.</div>}
          {state.interests.length === 0 ? (
            <p className="muted-line" data-testid="status-no-interests">No interest recorded yet.</p>
          ) : (
            <ul className="interest-list">
              {state.interests.map((i) => (
                <li key={i.id} data-testid={`item-interest-${i.id}`}>
                  <div className="interest-meta"><strong>{i.buyerName}</strong><time dateTime={i.createdAt}>{new Date(i.createdAt).toLocaleString()}</time></div>
                  <p>{i.message}</p>
                  <small>{materialLabel(i.supply.material)} · {i.supply.quantityTonnes} t · {i.supply.location}, {i.supply.region}</small>
                </li>
              ))}
            </ul>
          )}
        </section>
        <StorageNotice />
      </main>
      <Footer />
    </div>
  );
}
