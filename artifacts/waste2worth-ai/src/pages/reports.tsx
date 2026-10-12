import { useMemo } from 'react';
import { Link } from 'wouter';
import { Camera, FileText } from 'lucide-react';
import { Header, Footer } from '@/components/layout';
import { JourneyNav } from '@/components/journey-nav';
import { StorageNotice } from '@/components/storage-notice';
import { ImpactEstimationView } from '@/components/impact-estimation-view';
import { useJourney } from '@/lib/journey-state';

export default function Reports() {
  const { state, active, selectRecord } = useJourney();
  const offered = useMemo(() => state.records.filter(r => r.offer), [state.records]);
  const current = active?.offer ? active : offered[0];
  return (
    <div className="app-shell">
      <Header />
      <main className="page-main">
        <JourneyNav />
        <section className="page-intro">
          <span className="eyebrow"><span className="eyebrow-dot" /> Reports</span>
          <h1>Impact Estimation.<br /><em>Only what really happened.</em></h1>
        </section>
        {!current ? (
          <section className="panel empty-block tall" data-testid="status-no-report-records">
            <FileText size={24} />
            <p><strong>No offered batch yet.</strong><br />Scan a material and submit an offer to create a report.</p>
            <Link href="/scan" className="button-primary" data-testid="link-reports-scan"><Camera size={15} /> Scan a material</Link>
          </section>
        ) : (
          <>
            <div className="field ie-select">
              <label htmlFor="report-record">Batch</label>
              <select id="report-record" className="field-input" value={current.id} onChange={e => selectRecord(e.target.value)} data-testid="select-report-record">
                {offered.map(r => <option key={r.id} value={r.id}>{r.scan.wasteType} · {r.offer!.supply.quantityTonnes} t · {r.offer!.supply.location}</option>)}
              </select>
            </div>
            <ImpactEstimationView key={current.id} record={current} />
          </>
        )}
        <StorageNotice />
      </main>
      <Footer />
    </div>
  );
}
