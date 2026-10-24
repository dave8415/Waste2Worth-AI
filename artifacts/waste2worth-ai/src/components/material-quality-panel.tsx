import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, Download, LoaderCircle, Paperclip, Trash2 } from 'lucide-react';
import { useJourney } from '@/lib/journey-state';
import type { MaterialRecord } from '@/lib/journey';
import type { EvidenceMeta } from '@/lib/transactions';
import { QUALITY_KEYS, QUALITY_LABELS, validateQuality, type QualityDraft } from '@/lib/material-quality';
import { deleteEvidence, downloadEvidence, saveEvidence } from '@/lib/evidence-storage';
import './measurement-panels.css';

type Key = typeof QUALITY_KEYS[number];
const CATEGORY = 'quality' as const;
const LIMIT = 5 * 1024 * 1024;
const SOURCES: QualityDraft[Key]['source'][] = ['', 'lab report', 'measuring device', 'user entry'];

const toDraft = (r: MaterialRecord): QualityDraft => Object.fromEntries(QUALITY_KEYS.map(k => {
  const m = r.quality?.[k];
  return [k, { value: m?.value == null ? '' : String(m.value), source: m?.source ?? '', date: m?.date ?? '', basis: m?.basis ?? 'unknown', evidence: m?.evidence as EvidenceMeta | undefined }];
})) as QualityDraft;

