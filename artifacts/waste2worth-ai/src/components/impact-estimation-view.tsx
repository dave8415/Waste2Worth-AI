import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, ChevronDown, Download, FileText, ImageOff, LoaderCircle, MapPin, RefreshCw } from 'lucide-react';
import { useJourney } from '@/lib/journey-state';
import { USES } from '@/lib/biomass';
import type { MaterialRecord } from '@/lib/journey';
import { estimationVersion, REPORT_LIMITATIONS, type ActualQuantityDraft, type ImpactEstimationReport, type ReportMethod } from '@/lib/impact-estimation';
import { downloadImpactPdf } from '@/lib/impact-pdf';

const fmtDate = (s: string) => new Date(s).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const qty = (n: number | null | undefined) => n === null || n === undefined ? 'Unknown' : `${n} t`;
const toDraft = (r: MaterialRecord): ActualQuantityDraft => ({
  collected: r.actualQuantities?.collected?.toString() ?? '',
  received: r.actualQuantities?.received?.toString() ?? '',
  reused: r.actualQuantities?.reused?.toString() ?? '',
});

function Photo({ src, alt }: { src?: string; alt: string }) {
  return src
    ? <img className="ie-photo" src={src} alt={alt} data-testid="img-report-photo" />
    : <div className="ie-photo ie-photo-none" data-testid="status-photo-unavailable"><ImageOff size={20} /><span>Photo not available</span></div>;
}

function ReportPreview({ report, photo }: { report: ImpactEstimationReport; photo?: string }) {
  return (
    <article className="ie-preview" aria-label="Report preview" data-testid="report-preview">
      <header className="ie-preview-head">
        <div><span className="panel-kicker">IMPACT ESTIMATION</span><h3>{report.material}</h3><small data-testid="text-report-date">Generated {fmtDate(report.generatedAt)}</small></div>
        <span className="status-pill soft" data-testid="status-report">{report.status}</span>
      </header>
      <Photo src={photo} alt={`Scan photo of ${report.material}`} />
      <dl className="ie-facts">
        <div><dt>Intended use</dt><dd>{report.method}</dd></div>
        <div><dt>Location</dt><dd>{report.city}, {report.province}</dd></div>
        <div><dt>Identified by</dt><dd>{report.source === 'photo' ? 'Photo estimate' : 'Manual entry'} · {report.confidence} confidence</dd></div>
      </dl>
      <div className="ie-split">
        <div className="ie-card offered"><small>Offered quantity</small><strong data-testid="text-preview-offered">{report.offeredTonnes} t</strong><span>Quantity originally offered</span></div>
        <div className="ie-card actual">
          <small>Actual quantities</small>
          <ul>
            <li><span>Collected</span><b data-testid="text-preview-collected">{qty(report.collectedTonnes)}</b></li>
            <li><span>Received</span><b data-testid="text-preview-received">{qty(report.receivedTonnes)}</b></li>
            <li><span>Reused</span><b data-testid="text-preview-reused">{qty(report.reusedTonnes)}</b></li>
          </ul>
        </div>
      </div>
      <div className="ie-emissions"><small>Emissions savings</small><strong data-testid="text-preview-emissions">{report.emissionsStatus}</strong></div>
      {(report.qualityIndicators.length > 0 || report.contamination.length > 0) && (
        <div className="ie-findings">
          {report.qualityIndicators.length > 0 && <p><b>Visible condition:</b> {report.qualityIndicators.join('; ')}</p>}
          {report.contamination.length > 0 && <p><b>Possible contamination:</b> {report.contamination.join('; ')}</p>}
        </div>
      )}
    </article>
  );
}

