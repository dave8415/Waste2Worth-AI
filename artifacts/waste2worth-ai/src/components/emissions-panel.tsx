import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useJourney } from '@/lib/journey-state';
import type { MaterialRecord } from '@/lib/journey';
import { EMISSIONS_LABEL, emissionsLines, emptyEmissions, estimateEmissions, type EmissionsDraft, type EmissionsInputs } from '@/lib/emissions';
import './measurement-panels.css';

const NUMS = ['baselineQuantity', 'baselineFactor', 'transportKg', 'processingKg', 'otherKg'] as const;
const toDraft = (i?: EmissionsInputs): EmissionsDraft => {
  const v = i ?? emptyEmissions();
  const d = { ...v } as unknown as EmissionsDraft;
  for (const k of NUMS) d[k] = v[k] === null ? '' : String(v[k]);
  return d;
};
const fmt = (n: number | null) => n === null ? 'Not calculated' : `${n.toLocaleString('en-GB', { maximumFractionDigits: 3 })} kg CO2e`;

export function EmissionsPanel({ record }: { record: MaterialRecord }) {
  const { saveEmissions } = useJourney();
  const [draft, setDraft] = useState<EmissionsDraft>(() => toDraft(record.emissionsInputs));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const lastId = useRef(record.id);
  useEffect(() => {
    if (lastId.current === record.id) return;
    lastId.current = record.id;
    setDraft(toDraft(record.emissionsInputs)); setErrors({}); setSaved(false);
  }, [record]);

  const actual = record.actualQuantities;
  const available = actual?.received != null && actual?.reused != null;
  const isFuel = record.intendedUse === 'Biomass fuel';
  const result = useMemo(() => estimateEmissions(record.emissionsInputs, record.actualQuantities, record.intendedUse || ''), [record.emissionsInputs, record.actualQuantities, record.intendedUse]);
  const lines = useMemo(() => emissionsLines(result), [result]);
  const massUnit = draft.baselineUnit === 'kg' || draft.baselineUnit === 'tonnes';

  const set = <K extends keyof EmissionsDraft>(k: K, v: EmissionsDraft[K]) => { setDraft(d => ({ ...d, [k]: v })); setSaved(false); };
  function submit(e: FormEvent) {
    e.preventDefault();
    const r = saveEmissions(record.id, draft);
    if (!r.ok) { setErrors(r.errors); setSaved(false); return; }
    setErrors({}); setSaved(true);
  }

  const text = (k: keyof EmissionsDraft, label: string, area = false, ph = '') => (
    <div className="field">
      <label htmlFor={`em-${k}`}>{label}</label>
      {area
        ? <textarea id={`em-${k}`} className="field-input" value={draft[k] as string} placeholder={ph} onChange={e => set(k, e.target.value as never)} data-testid={`emissions-${k}`} aria-invalid={!!errors[k]} />
        : <input id={`em-${k}`} className="field-input" value={draft[k] as string} placeholder={ph} inputMode={(NUMS as readonly string[]).includes(k) ? 'decimal' : undefined} onChange={e => set(k, e.target.value as never)} data-testid={`emissions-${k}`} aria-invalid={!!errors[k]} />}
      {errors[k] && <span className="field-error" role="alert">{errors[k]}</span>}
    </div>
  );
  const basis = (k: 'quantityBasis' | 'factorBasis', label: string) => (
    <div className="field">
      <label htmlFor={`em-${k}`}>{label}</label>
      <select id={`em-${k}`} className="field-input" value={draft[k]} onChange={e => set(k, e.target.value as EmissionsDraft[typeof k])} data-testid={`emissions-${k}`}>
        <option value="unknown">Unknown</option><option value="wet">Wet</option><option value="dry">Dry</option>
      </select>
    </div>
  );

  return (
    <section className="panel mp-panel" aria-labelledby="em-heading" data-testid="section-emissions">
      <div><span className="panel-kicker">EMISSIONS ESTIMATE · OPTIONAL</span><h2 id="em-heading">Fuel displacement estimate</h2></div>
      <p className="mp-label" data-testid="text-emissions-label">{EMISSIONS_LABEL}</p>
      <p className="mp-note">Only the biomass-fuel route is defined here: displaced fuel minus transport, processing and other project emissions. Biochar and compost need their own separate methodologies and are not estimated. No price or credit value is shown.</p>
      {!available && <p className="field-hint" data-testid="status-emissions-unavailable">Not available yet. Record actual received and reused quantities first.</p>}
      {available && !isFuel && <p className="field-hint">Intended use is not Biomass fuel, so the result stays Not calculated.</p>}
      <form onSubmit={submit} noValidate>
        <fieldset disabled={!available || !isFuel}>
          <div className="mp-row">
            {text('baselineActivity', 'Baseline fuel or activity displaced', false, 'e.g. LPG for drying')}
            {text('baselineSource', 'Displacement source / evidence')}
          </div>
          <div className="mp-row">
            {text('baselineQuantity', 'Displaced quantity', false, 'Blank if unknown')}
            <div className="field">
              <label htmlFor="em-baselineUnit">Unit</label>
              <select id="em-baselineUnit" className="field-input" value={draft.baselineUnit} onChange={e => set('baselineUnit', e.target.value as EmissionsDraft['baselineUnit'])} data-testid="emissions-baselineUnit">
                {(['kg', 'tonnes', 'litres', 'kWh', 'MJ'] as const).map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            {massUnit && basis('quantityBasis', 'Quantity mass basis')}
          </div>
          <div className="mp-row">
            {text('baselineFactor', `Emission factor (kg CO2e per ${draft.baselineUnit})`, false, 'Blank if unknown')}
            {text('factorSource', 'Factor source')}
            {massUnit && basis('factorBasis', 'Factor mass basis')}
          </div>
          <div className="mp-row">{text('transportKg', 'Transport (kg CO2e)', false, '0 is allowed')}{text('transportSource', 'Transport source / rationale')}</div>
          <div className="mp-row">{text('processingKg', 'Processing (kg CO2e)', false, '0 is allowed')}{text('processingSource', 'Processing source / rationale')}</div>
          <div className="mp-row">{text('otherKg', 'Other project, including applicable combustion (kg CO2e)', false, 'Explicit zero needs a rationale')}{text('otherSource', 'Other source / rationale')}</div>
          {text('assumptions', 'Boundary, assumptions and exclusions', true)}
          {errors.record && <span className="field-error" role="alert">{errors.record}</span>}
          <div className="ie-actions-row">
            <button type="submit" className="button-secondary" data-testid="button-save-emissions">Save inputs</button>
            {saved && <span className="storage-ok" role="status" data-testid="status-emissions-saved">Saved</span>}
          </div>
        </fieldset>
      </form>
      <div className="mp-card" aria-live="polite">
        <h3>Result: <span className="status-pill soft" data-testid="status-emissions">{result.status}</span></h3>
        <div className="mp-result">
          <div><small>Baseline</small><strong>{fmt(result.baselineKg)}</strong></div>
          <div><small>Project</small><strong>{fmt(result.projectKg)}</strong></div>
          <div><small>Net</small><strong data-testid="text-emissions-net">{fmt(result.netKg)}</strong></div>
        </div>
        {result.missing.length > 0 && <ul className="mp-missing" data-testid="list-emissions-missing">{result.missing.map(m => <li key={m}>{m}</li>)}</ul>}
        <details className="fold"><summary data-testid="toggle-emissions-details">Sources, formulas and assumptions</summary>
          <ul className="mp-lines" data-testid="list-emissions-lines">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </details>
      </div>
    </section>
  );
}
