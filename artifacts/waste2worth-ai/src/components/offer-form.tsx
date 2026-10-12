import { useState, type FormEvent } from 'react';
import { CircleAlert, Send } from 'lucide-react';
import { useJourney } from '@/lib/journey-state';
import { emptyShortOffer, type MaterialRecord, type ShortOffer } from '@/lib/journey';
import { PROVINCES, PROVINCE_CITIES } from '@/lib/locations';

const LOGISTICS: { v: ShortOffer['logistics']; l: string }[] = [
  { v: 'buyer-pickup', l: 'Buyer pickup' }, { v: 'supplier-delivery', l: 'Supplier delivers' },
  { v: 'third-party', l: 'Third-party transport' }, { v: 'to-be-agreed', l: 'To be agreed' },
];

export function ShortOfferForm({ record, onSubmitted, initial }: { record: MaterialRecord; onSubmitted: (r: MaterialRecord) => void; initial?: Partial<ShortOffer> }) {
  const { submitOffer } = useJourney();
  const [v, setV] = useState<ShortOffer>({ ...emptyShortOffer, ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<ShortOffer>) => {
    setV(p => ({ ...p, ...patch }));
    setErrors(e => { const n = { ...e }; Object.keys(patch).forEach(k => delete n[k]); if ('province' in patch) { delete n.region; delete n.city; delete n.location; } if ('city' in patch) delete n.location; if ('quantityTonnes' in patch) delete n.quantityTonnes; return n; });
  };
  const cityErr = errors.city || errors.location; const provErr = errors.province || errors.region;
  function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const local: Record<string, string> = {};
    if (!v.province) local.province = 'Choose a province.';
    if (!v.city) local.city = 'Choose a city or regency.';
    else if (v.province && !PROVINCE_CITIES[v.province]?.includes(v.city)) local.city = 'Choose a city that belongs to the selected province.';
    if (Object.keys(local).length) { setErrors(local); return; }
    setBusy(true);
    const r = submitOffer(record.id, v);
    setBusy(false);
    if (!r.ok) { setErrors(r.errors); return; }
    onSubmitted(r.value);
  }
  const err = (k: string, msg?: string) => msg ? <span className="field-error" id={`offer-${k}-error`} role="alert" data-testid={`error-offer-${k}`}>{msg}</span> : null;
  return (
    <form className="short-offer" onSubmit={submit} noValidate data-testid="form-short-offer" aria-labelledby="short-offer-heading">
      <div className="short-offer-head">
        <span className="panel-kicker">02 — OFFER THIS BATCH</span>
        <h3 id="short-offer-heading">Five details. That’s it.</h3>
        <p>Material and photo findings are carried over from the scan above. Pickup address, schedule and transport costs come later, only if a demo buyer shows interest.</p>
      </div>
      <div className="carried" data-testid="text-offer-carried-material">
        <small>Carried from scan · read-only</small>
        <strong>{record.scan.wasteType}</strong>
        <span>{record.source === 'photo' ? 'Photo estimate' : 'Manual identification'} · {record.scan.confidence} confidence · quality unknown until checked</span>
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="offer-quantity">Available quantity (tonnes)</label>
          <input id="offer-quantity" className="field-input" inputMode="decimal" value={v.quantityTonnes} aria-invalid={!!errors.quantityTonnes} aria-describedby={errors.quantityTonnes ? 'offer-quantityTonnes-error' : undefined} onChange={e => set({ quantityTonnes: e.target.value })} placeholder="e.g. 12.5" data-testid="input-offer-quantity" />
          {err('quantityTonnes', errors.quantityTonnes)}
        </div>
        <div className="field">
          <label htmlFor="offer-price">Asking price (IDR per tonne)</label>
          <input id="offer-price" className="field-input" inputMode="numeric" value={v.askingPricePerTonneIdr} aria-invalid={!!errors.askingPricePerTonneIdr} aria-describedby={errors.askingPricePerTonneIdr ? 'offer-askingPricePerTonneIdr-error' : 'offer-price-hint'} onChange={e => set({ askingPricePerTonneIdr: e.target.value })} placeholder="e.g. 350000" data-testid="input-offer-price" />
          {errors.askingPricePerTonneIdr ? err('askingPricePerTonneIdr', errors.askingPricePerTonneIdr) : <span className="field-hint" id="offer-price-hint">Material only, excludes transport. 0 means free.</span>}
        </div>
        <div className="field">
          <label htmlFor="offer-province">Province</label>
          <select id="offer-province" className="field-input" value={v.province} aria-invalid={!!provErr} onChange={e => set({ province: e.target.value, city: '' })} data-testid="select-offer-province">
            <option value="">Choose province</option>
            {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {err('province', provErr)}
        </div>
        <div className="field">
          <label htmlFor="offer-city">City / regency</label>
          <select id="offer-city" className="field-input" value={v.city} disabled={!v.province} aria-invalid={!!cityErr} onChange={e => set({ city: e.target.value })} data-testid="select-offer-city">
            <option value="">{v.province ? 'Choose city' : 'Choose province first'}</option>
            {(PROVINCE_CITIES[v.province] ?? []).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {err('city', cityErr)}
        </div>
        <fieldset className="field span-2 logistics-choice">
          <legend>Logistics</legend>
          <div className="chip-radio" role="radiogroup">
            {LOGISTICS.map(o => (
              <label key={o.v} className={v.logistics === o.v ? 'on' : ''}>
                <input type="radio" name="offer-logistics" value={o.v} checked={v.logistics === o.v} onChange={() => set({ logistics: o.v })} data-testid={`radio-offer-logistics-${o.v}`} />
                {o.l}
              </label>
            ))}
          </div>
          {err('logistics', errors.logistics)}
        </fieldset>
        <div className="field span-2">
          <label htmlFor="offer-notes">Short notes (optional)</label>
          <textarea id="offer-notes" className="field-input" rows={2} maxLength={500} value={v.notes} onChange={e => set({ notes: e.target.value })} placeholder="Bagged, stored under cover, available after harvest…" data-testid="input-offer-notes" />
          {errors.notes ? err('notes', errors.notes) : <span className="field-hint">{v.notes.length}/500 · Do not include a private address.</span>}
        </div>
      </div>
      {(errors.record || errors.material) && <div className="status-message" role="alert" data-testid="status-offer-error"><CircleAlert size={14} /> {errors.record || errors.material}</div>}
      <p className="demo-line">Submitting saves this offer in this browser only. It does not contact any real buyer. Matches are FICTIONAL DEMO listings.</p>
      <button type="submit" className="button-primary" disabled={busy} data-testid="button-submit-offer" aria-label="Submit offer and see demo matches in Market"><Send size={15} /> Submit offer · see demo matches</button>
    </form>
  );
}
