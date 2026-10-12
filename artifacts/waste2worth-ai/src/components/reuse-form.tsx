import { useState, type FormEvent } from 'react';
import { Recycle } from 'lucide-react';
import { useTransactions } from '@/lib/transaction-state';
import { USES } from '@/lib/biomass';
import type { DemoTransaction, TransactionDraft } from '@/lib/transactions';

export function ReuseForm({ tx }: { tx: DemoTransaction }) {
  const { recordReuse } = useTransactions();
  const [v, setV] = useState({ actualCollectedTonnes: tx.draft.actualCollectedTonnes, actualReusedTonnes: tx.draft.actualReusedTonnes, destinationUse: tx.draft.destinationUse });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const p = `reuse-${tx.id}`;
  function submit(e: FormEvent) {
    e.preventDefault();
    const r = recordReuse(tx.id, v);
    if (!r.ok) { setErrors(r.errors); setSaved(false); return; }
    setErrors({}); setSaved(true);
  }
  const set = (patch: Partial<typeof v>) => { setV(x => ({ ...x, ...patch })); setSaved(false); };
  const err = (k: string) => errors[k] && <span className="field-error" role="alert" data-testid={`error-${p}-${k}`}>{errors[k]}</span>;
  return (
    <form className="reuse-form" onSubmit={submit} noValidate data-testid={`form-${p}`} aria-label="Record actual reuse for this received batch">
      <span className="panel-kicker"><Recycle size={12} /> RECORD ACTUAL REUSE · LATER IS FINE</span>
      <p className="panel-copy">Received weight stays fixed at {tx.draft.receivedTonnes || 'unknown'} t. Enter only what you confirmed. Blank stays unknown; type 0 if nothing was reused.</p>
      <div className="form-grid">
        <div className="field"><label htmlFor={`${p}-c`}>Actually collected (t)</label>
          <input id={`${p}-c`} className="field-input" inputMode="decimal" value={v.actualCollectedTonnes} aria-invalid={!!errors.actualCollectedTonnes} onChange={e => set({ actualCollectedTonnes: e.target.value })} data-testid={`input-${p}-collected`} />{err('actualCollectedTonnes')}</div>
        <div className="field"><label htmlFor={`${p}-r`}>Actually reused (t)</label>
          <input id={`${p}-r`} className="field-input" inputMode="decimal" value={v.actualReusedTonnes} aria-invalid={!!errors.actualReusedTonnes} onChange={e => set({ actualReusedTonnes: e.target.value })} data-testid={`input-${p}-reused`} />{err('actualReusedTonnes')}</div>
        <div className="field span-2"><label htmlFor={`${p}-u`}>Destination use</label>
          <select id={`${p}-u`} className="field-input" value={v.destinationUse} onChange={e => set({ destinationUse: e.target.value as TransactionDraft['destinationUse'] })} data-testid={`select-${p}-use`}>
            {USES.map(u => <option key={u} value={u}>{u}</option>)}
          </select>{err('destinationUse')}</div>
      </div>
      {Object.entries(errors).filter(([k]) => !['actualCollectedTonnes', 'actualReusedTonnes', 'destinationUse'].includes(k)).map(([k, m]) => <div key={k} className="status-message" role="alert">{m}</div>)}
      {saved && <div className="confirm-box" role="status" data-testid={`status-${p}-saved`}>Saved locally as user-reported. Update the linked report to include it.</div>}
      <button type="submit" className="button-secondary" data-testid={`button-save-${p}`}>Save reuse record</button>
    </form>
  );
}
