import { useMemo } from 'react';
import { Download, FileText, RefreshCw } from 'lucide-react';
import { useJourney } from '@/lib/journey-state';
import { useTransactions } from '@/lib/transaction-state';
import { relatedTransactions, reportVersion, type MaterialRecord } from '@/lib/journey';

export function ConnectedReport({ record }: { record: MaterialRecord }) {
  const { generateReport } = useJourney();
  const { state } = useTransactions();
  const version = useMemo(() => reportVersion(record, state.transactions), [record, state.transactions]);
  const linked = useMemo(() => relatedTransactions(record, state.transactions), [record, state.transactions]);
  const actual = linked.some(tx => tx.history.some(h => h.status === 'received') && tx.draft.actualReusedTonnes.trim() !== '');
  if (!record.offer) return null;
  const report = record.report;
  const stale = !!report && report.sourceVersion !== version;
  const isActual = report ? report.text.includes('USER-REPORTED ACTUAL IMPACT') : actual;
  function download() {
    if (!report) return;
    const blob = new Blob([report.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `waste2worth-report-${record.id.slice(0, 8)}.txt`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="connected-report" aria-labelledby={`report-h-${record.id}`} data-testid={`section-report-${record.id}`}>
      <div className="report-head">
        <div>
          <span className="panel-kicker"><FileText size={12} /> SAME RECORD · REPORT</span>
          <h3 id={`report-h-${record.id}`}>{report ? (isActual ? 'User-reported actual impact' : 'Preliminary offer summary') : actual ? 'Actual reuse recorded — ready to report' : 'Preliminary report available'}</h3>
        </div>
        <span className={`report-badge ${isActual ? 'actual' : ''}`} data-testid={`status-report-kind-${record.id}`}>{isActual ? 'ACTUAL · UNVERIFIED' : 'PRELIMINARY · OFFERED ONLY'}</span>
      </div>
      <p className="panel-copy">{actual ? 'A linked demo transaction has a recorded receipt with a reused quantity. Figures stay user-reported and unverified.' : 'Offered quantity is availability only — never counted as collected, received or reused. Actual impact appears after a linked receipt records reused tonnes.'}</p>
      {stale && <div className="status-message info" role="alert" data-testid={`status-report-stale-${record.id}`}><strong>Report out of date.</strong> Linked transactions changed since {new Date(report!.generatedAt).toLocaleString()}. Update to refresh the snapshot.</div>}
      <div className="report-actions">
        {!report ? (
          <button type="button" className="button-primary" onClick={() => generateReport(record.id, state.transactions)} data-testid={`button-generate-report-${record.id}`} aria-label="Generate report for this offer">Generate {actual ? 'actual' : 'preliminary'} report</button>
        ) : (
          <>
            <button type="button" className={stale ? 'button-primary' : 'button-secondary'} onClick={() => generateReport(record.id, state.transactions)} data-testid={`button-update-report-${record.id}`} aria-label="Update report for this offer"><RefreshCw size={14} /> Update report</button>
            <button type="button" className="button-secondary" onClick={download} data-testid={`button-download-report-${record.id}`} aria-label="Download stored report text"><Download size={14} /> Download .txt</button>
          </>
        )}
      </div>
      {report && <pre className="report-text" data-testid={`text-report-${record.id}`}>{report.text}</pre>}
    </section>
  );
}