export function MaterialQualityPanel({ record }: { record: MaterialRecord }) {
  const { saveQuality } = useJourney();
  const [draft, setDraft] = useState<QualityDraft>(() => toDraft(record));
  const [files, setFiles] = useState<Partial<Record<Key, File>>>({});
  const [removed, setRemoved] = useState<Partial<Record<Key, boolean>>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [asyncError, setAsyncError] = useState('');
  const lastId = useRef(record.id);
  useEffect(() => {
    if (lastId.current === record.id) return;
    lastId.current = record.id;
    setDraft(toDraft(record)); setFiles({}); setRemoved({}); setErrors({}); setSaved(false); setAsyncError('');
  }, [record]);

  const set = (k: Key, patch: Partial<QualityDraft[Key]>) => { setDraft(d => ({ ...d, [k]: { ...d[k], ...patch } })); setSaved(false); };

  function pickFile(k: Key, f: File | undefined) {
    setErrors(e => { const n = { ...e }; delete n[k + 'File']; return n; });
    if (!f) return;
    if (f.size > LIMIT || !f.size) { setErrors(e => ({ ...e, [k + 'File']: 'Each evidence file must be nonempty and at most 5 MB.' })); return; }
    setFiles(s => ({ ...s, [k]: f })); setRemoved(r => ({ ...r, [k]: false })); setSaved(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setAsyncError(''); setSaved(false);
    const base: QualityDraft = Object.fromEntries(QUALITY_KEYS.map(k => [k, { ...draft[k], evidence: removed[k] ? undefined : draft[k].evidence }])) as QualityDraft;
    const check = validateQuality(base);
    if (!check.ok) { setErrors(check.errors); return; }
    setErrors({}); setBusy(true);
    const created: EvidenceMeta[] = [];
    try {
      const final = { ...base } as QualityDraft;
      for (const k of QUALITY_KEYS) {
        const f = files[k];
        if (f && final[k].value.trim()) { const meta = await saveEvidence(f, CATEGORY); created.push(meta); final[k] = { ...final[k], evidence: meta }; }
      }
      const r = saveQuality(record.id, final);
      if (!r.ok) {
        await Promise.allSettled(created.map(m => deleteEvidence(m.id)));
        setErrors(r.errors); return;
      }
      const normalized = toDraft(r.value);
      const stale = QUALITY_KEYS.map(k => draft[k].evidence).filter((m, i) => m && normalized[QUALITY_KEYS[i]].evidence?.id !== m.id) as EvidenceMeta[];
      const del = await Promise.allSettled(stale.map(m => deleteEvidence(m.id)));
      if (del.some(d => d.status === 'rejected')) setAsyncError('Saved, but an old local file could not be removed from browser storage.');
      setDraft(normalized); setFiles({}); setRemoved({}); setSaved(true);
    } catch (err) {
      await Promise.allSettled(created.map(m => deleteEvidence(m.id)));
      setAsyncError(err instanceof Error ? err.message : 'Evidence could not be stored locally.');
    } finally { setBusy(false); }
  }

  async function download(meta: EvidenceMeta) {
    setAsyncError('');
    try { await downloadEvidence(meta); } catch (err) { setAsyncError(err instanceof Error ? err.message : 'Download failed.'); }
  }

  return (
    <section className="panel mp-panel" aria-labelledby="mq-heading" data-testid="section-material-quality">
      <div><span className="panel-kicker">USER-REPORTED MEASUREMENTS</span><h2 id="mq-heading">Material quality</h2></div>
      <p className="mp-note">Only enter values that were actually measured. A photo cannot provide these. Files stay in this browser only and are not backed up.</p>
      <form onSubmit={submit} noValidate>
        <div className="mp-grid">
          {QUALITY_KEYS.map(k => {
            const d = draft[k], saved_ = record.quality?.[k], ev = removed[k] ? undefined : d.evidence, id = `quality-${k}`;
            return (
              <div className="mp-card" key={k} data-testid={`card-quality-${k}`}>
                <h3>{QUALITY_LABELS[k]}</h3>
                <div className="mp-value" data-testid={`text-quality-${k}-saved`}>Recorded: <b>{saved_?.value == null ? 'Not measured' : saved_.value}</b></div>
                <div className="field">
                  <label htmlFor={`${id}-value`}>Value</label>
                  <input id={`${id}-value`} className="field-input" inputMode="decimal" placeholder="Not measured" value={d.value} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `${id}-error` : undefined} onChange={e => set(k, { value: e.target.value })} data-testid={`${id}-value`} />
                </div>
                <div className="mp-row">
                  <div className="field">
                    <label htmlFor={`${id}-source`}>Source</label>
                    <select id={`${id}-source`} className="field-input" value={d.source} onChange={e => set(k, { source: e.target.value as QualityDraft[Key]['source'] })} data-testid={`${id}-source`}>
                      {SOURCES.map(s => <option key={s} value={s}>{s || 'Choose source'}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor={`${id}-date`}>Date</label>
                    <input id={`${id}-date`} type="date" className="field-input" value={d.date} onChange={e => set(k, { date: e.target.value })} data-testid={`${id}-date`} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor={`${id}-basis`}>Mass basis</label>
                  <select id={`${id}-basis`} className="field-input" value={d.basis} onChange={e => set(k, { basis: e.target.value as QualityDraft[Key]['basis'] })} data-testid={`${id}-basis`}>
                    <option value="unknown">Unknown</option><option value="wet">Wet</option><option value="dry">Dry</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`${id}-file`}>Evidence file (optional, max 5 MB)</label>
                  <input id={`${id}-file`} type="file" className="field-input" accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,text/csv" onChange={e => { pickFile(k, e.target.files?.[0]); e.target.value = ''; }} data-testid={`${id}-file`} />
                  {files[k] && <span className="mp-file"><Paperclip size={12} /> New: {files[k]!.name}<button type="button" className="link-button" onClick={() => setFiles(s => ({ ...s, [k]: undefined }))}>Cancel</button></span>}
                  {ev && !files[k] && (
                    <span className="mp-file" data-testid={`${id}-evidence`}><Paperclip size={12} /> {ev.name}
                      <button type="button" className="link-button" onClick={() => download(ev)} data-testid={`button-download-${id}`}><Download size={12} /> Download</button>
                      <button type="button" className="link-button" onClick={() => { setRemoved(r => ({ ...r, [k]: true })); setSaved(false); }} data-testid={`button-remove-${id}`}><Trash2 size={12} /> Remove</button>
                    </span>
                  )}
                  {removed[k] && d.evidence && <span className="mp-file">Will be removed on save. <button type="button" className="link-button" onClick={() => setRemoved(r => ({ ...r, [k]: false }))}>Undo</button></span>}
                  {errors[k + 'File'] && <span className="field-error" role="alert">{errors[k + 'File']}</span>}
                </div>
                {errors[k] && <span className="field-error" id={`${id}-error`} role="alert" data-testid={`error-${id}`}>{errors[k]}</span>}
              </div>
            );
          })}
        </div>
        {errors.record && <span className="field-error" role="alert">{errors.record}</span>}
        {asyncError && <div className="storage-warning" role="alert" data-testid="status-quality-error"><AlertCircle size={14} /> {asyncError}</div>}
        <div className="ie-actions-row" style={{ marginTop: 14 }}>
          <button type="submit" className="button-secondary" disabled={busy} data-testid="button-save-quality">{busy && <LoaderCircle size={14} className="spin" />} Save measurements</button>
          {saved && <span className="storage-ok" role="status" data-testid="status-quality-saved">Saved</span>}
        </div>
      </form>
    </section>
  );
}
