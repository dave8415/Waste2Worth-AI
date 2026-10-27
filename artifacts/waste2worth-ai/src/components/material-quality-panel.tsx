import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, Download, LoaderCircle, Paperclip, Trash2 } from 'lucide-react';
import { useExtractCoa, type CoaExtraction } from '@workspace/api-client-react';
import { useJourney } from '@/lib/journey-state';
import type { MaterialRecord } from '@/lib/journey';
import type { EvidenceMeta } from '@/lib/transactions';
import { QUALITY_KEYS, QUALITY_LABELS } from '@/lib/material-quality';
import { testResultsDraft, qualityStatus, type TestResultsDraft } from '@/lib/test-results';
import { applyCoaToDraft, canExtractDocument, clearExtractedValue, extractionReviewLines, extractionStatus } from '@/lib/coa-review';
import { deleteEvidence, downloadEvidence, saveEvidence } from '@/lib/evidence-storage';
import './measurement-panels.css';

type Key = typeof QUALITY_KEYS[number];
const LIMIT = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain', 'text/csv'];
const SOURCES: TestResultsDraft['source'][] = ['', 'lab report', 'measuring device', 'user entry'];

function errorText(error: unknown): string {
  if (error instanceof Error && 'data' in error && error.data && typeof error.data === 'object') {
    const data = error.data as { error?: unknown };
    if (typeof data.error === 'string') return data.error;
  }
  if (error instanceof Error) return error.message;
  return 'Gemini could not read this document. Enter the printed values manually.';
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      const encoded = comma >= 0 ? result.slice(comma + 1) : result;
      if (!encoded) reject(new Error('This document could not be read. Try another file.'));
      else resolve(encoded);
    };
    reader.onerror = () => reject(new Error('This document could not be read. Try another file.'));
    reader.readAsDataURL(file);
  });
}