export function ImpactEstimationView({ record }: { record: MaterialRecord }) {
  const { photos, setIntendedUse, saveActualQuantities, generateImpactReport } = useJourney();
  const offer = record.offer!;
  const photo = photos[record.id];
  const reports = useMemo(() => record.impactReports ?? [], [record.impactReports]);
  const [selectedId, setSelectedId] = useState<string | null>(reports[0]?.id ?? null);
  const selected = reports.find(r => r.id === selectedId) ?? reports[0];
  const latest = reports[0];
  const stale = !!latest && latest.sourceVersion !== estimationVersion(record);
  const [draft, setDraft] = useState<ActualQuantityDraft>(() => toDraft(record));
  const [qErrors, setQErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [genError, setGenError] = useState('');
  const [dlError, setDlError] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const lastId = useRef(record.id);
  useEffect(() => {
    if (lastId.current === record.id) return;
    lastId.current = record.id;
    setDraft(toDraft(record)); setQErrors({}); setSaved(false); setGenError(''); setDlError('');
    setSelectedId(record.impactReports?.[0]?.id ?? null);
  }, [record]);

  function saveQuantities(e: FormEvent) {
    e.preventDefault();
    const r = saveActualQuantities(record.id, draft);
    if (!r.ok) { setQErrors(r.errors); setSaved(false); return; }
    setQErrors({}); setSaved(true);
  }
  function generate() {
    setGenError(''); setDlError('');
    const r = generateImpactReport(record.id);
    if (!r.ok) { setGenError(Object.values(r.errors).join(' ')); return; }
    setSelectedId(r.value.id);
  }
  async function download(report: ImpactEstimationReport) {
    if (downloading) return;
    setDownloading(report.id); setDlError('');
    try { await downloadImpactPdf(report, photos[report.recordId]); }
    catch { setDlError('The PDF could not be created. Please try again.'); }
    finally { setDownloading(null); }
  }

  return (
    <div className="ie-layout">
      <section className="panel ie-record" aria-labelledby="ie-record-heading" data-testid="section-report-record">
        <span className="panel-kicker">FROM YOUR SCAN AND OFFER</span>
        <h2 id="ie-record-heading" data-testid="text-report-material">{record.scan.wasteType}</h2>
        <p className="ie-loc" data-testid="text-report-location"><MapPin size={13} /> {offer.supply.location}, {offer.supply.region}</p>
        <Photo src={photo} alt={`Scan photo of ${record.scan.wasteType}`} />
        <details className="fold">
          <summary data-testid="toggle-report-scan-findings">Scan findings</summary>
          <div className="ie-findings" data-testid="report-scan-findings">
            <p><b>Identification:</b> {record.source === 'photo' ? 'Photo estimate' : 'Manual entry'} · {record.scan.confidence} confidence</p>
            <p><b>Visible clues:</b> {record.scan.visibleClues.join('; ') || 'Not assessed'}</p>
            <p><b>Visible condition:</b> {record.scan.visibleQualityIndicators.join('; ') || 'Unknown'}</p>
            <p><b>Possible contamination:</b> {record.scan.possibleContamination.join('; ') || 'Unknown — inspection needed'}</p>
            <p><b>Potential uses:</b> {record.scan.possibleUses.join('; ') || 'Not assessed'}</p>
          </div>
        </details>
        <div className="ie-card offered wide"><small>Offered quantity</small><strong data-testid="text-report-offered">{offer.supply.quantityTonnes} t</strong><span>Available for offer. Not counted as collected, received or reused.</span></div>

        <div className="field ie-use">
          <label htmlFor="report-intended-use">Intended use or processing</label>
          {record.intendedUse ? (
            <div className="ie-use-set"><strong data-testid="text-report-method">{record.intendedUse}</strong><button type="button" className="link-button" onClick={() => setIntendedUse(record.id, '')} data-testid="button-change-method">Change</button></div>
          ) : (
            <div className="ie-use-pick">
              <select id="report-intended-use" className="field-input" value={record.intendedUse || ''} onChange={e => setIntendedUse(record.id, e.target.value as ReportMethod)} data-testid="select-report-method">
                <option value="">Choose intended use</option>
                {USES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          )}
        </div>

        <details className="ie-actuals" open={!!record.actualQuantities}>
          <summary data-testid="toggle-actual-quantities"><span>Record actual quantities <small>optional</small></span><ChevronDown size={15} /></summary>
          <form onSubmit={saveQuantities} noValidate data-testid="form-actual-quantities">
            <p className="field-hint">Enter tonnes only after material has really moved. Leave blank if unknown.</p>
            {(['collected', 'received', 'reused'] as const).map(k => (
              <div className="field" key={k}>
                <label htmlFor={`actual-${k}`}>Actually {k} (tonnes)</label>
                <input id={`actual-${k}`} className="field-input" inputMode="decimal" placeholder="Unknown" value={draft[k]} aria-invalid={!!qErrors[k]} aria-describedby={qErrors[k] ? `actual-${k}-error` : undefined}
                  onChange={e => { setDraft(d => ({ ...d, [k]: e.target.value })); setSaved(false); }} data-testid={`input-actual-${k}`} />
                {qErrors[k] && <span className="field-error" id={`actual-${k}-error`} role="alert" data-testid={`error-actual-${k}`}>{qErrors[k]}</span>}
              </div>
            ))}
            {qErrors.record && <span className="field-error" role="alert">{qErrors.record}</span>}
            <div className="ie-actions-row">
              <button type="submit" className="button-secondary" data-testid="button-save-quantities">Save quantities</button>
              {saved && <span className="storage-ok" role="status" data-testid="status-quantities-saved">Saved</span>}
            </div>
          </form>
        </details>

        <div className="ie-emissions"><small>Emissions savings</small><strong>Belum dihitung</strong></div>
      </section>

      <section className="ie-output" aria-labelledby="ie-output-heading">
        <div className="panel ie-controls">
          <h2 id="ie-output-heading">Impact Estimation report</h2>
          {stale && <div className="ie-stale" role="status" data-testid="status-report-stale"><RefreshCw size={14} /> Details changed; generate a new report.</div>}
          {genError && <div className="storage-warning" role="alert" data-testid="status-generate-error"><AlertCircle size={14} /> {genError}</div>}
          {dlError && <div className="storage-warning" role="alert" data-testid="status-download-error"><AlertCircle size={14} /> {dlError}</div>}
          <div className="ie-actions-row">
            <button type="button" className="button-primary" onClick={generate} data-testid="button-generate-report"><FileText size={15} /> Generate report</button>
            <button type="button" className="button-secondary" disabled={!selected || !!downloading} onClick={() => selected && download(selected)} data-testid="button-download-pdf">
              {downloading === selected?.id ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />} Download PDF
            </button>
          </div>
          {!selected && <p className="field-hint">Generate a report to preview and download it.</p>}
        </div>

        {selected ? <ReportPreview report={selected} photo={photos[selected.recordId]} /> : (
          <div className="panel empty-block" data-testid="status-no-reports"><FileText size={22} /><p>No report yet for this batch.</p></div>
        )}

        {reports.length > 0 && (
          <div className="panel ie-history">
            <h3>Report history</h3>
            <ul data-testid="list-report-history">
              {reports.map(r => (
                <li key={r.id} className={selected?.id === r.id ? 'on' : ''} data-testid={`row-report-${r.id}`}>
                  <button type="button" className="ie-history-pick" aria-pressed={selected?.id === r.id} onClick={() => setSelectedId(r.id)} data-testid={`button-select-report-${r.id}`}>
                    <strong>{fmtDate(r.generatedAt)}</strong>
                    <span>{r.material} · {r.method} · {r.offeredTonnes} t offered</span>
                    <small>{r.status}</small>
                  </button>
                  <button type="button" className="icon-button" aria-label={`Download report from ${fmtDate(r.generatedAt)}`} disabled={!!downloading} onClick={() => download(r)} data-testid={`button-download-report-${r.id}`}>
                    {downloading === r.id ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="ie-limits" data-testid="text-report-limitations">
          <h3>Good to know</h3>
          <ul>{REPORT_LIMITATIONS.map(l => <li key={l}>{l}</li>)}</ul>
        </div>
      </section>
    </div>
  );
}
