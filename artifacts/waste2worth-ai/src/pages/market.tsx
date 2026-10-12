import { useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowRight, Camera, Factory, MapPin, Package } from 'lucide-react';
import { Header, Footer } from '@/components/layout';
import { JourneyNav } from '@/components/journey-nav';
import { StorageNotice } from '@/components/storage-notice';
import { useJourney } from '@/lib/journey-state';

const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Market() {
  const { state, active, selectRecord } = useJourney();
  const [, navigate] = useLocation();
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
                <button type="button" className="button-primary" onClick={() => toReport(r.id)} data-testid={`button-create-report-${r.id}`}>Create impact report <ArrowRight size={14} /></button>
              </li>
            ))}
          </ul>
        )}
        <StorageNotice />
      </main>
      <Footer />
    </div>
  );
}