export function MaterialQualityPanel({ record }: { record: MaterialRecord }) {
  const { saveTestResults } = useJourney();
  const extract = useExtractCoa();
  const [draft, setDraft] = useState<TestResultsDraft>(() => testResultsDraft(record.quality));
  const [file, setFile] = useState<File | undefined>();
  const [removed, setRemoved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [asyncError, setAsyncError] = useState('');
  const [extraction, setExtraction] = useState<CoaExtraction | null>(null);
  const [extractError, setExtractError] = useState('');
  const [beforeExtract, setBeforeExtract] = useState<TestResultsDraft | null>(null);
  const lastId = useRef(record.id);
  useEffect(() => {
    if (lastId.current === record.id) return;
    lastId.current = record.id;
    setDraft(testResultsDraft(record.quality)); setFile(undefined); setRemoved(false); setErrors({}); setSaved(false); setAsyncError('');
    setExtraction(null); setExtractError(''); setBeforeExtract(null);
  }, [record]);

  const patch = (p: Partial<TestResultsDraft>) => { setDraft(d => ({ ...d, ...p, ...('confirmed' in p ? {} : { confirmed: false }) })); setSaved(false); };
  const legacyPairs = [
    ...QUALITY_KEYS.map(k => [k, record.quality?.[k]?.evidence] as const),
    ...(record.quality?.legacyEvidence ?? []).map((m, i) => [`earlier-${i}`, m] as const),
  ].filter(([, m]) => m && m.id !== draft.evidence?.id) as [string, EvidenceMeta][];
  const legacy = [...new Map(legacyPairs.map(pair => [pair[1].id, pair])).values()];
  const ev = removed ? undefined : draft.evidence;
  const extractable = !!file && canExtractDocument(file.type);
  const status = extract.isPending ? 'loading' : extractionStatus(extraction, extractError);

  function resetExtraction() {
    setExtraction(null); setExtractError(''); setBeforeExtract(null); extract.reset();
  }

  function pickFile(f: File | undefined) {
    setErrors(e => { const n = { ...e }; delete n.file; return n; });
    resetExtraction();
    if (!f) return;
    if (!f.size || f.size > LIMIT) { setErrors(e => ({ ...e, file: 'File must be nonempty and at most 5 MB.' })); return; }
    if (!TYPES.includes(f.type)) { setErrors(e => ({ ...e, file: 'Attach a PDF, JPG, PNG, WebP, TXT or CSV file.' })); return; }
    setFile(f); patch({ confirmed: false });
  }

  async function extractValues() {
    if (!file || !extractable || extract.isPending) return;
    setExtractError(''); setSaved(false);
    try {
      const documentBase64 = await fileToBase64(file);
      const data = await extract.mutateAsync({
        data: { documentBase64, mimeType: file.type as 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp' },
      });
      setExtraction(data);
      if (data.documentLooksLikeLabReport !== false) {
        setBeforeExtract(draft);
        setDraft(applyCoaToDraft(draft, data));
      }
    } catch (error) {
      setExtraction(null);
      setExtractError(errorText(error));
    }
  }

  function cancelExtraction() {
    if (beforeExtract) setDraft({ ...beforeExtract, confirmed: false });
    resetExtraction();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setAsyncError(''); setSaved(false);
    const pre: Record<string, string> = {};
    const hasValue = QUALITY_KEYS.some(k => draft.values[k].trim() !== '');
    if (!draft.source) pre.source = 'Choose the source.';
    if (!draft.date) pre.date = 'Enter the test date.';
    if (!draft.confirmed) pre.confirmed = 'Confirm the values before saving.';
    if (!hasValue && !file && !ev) pre.record = 'Enter at least one value or attach an evidence file.';
    if (Object.keys(pre).length) { setErrors(pre); return; }
    setErrors({}); setBusy(true);
    let created: EvidenceMeta | undefined;
    try {
      if (file) created = await saveEvidence(file, 'quality');
      const final: TestResultsDraft = { ...draft, evidence: created ?? ev };
      const r = saveTestResults(record.id, final);
      if (!r.ok) {
        if (created) await Promise.allSettled([deleteEvidence(created.id)]);
        setErrors(r.errors); return;
      }
      setDraft(testResultsDraft(r.value.quality)); setFile(undefined); setRemoved(false); setSaved(true);
      resetExtraction();
    } catch (err) {
      if (created) await Promise.allSettled([deleteEvidence(created.id)]);
      setAsyncError(err instanceof Error ? err.message : 'Evidence could not be stored locally.');
    } finally { setBusy(false); }
  }

  async function download(meta: EvidenceMeta) {
    setAsyncError('');
    try { await downloadEvidence(meta); } catch (err) { setAsyncError(err instanceof Error ? err.message : 'Download failed.'); }
  }

  return (
    <section className="mq-section" data-testid="section-material-quality">
      <details className="mq-details">
        <summary data-testid="toggle-test-results">
          Add test results (optional)
          <span className="mq-status" data-testid="text-quality-status">{qualityStatus(record.quality)}</span>
        </summary>
        <form onSubmit={submit} noValidate className="mq-form">
          <p className="mq-note">Upload a COA or lab report to extract printed values with Gemini, or enter the results manually. Review all values before saving. Files stay in this browser only.</p>
          <div className="mq-values">
            {QUALITY_KEYS.map(k => (
              <div className="field" key={k}>
                <label htmlFor={`quality-${k}-value`}>{QUALITY_LABELS[k]}</label>
                <input id={`quality-${k}-value`} className="field-input" inputMode="decimal" placeholder="Not tested" value={draft.values[k]}
                  aria-invalid={!!errors[k]} onChange={e => patch({ values: { ...draft.values, [k]: e.target.value } })} data-testid={`quality-${k}-value`} />
                {extraction && draft.values[k] && (
                  <button type="button" className="link-button" onClick={() => setDraft(d => clearExtractedValue(d, k))} data-testid={`button-clear-${k}`}>Remove</button>
                )}
                {errors[k] && <span className="field-error" role="alert">{errors[k]}</span>}
              </div>
            ))}
          </div>
          <details className="mq-bases">
            <summary>Mass basis (wet / dry)</summary>
            <div className="mq-values">
              {QUALITY_KEYS.map(k => (
                <div className="field" key={k}>
                  <label htmlFor={`quality-${k}-basis`}>{QUALITY_LABELS[k].split(' (')[0]}</label>
                  <select id={`quality-${k}-basis`} className="field-input" value={draft.bases[k]}
                    onChange={e => patch({ bases: { ...draft.bases, [k]: e.target.value as TestResultsDraft['bases'][Key] } })} data-testid={`quality-${k}-basis`}>
                    <option value="unknown">Unknown</option><option value="wet">Wet (as received)</option><option value="dry">Dry</option>
                  </select>
                </div>
              ))}
            </div>
          </details>
          <div className="mq-row">
            <div className="field">
              <label htmlFor="quality-source">Source</label>
              <select id="quality-source" className="field-input" value={draft.source} aria-invalid={!!errors.source}
                onChange={e => patch({ source: e.target.value as TestResultsDraft['source'] })} data-testid="quality-source">
                {SOURCES.map(s => <option key={s} value={s}>{s ? s[0].toUpperCase() + s.slice(1) : 'Choose source'}</option>)}
              </select>
              {errors.source && <span className="field-error" role="alert">{errors.source}</span>}
            </div>
            <div className="field">
              <label htmlFor="quality-date">Test date</label>
              <input id="quality-date" type="date" className="field-input" value={draft.date} aria-invalid={!!errors.date}
                onChange={e => patch({ date: e.target.value })} data-testid="quality-date" />
              {errors.date && <span className="field-error" role="alert">{errors.date}</span>}
            </div>
          </div>
          <div className="field">
            <label htmlFor="quality-file">Evidence file (optional: COA, lab report PDF, image, TXT, CSV; max 5 MB)</label>
            <input id="quality-file" type="file" className="field-input" accept={TYPES.join(',')}
              onChange={e => { pickFile(e.target.files?.[0]); e.target.value = ''; }} data-testid="quality-file" />
            {file && <span className="mp-file"><Paperclip size={12} /> New: {file.name}
              <button type="button" className="link-button" onClick={() => { setFile(undefined); resetExtraction(); }} data-testid="button-cancel-quality-file">Cancel</button></span>}
            {ev && !file && (
              <span className="mp-file" data-testid="text-quality-evidence"><Paperclip size={12} /> {ev.name}
                <button type="button" className="link-button" onClick={() => download(ev)} data-testid="button-download-quality-evidence"><Download size={12} /> Download</button>
                <button type="button" className="link-button" onClick={() => { setRemoved(true); patch({ confirmed: false }); }} data-testid="button-remove-quality-evidence"><Trash2 size={12} /> Remove</button>
              </span>
            )}
            {file && ev && <span className="mp-file">Saving will replace {ev.name}.</span>}
            {removed && draft.evidence && !file && <span className="mp-file">Will be detached on save.
              <button type="button" className="link-button" onClick={() => { setRemoved(false); patch({ confirmed: false }); }}>Undo</button></span>}
            {extractable && (
              <button type="button" className="button-secondary" disabled={extract.isPending} onClick={() => void extractValues()} data-testid="button-extract-coa">
                {extract.isPending && <LoaderCircle size={14} className="spin" />} Extract values with Gemini
              </button>
            )}
            {errors.file && <span className="field-error" role="alert">{errors.file}</span>}
            {errors.evidence && <span className="field-error" role="alert">{errors.evidence}</span>}
          </div>
          {status === 'loading' && <p className="mq-note" role="status" data-testid="status-coa-extract">Reading printed values. Nothing is saved until you review and confirm.</p>}
          {status === 'success' && <p className="storage-ok" role="status" data-testid="status-coa-extract">Printed values were extracted as candidates. Review and edit them before saving.</p>}
          {status === 'partial' && <p className="mq-note" role="status" data-testid="status-coa-extract">Some printed values were found. Missing fields stay Not measured unless you enter them.</p>}
          {status === 'not-lab' && <p className="storage-warning" role="alert" data-testid="status-coa-extract">This file does not look like a laboratory report. Keep it as evidence or enter values manually.</p>}
          {status === 'error' && <div className="storage-warning" role="alert" data-testid="status-coa-extract"><AlertCircle size={14} /> {extractError}</div>}
          {extraction && status !== 'not-lab' && (
            <div className="mq-review" data-testid="panel-coa-review">
              <strong>Candidate values — not saved</strong>
              {extractionReviewLines(extraction).map(line => (
                <p key={line.label}><span>{line.label}</span> {line.value}</p>
              ))}
              {extraction.warnings.map(warning => <p key={warning} className="field-hint">{warning}</p>)}
              <button type="button" className="link-button" onClick={cancelExtraction} data-testid="button-cancel-coa-extract">Cancel extraction</button>
            </div>
          )}
          {legacy.length > 0 && (
            <div className="mq-legacy" data-testid="list-quality-legacy-evidence">
              <span>Earlier evidence files (kept for reports):</span>
              {legacy.map(([k, m]) => (
                <button key={k} type="button" className="link-button" onClick={() => download(m)} data-testid={`button-download-legacy-${k}`}>
                  <Download size={12} /> {m.name}
                </button>
              ))}
            </div>
          )}
          <label className="mq-check">
            <input type="checkbox" checked={draft.confirmed} onChange={e => patch({ confirmed: e.target.checked })} data-testid="checkbox-confirm-quality" />
            I reviewed these values against the uploaded report and confirm that they were entered correctly.
          </label>
          {errors.confirmed && <span className="field-error" role="alert">{errors.confirmed}</span>}
          {errors.record && <span className="field-error" role="alert">{errors.record}</span>}
          {asyncError && <div className="storage-warning" role="alert" data-testid="status-quality-error"><AlertCircle size={14} /> {asyncError}</div>}
          <div className="mq-actions">
            <button type="submit" className="button-secondary" disabled={busy} data-testid="button-save-quality">{busy && <LoaderCircle size={14} className="spin" />} Save test results</button>
            {saved && <span className="storage-ok" role="status" data-testid="status-quality-saved">Saved</span>}
          </div>
        </form>
      </details>
    </section>
  );
}
