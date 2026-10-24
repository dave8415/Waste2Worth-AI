import { useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowRight, Camera, Factory, MapPin, Package } from 'lucide-react';
import { Header, Footer } from '@/components/layout';
import { JourneyNav } from '@/components/journey-nav';
import { StorageNotice } from '@/components/storage-notice';
import { useJourney } from '@/lib/journey-state';
import { useTransactions } from '@/lib/transaction-state';
import { TransactionCard } from '@/components/transaction-card';
import { qualityLines } from '@/lib/material-quality';
import { MaterialQualityPanel } from '@/components/material-quality-panel';

const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Market() {
  const { state, active, selectRecord } = useJourney();
  const { state: txState, startLocalTracking } = useTransactions();
  const [trackingError, setTrackingError] = useState('');
  const [, navigate] = useLocation();
  const detail = state.records.find(r => r.id === active?.id && r.offer) ?? state.records.find(r => r.offer);
  const offered = useMemo(() => state.records.filter(r => r.offer), [state.records]);
  const pending = useMemo(() => state.records.filter(r => !r.offer), [state.records]);
  function toReport(id: string) { selectRecord(id); navigate('/reports'); }
  return (
    <div className="app-shell">
      <Header />
      <main className="page-main">
        <JourneyNav />
        <section className="page-intro">
          <span className="eyebrow"><span className="eyebrow-dot" /> Market</span>
          <h1>Your offered batches.<br /><em>Ready when industry is.</em></h1>
        </section>

        <section className="panel empty-demand" data-testid="status-no-demand" aria-labelledby="demand-heading">
          <Factory size={22} />
          <div>
            <h2 id="demand-heading">Belum ada permintaan dari industri</h2>
            <p>Buyer requests will appear here when industry buyers join. Your offers stay ready in the meantime.</p>
          </div>
        </section>

        <div className="section-heading compact"><div><span className="eyebrow"><span className="eyebrow-dot" /> My offers</span><h2>Offered batches</h2></div></div>
        {offered.length === 0 ? (
          <section className="panel empty-block" data-testid="status-no-offers">
            <Package size={24} />
            <p><strong>No offers yet.</strong><br />Scan a material and submit an offer. It will appear here.</p>
            {pending.length > 0 && <Link href="/scan" className="button-secondary" onClick={() => selectRecord(pending[0].id)} data-testid="link-resume-scan">Finish offer for {pending[0].scan.wasteType}</Link>}
            <Link href="/scan" className="button-primary" data-testid="link-market-scan"><Camera size={15} /> Scan a material</Link>
          </section>
        ) : (
          <ul className="offer-list" data-testid="list-offers">
            {offered.map(r => (
              <li key={r.id} className={`offer-row ${active?.id === r.id ? 'is-active' : ''}`} data-testid={`card-offer-${r.id}`}>
                <div className="offer-row-main">
                  <span className="status-pill" data-testid={`status-offer-${r.id}`}>Offered</span>
                  <h3 data-testid={`text-offer-material-${r.id}`}>{r.scan.wasteType}</h3>
                  <p><strong data-testid={`text-offer-quantity-${r.id}`}>{r.offer!.supply.quantityTonnes} t</strong> offered <span className="sep">·</span> <MapPin size={12} /> {r.offer!.supply.location}, {r.offer!.supply.region}</p>
                  <small>Offered {fmtDate(r.offer!.submittedAt)}{r.impactReports?.length ? ` · ${r.impactReports.length} report${r.impactReports.length > 1 ? 's' : ''}` : ''}</small>
                </div>
                <div className="ie-actions-row">
                  <button type="button" className="button-secondary" onClick={() => {
                    const result = startLocalTracking(r);
                    setTrackingError(result.ok ? '' : Object.values(result.errors).join(' '));
                    if (result.ok) setTimeout(() => document.getElementById(`tracking-${result.value.id}`)?.scrollIntoView({ behavior: 'smooth' }), 50);
                  }} data-testid={`button-track-transaction-${r.id}`}>Track transaction</button>
                  <button type="button" className="button-secondary" onClick={() => { selectRecord(r.id); setTimeout(() => document.getElementById('market-material-details')?.scrollIntoView({ behavior: 'smooth' }), 50); }} data-testid={`button-material-details-${r.id}`}>Material details</button>
                  <button type="button" className="button-primary" onClick={() => toReport(r.id)} data-testid={`button-create-report-${r.id}`}>Create impact report <ArrowRight size={14} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {trackingError && <p role="alert" className="storage-warning">{trackingError}</p>}
        {detail && <section id="market-material-details" className="panel" style={{ marginTop: 24 }} data-testid="section-market-material-details">
          <h2>{detail.scan.wasteType} · Material details</h2>
          <p className="field-hint">{detail.offer!.supply.quantityTonnes} tonnes · {detail.offer!.supply.location}, {detail.offer!.supply.region}. Optional test results belong to this batch; you can track a transaction without adding them.</p>
          <details className="fold" data-testid="section-photo-observations"><summary>Photo observations — not measured test results</summary>
            {detail.source === 'photo' ? <>
              {[...detail.scan.visibleClues, ...detail.scan.visibleQualityIndicators].map((line, i) => <p key={i} className="field-hint">{line}</p>)}
              <p className="field-hint">Possible contamination: {detail.scan.possibleContamination.join('; ') || 'Not established from the photo'}.</p>
              <p className="field-hint">A photo cannot measure moisture, calorific value or ash percentage.</p>
            </> : <p className="field-hint">Manually identified material. No photo was analyzed.</p>}
          </details>
          <MaterialQualityPanel key={detail.id} record={detail} />
        </section>}
        {txState.transactions.filter(t => offered.some(r => r.id === t.offerId)).map(tx => {
          const record = offered.find(r => r.id === tx.offerId)!;
          return <section key={tx.id} id={`tracking-${tx.id}`} className="panel" style={{ marginTop: 24 }}>
            <h2>{record.scan.wasteType} · Transaction</h2>
            <p className="field-hint">Local prototype only. No messages are sent and completion does not imply reuse. Measured quality stays linked to this material record.</p>
            <details className="fold"><summary>Measured test results — not photo observations</summary>{qualityLines(record.quality).map(line => <p key={line} className="field-hint">{line}</p>)}</details>
            <TransactionCard tx={tx} />
          </section>;
        })}
        <StorageNotice />
      </main>
      <Footer />
    </div>
  );
}
