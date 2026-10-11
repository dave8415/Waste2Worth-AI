import { useState, type FormEvent } from 'react';
import { CircleAlert } from 'lucide-react';
import { useBiomass } from '@/lib/biomass-state';
import { MATERIALS, REGIONS, parseSupply, type MaterialId, type Quality } from '@/lib/biomass';

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <span className="field-hint" id={`${id}-hint`}>{hint}</span>}
      {error && <span className="field-error" id={`${id}-error`} role="alert" data-testid={`error-${id}`}>{error}</span>}
    </div>
  );
}

export function SupplyForm({ onValid }: { onValid?: () => void }) {
  const { state, updateSupply } = useBiomass();
  const s = state.supply;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    const r = parseSupply(s);
    setChecked(true);
    setErrors(r.ok ? {} : r.errors);
    if (r.ok) onValid?.();
  }
  const aria = (id: string) => ({ id, 'aria-invalid': !!errors[id], 'aria-describedby': errors[id] ? `${id}-error` : undefined });
  const set = (patch: Parameters<typeof updateSupply>[0], key: string) => {
    updateSupply(patch);
    if (errors[key]) setErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  };

  return (
    <form className="supply-form" onSubmit={submit} noValidate data-testid="form-supply">
      {state.identifiedWasteType && (
        <p className="identified-note" data-testid="text-identified-waste">Photo suggested: <strong>{state.identifiedWasteType}</strong>. Check the material below; the photo match is not confirmed.</p>
      )}
      <div className="form-grid">
        <Field id="material" label="Material" error={errors.material}>
          <select className="field-input" {...aria('material')} value={s.material} onChange={(e) => set({ material: e.target.value as MaterialId | '' }, 'material')} data-testid="select-material">
            <option value="">Choose material</option>
            {MATERIALS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </Field>
        <Field id="quantityTonnes" label="Available quantity (tonnes)" hint="Your estimate of stock on hand." error={errors.quantityTonnes}>
          <input className="field-input" {...aria('quantityTonnes')} inputMode="decimal" value={s.quantityTonnes} onChange={(e) => set({ quantityTonnes: e.target.value }, 'quantityTonnes')} placeholder="e.g. 3.5" data-testid="input-quantity" />
        </Field>
        <Field id="location" label="City or locality" error={errors.location}>
          <input className="field-input" {...aria('location')} maxLength={200} value={s.location} onChange={(e) => set({ location: e.target.value }, 'location')} placeholder="e.g. Karawang" data-testid="input-location" />
        </Field>
        <Field id="region" label="Region (demo service area)" hint="Used only for demo matching rules." error={errors.region}>
          <select className="field-input" {...aria('region')} value={s.region} onChange={(e) => set({ region: e.target.value }, 'region')} data-testid="select-region">
            <option value="">Choose region</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field id="moisturePercent" label="Moisture % (optional)" hint="Only if measured. Leave blank if unknown." error={errors.moisturePercent}>
          <input className="field-input" {...aria('moisturePercent')} inputMode="decimal" value={s.moisturePercent} onChange={(e) => set({ moisturePercent: e.target.value }, 'moisturePercent')} placeholder="Unknown" data-testid="input-moisture" />
        </Field>
        <Field id="quality" label="Reported quality">
          <select className="field-input" id="quality" value={s.quality} onChange={(e) => set({ quality: e.target.value as Quality }, 'quality')} data-testid="select-quality">
            <option value="unknown">Unknown</option>
            <option value="clean">Looks clean</option>
            <option value="mixed">Mixed materials</option>
            <option value="contaminated">Contaminated</option>
          </select>
        </Field>
        <div className="span-2">
          <Field id="qualityNotes" label="Quality notes (optional)" hint={`${s.qualityNotes.length}/1000`} error={errors.qualityNotes}>
            <textarea className="field-input" rows={3} {...aria('qualityNotes')} value={s.qualityNotes} onChange={(e) => set({ qualityNotes: e.target.value }, 'qualityNotes')} placeholder="Storage, mixing, visible soil or plastic..." data-testid="input-quality-notes" />
          </Field>
        </div>
      </div>
      {checked && Object.keys(errors).length > 0 && (
        <div className="status-message" role="alert" data-testid="status-supply-invalid"><CircleAlert size={13} /> Check the highlighted fields.</div>
      )}
      <button type="submit" className="button-primary" data-testid="button-save-supply">Check supply and find demo matches</button>
    </form>
  );
}
