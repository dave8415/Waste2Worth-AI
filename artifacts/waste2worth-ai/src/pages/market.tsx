import { useMemo } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Camera, Inbox } from 'lucide-react';
import { Header, Footer } from '@/components/layout';
import { JourneyNav } from '@/components/journey-nav';
import { StorageNotice } from '@/components/storage-notice';
import { TransactionCard } from '@/components/transaction-card';
import { OfferRecord, offerStatus } from '@/components/offer-record';
import { useJourney } from '@/lib/journey-state';
import { useTransactions } from '@/lib/transaction-state';
import { relatedTransactions } from '@/lib/journey';
import { DEMO_BUYERS, materialLabel } from '@/lib/biomass';

export default function Market() {
  const { state, active, selectRecord } = useJourney();
  const { state: tx } = useTransactions();
  const offered = useMemo(() => state.records.filter(r => r.offer), [state.records]);
  const pending = useMemo(() => state.records.filter(r => !r.offer), [state.records]);
  const current = active?.offer ? active : offered[0];
  const legacy = useMemo(() => tx.transactions.filter(t => !t.offerId || !state.records.some(r => r.id === t.offerId)), [tx.transactions, state.records]);
  return (
    <div className="app-shell">
      <Header />
      <main className="page-main">
        <JourneyNav />
        <section className="page-intro">
          <span className="eyebrow"><span className="eyebrow-dot" /> Market · FICTIONAL DEMO</span>
          <h1>Your offered batches.<br /><em>Who might want them.</em></h1>
          <p>Each offer keeps its original scan. Matches are fictional sample listings — submitting or expressing interest never contacts a real buyer. Everything is stored in this browser only.</p>
        </section>

        {offered.length === 0 ? (
          <section className="panel empty-block tall" data-testid="status-no-offers">
            <Inbox size={24} />
            <p><strong>No offers yet.</strong><br />Scan a material, then tap “Offer this material”. It will appear here with demo matches.</p>
            {pending.length > 0 && <Link href="/scan" className="button-secondary" onClick={() => selectRecord(pending[0].id)} data-testid="link-resume-scan">Finish offer for {pending[0].scan.wasteType}</Link>}
            <Link href="/scan" className="button-primary" data-testid="link-market-scan"><Camera size={15} /> Scan a material</Link>
          </section>
        ) : (
          <>
            {offered.length > 1 && (
              <div className="record-tabs" role="tablist" aria-label="Offered batches" data-testid="tabs-offers">
                {offered.map(r => (
                  <button key={r.id} role="tab" aria-selected={current?.id === r.id} className={current?.id === r.id ? 'on' : ''} onClick={() => selectRecord(r.id)} data-testid={`tab-offer-${r.id}`}>
                    <strong>{r.scan.wasteType}</strong><small>{r.offer!.supply.quantityTonnes} t · {offerStatus(r, relatedTransactions(r, tx.transactions))}</small>
                  </button>
                ))}
              </div>
            )}
            {current && <OfferRecord key={current.id} record={current} />}
          </>
        )}

        <section className="demo-table-wrap" aria-labelledby="demo-heading" data-testid="section-demo-buyers">
          <div className="section-heading compact">
            <div><span className="eyebrow"><span className="eyebrow-dot" /> Sample demand</span><h2 id="demo-heading">All FICTIONAL DEMO listings</h2></div>
            <p><strong>Fictional demo data.</strong> Not real companies, orders, specifications or contacts.</p>
          </div>
          <div className="table-scroll">
            <table className="demo-table">
              <thead><tr><th>Listing</th><th>Materials</th><th>Demo area</th><th>Min / demand</th><th>Requirements</th></tr></thead>
              <tbody>{DEMO_BUYERS.map(b => (
                <tr key={b.id} data-testid={`row-demo-buyer-${b.id}`}>
                  <td><strong>{b.name}</strong><small>FICTIONAL DEMO</small><small>{b.industry}</small></td>
                  <td>{b.materials.map(materialLabel).join(', ')}</td><td>{b.regions.join(', ')}</td>
                  <td className="mono">{b.minimumTonnes} t / {b.demandTonnes} t</td><td>{b.requirements}</td>
                </tr>))}</tbody>
            </table>
          </div>
        </section>

        {legacy.length > 0 && (
          <details className="panel fold legacy" data-testid="section-previous-records">
            <summary data-testid="toggle-previous-records">Previous records ({legacy.length}) — created before connected offers <ArrowRight size={14} /></summary>
            <p className="panel-copy">These demo transactions were made with the older supply form. They are not linked to any scan and are shown as-is.</p>
            <div className="tx-list">{legacy.map(t => <TransactionCard key={t.id} tx={t} />)}</div>
          </details>
        )}
        <StorageNotice />
      </main>
      <Footer />
    </div>
  );
}
