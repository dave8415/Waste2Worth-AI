import { Link } from 'wouter';
import { Camera, FileText } from 'lucide-react';
import { Header, Footer } from '@/components/layout';
import { JourneyNav } from '@/components/journey-nav';
import { StorageNotice } from '@/components/storage-notice';
import { ConnectedReport } from '@/components/connected-report';
import { useJourney } from '@/lib/journey-state';

export default function Reports() {
  const { state, selectRecord } = useJourney();
  const offered = state.records.filter(r => r.offer);
  return (
    <div className="app-shell">
      <Header />
      <main className="page-main">
        <JourneyNav />
        <section className="page-intro">
          <span className="eyebrow"><span className="eyebrow-dot" /> Reports · unverified</span>
          <h1>Say what you know.<br /><em>Mark what you don’t.</em></h1>
          <p>Each report comes from one offer record. Offered tonnes stay offered. Actual impact appears only once a linked receipt records reused tonnes. Emissions savings are not calculated or verified.</p>
        </section>
        {offered.length === 0 ? (
          <section className="panel empty-block tall" data-testid="status-no-reports">
            <FileText size={24} /><p><strong>Nothing to report yet.</strong><br />Submit an offer from Scan first. A preliminary report is available straight after.</p>
            <Link href="/scan" className="button-primary" data-testid="link-reports-scan"><Camera size={15} /> Scan a material</Link>
          </section>
        ) : (
          <div className="report-list">
            {offered.map(r => (
              <article key={r.id} className="panel" data-testid={`card-report-record-${r.id}`}>
                <div className="report-record-head">
                  <div><span className="panel-kicker">OFFER · {r.id.slice(0, 8).toUpperCase()}</span>
                    <h2 className="panel-title">{r.offer!.supply.quantityTonnes} t · {r.scan.wasteType}</h2>
                    <p className="panel-copy">{r.offer!.supply.location}, {r.offer!.supply.region}</p></div>
                  <Link href="/market" onClick={() => selectRecord(r.id)} className="text-link small" data-testid={`link-report-market-${r.id}`}>Open in Market</Link>
                </div>
                <ConnectedReport record={r} />
              </article>
            ))}
          </div>
        )}
        <p className="muted-line"><Link href="/reports/legacy" className="text-link small" data-testid="link-legacy-impact">Open the older stand-alone impact form (not linked to scans)</Link></p>
        <StorageNotice />
      </main>
      <Footer />
    </div>
  );
}
