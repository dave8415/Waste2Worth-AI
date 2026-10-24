import { useState } from 'react';
import { ArrowRight, Ban } from 'lucide-react';
import { useTransactions } from '@/lib/transaction-state';
import { USES, materialLabel, type IntendedUse } from '@/lib/biomass';
import { STATUSES, STATUS_LABELS, editableFields, nextStatus, type DemoTransaction, type TransactionDraft } from '@/lib/transactions';
import { OfferFields } from '@/components/offer-fields';
import { BuyerPreview } from '@/components/buyer-preview';
import { EvidencePanel } from '@/components/evidence-panel';

const ACTION: Record<string, string> = {
  quote_requested: 'Request quote', agreed: 'Record simulated agreement', scheduled: 'Confirm schedule',
  received: 'Record receipt', completed: 'Mark demo completed',
};
const FLOW = STATUSES.filter((s) => s !== 'cancelled');

function ReuseUpdate({ tx }: { tx: DemoTransaction }) {
  const { recordReuse } = useTransactions();
  const [collected, setCollected] = useState(tx.draft.actualCollectedTonnes);
  const [reused, setReused] = useState(tx.draft.actualReusedTonnes);
  const [use, setUse] = useState(tx.draft.destinationUse);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const tid = tx.id;
  return <form className="tx-block" onSubmit={e => {
    e.preventDefault();
    const result = recordReuse(tid, { actualCollectedTonnes: collected, actualReusedTonnes: reused, destinationUse: use });
    setError(!result.ok);
    setMessage(result.ok ? 'Actual reuse saved. Linked reports now use these quantities; regenerate any outdated snapshot.' : Object.values(result.errors).join(' '));
  }} data-testid={`form-record-reuse-${tid}`}>
    <h4>Record actual reuse after receipt</h4>
    <p className="field-hint">Completion does not mean reuse. Update only known collected/reused quantities on a consistent weighing basis. This does not reopen terms or change received weight.</p>
    <div className="field">
      <label htmlFor={`reuse-collected-${tid}`}>Actual collected (tonnes)</label>
      <input id={`reuse-collected-${tid}`} className="field-input" inputMode="decimal" value={collected} onChange={e => { setCollected(e.target.value); setMessage(''); }} data-testid={`input-reuse-collected-${tid}`} />
    </div>
    <div className="field">
      <label htmlFor={`reuse-quantity-${tid}`}>Actual reused (tonnes)</label>
      <input id={`reuse-quantity-${tid}`} className="field-input" inputMode="decimal" placeholder="Unknown until entered; 0 means none" value={reused} onChange={e => { setReused(e.target.value); setMessage(''); }} data-testid={`input-reuse-quantity-${tid}`} />
    </div>
    <div className="field">
      <label htmlFor={`reuse-use-${tid}`}>Recorded destination use</label>
      <select id={`reuse-use-${tid}`} className="field-input" value={use} onChange={e => { setUse(e.target.value as IntendedUse); setMessage(''); }} data-testid={`select-reuse-use-${tid}`}>
        {USES.map(u => <option key={u} value={u}>{u}</option>)}
      </select>
    </div>
    <button type="submit" className="button-secondary" data-testid={`button-save-reuse-${tid}`}>Save actual reuse</button>
    {message && <p className={error ? 'field-error' : 'field-hint'} role={error ? 'alert' : 'status'} data-testid={`status-reuse-${tid}`}>{message}</p>}
  </form>;
}

export function TransactionCard({ tx }: { tx: DemoTransaction }) {
  const { updateDraft, advance } = useTransactions();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const d = tx.draft;
  const allowed = editableFields(tx.status);
  const can = (k: keyof TransactionDraft) => allowed.includes(k);
  const terminal = tx.status === 'completed' || tx.status === 'cancelled';
  const preAgree = tx.status === 'interested' || tx.status === 'quote_requested';
  const next = nextStatus(tx.status);
  const tid = tx.id;

  const set = (patch: Partial<TransactionDraft>) => { updateDraft(tid, patch); setErrors({}); };
  const go = (target: Parameters<typeof advance>[1]) => {
    const r = advance(tid, target);
    setErrors(r.ok ? {} : r.errors);
  };
  const err = (k: string) => errors[k] && <span className="field-error" role="alert" data-testid={`error-tx-${k}-${tid}`}>{errors[k]}</span>;
  const inp = (k: keyof TransactionDraft, label: string, props: Record<string, unknown> = {}, hint?: string) => (
    <div className="field">
      <label htmlFor={`${tid}-${k}`}>{label}</label>
      <input className="field-input" id={`${tid}-${k}`} disabled={!can(k)} aria-invalid={!!errors[k]} value={d[k] as string}
        onChange={(e) => set({ [k]: e.target.value } as Partial<TransactionDraft>)} data-testid={`input-tx-${k}-${tid}`} {...props} />
      {hint && !errors[k] && <span className="field-hint">{hint}</span>}
      {err(k)}
    </div>
  );
  const reachedIdx = FLOW.indexOf(tx.status as typeof FLOW[number]);

  return (
    <article className={`tx-card status-${tx.status}`} data-testid={`card-transaction-${tid}`}>
      <header className="tx-head">
        <div>
          <span className="demo-badge">FICTIONAL DEMO</span>
          <h3>{tx.buyerName} <small>(FICTIONAL DEMO)</small></h3>
          <p className="field-hint">{materialLabel(tx.supply.material)} · {tx.supply.quantityTonnes} t snapshot · {tx.supply.location}, {tx.supply.region} · created {new Date(tx.createdAt).toLocaleString()}</p>
        </div>
        <span className="tx-status" data-testid={`status-transaction-${tid}`}>{STATUS_LABELS[tx.status]}</span>
      </header>

      <ol className="tx-steps" aria-label="Progress">
        {FLOW.map((s, i) => <li key={s} className={tx.status === 'cancelled' ? '' : i < reachedIdx ? 'done' : i === reachedIdx ? 'now' : ''}>{STATUS_LABELS[s]}</li>)}
      </ol>

      <p className="tx-msg">"{tx.message}"</p>
      <p className="field-hint">Supply and offer are a snapshot; later supply edits do not change this record. No inventory is reserved and nothing was sent.</p>

      <button type="button" className="reset-button" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid={`button-toggle-transaction-${tid}`}>{open ? 'Hide details' : 'Open record'}</button>

      {open && (
        <div className="tx-body">
          <section className="tx-block" data-testid={`terms-${tid}`}>
            <h4>Supplier view · offer and quote terms {preAgree ? '' : tx.history.some(step => step.status === 'agreed') ? '(agreed, read-only)' : '(cancelled draft, read-only)'}</h4>
            <OfferFields idPrefix={`tx-${tid}`} value={d} onChange={set} errors={errors} disabled={!preAgree} showPrivate={preAgree} />
            {!preAgree && <p className="field-hint">Private pickup fields are omitted here. Buyer preview follows the simulated agreement rule.</p>}
            <div className="form-grid">
              {inp('orderedTonnes', 'Ordered quantity (tonnes)', { inputMode: 'decimal' }, 'At least the minimum; at most the snapshot quantity.')}
              {inp('agreedPricePerTonneIdr', 'Agreed price — IDR per tonne', { inputMode: 'numeric' }, '0 is explicitly free. Excludes transport.')}
            </div>
            <div className="consent-row">
              <label><input type="checkbox" disabled={!can('supplierAgreed')} checked={d.supplierAgreed} onChange={(e) => set({ supplierAgreed: e.target.checked })} data-testid={`checkbox-supplier-agreed-${tid}`} /> Supplier agrees (simulated)</label>
              <label><input type="checkbox" disabled={!can('buyerAgreed')} checked={d.buyerAgreed} onChange={(e) => set({ buyerAgreed: e.target.checked })} data-testid={`checkbox-buyer-agreed-${tid}`} /> FICTIONAL DEMO buyer agrees (simulated)</label>
            </div>
            <p className="field-hint">Editing any term clears both consents. No real company is contacted.</p>
            {err('agreement')}
          </section>

          <BuyerPreview tx={tx} />

          {(tx.status === 'agreed' || d.scheduledDate) && (
            <section className="tx-block">
              <h4>Schedule</h4>
              {inp('scheduledDate', 'Pickup / delivery date', { type: 'date' }, `Within ${d.deliveryWindowStart || '?'} to ${d.deliveryWindowEnd || '?'}, on/after ${d.readyDate || '?'}.`)}
            </section>
          )}

          {(tx.status === 'scheduled' || tx.history.some(step => step.status === 'received')) && (
            <section className="tx-block" data-testid={`receipt-form-${tid}`}>
              <h4>Receipt (user-reported, unverified)</h4>
              <div className="form-grid">
                {inp('receivedDate', 'Received date', { type: 'date' })}
                {inp('receivedTonnes', 'Received weight (tonnes)', { inputMode: 'decimal' })}
                {inp('actualCollectedTonnes', 'Actual collected (tonnes, optional)', { inputMode: 'decimal', placeholder: 'Unknown' }, 'Blank = unknown. Not copied from order.')}
                {inp('actualReusedTonnes', 'Actual reused (tonnes, optional)', { inputMode: 'decimal', placeholder: 'Unknown' }, 'At most collected and received.')}
                <div className="field">
                  <label htmlFor={`${tid}-destinationUse`}>Destination use</label>
                  <select className="field-input" id={`${tid}-destinationUse`} disabled={!can('destinationUse')} value={d.destinationUse} onChange={(e) => set({ destinationUse: e.target.value as IntendedUse })} data-testid={`select-tx-destinationUse-${tid}`}>
                    {USES.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>{err('destinationUse')}
                </div>
                <div className="field">
                  <label htmlFor={`${tid}-qualityCheck`}>Quality check (not lab verification)</label>
                  <select className="field-input" id={`${tid}-qualityCheck`} disabled={!can('qualityCheck')} value={d.qualityCheck} onChange={(e) => set({ qualityCheck: e.target.value as TransactionDraft['qualityCheck'] })} data-testid={`select-tx-qualityCheck-${tid}`}>
                    <option value="pending">Pending</option><option value="accepted">Accepted</option><option value="conditional">Conditional</option><option value="rejected">Rejected</option>
                  </select>{err('qualityCheck')}
                </div>
                {inp('actualTransportCostIdr', 'Actual transport cost — IDR total (optional)', { inputMode: 'numeric', placeholder: 'Unknown' })}
                <div className="field span-2">
                  <label htmlFor={`${tid}-receiptNotes`}>Receipt notes</label>
                  <textarea className="field-input" rows={2} id={`${tid}-receiptNotes`} disabled={!can('receiptNotes')} value={d.receiptNotes} onChange={(e) => set({ receiptNotes: e.target.value })} data-testid={`input-tx-receiptNotes-${tid}`} />
                  {err('receiptNotes')}
                </div>
                <label className="consent-row span-2"><input type="checkbox" disabled={!can('varianceAcknowledged')} checked={d.varianceAcknowledged} onChange={(e) => set({ varianceAcknowledged: e.target.checked })} data-testid={`checkbox-variance-${tid}`} /> I acknowledge received weight exceeds the order (explain in notes)</label>
                {err('varianceAcknowledged')}
              </div>
            </section>
          )}

          <EvidencePanel tx={tx} />

          <section className="tx-block">
            <h4>Status history</h4>
            <ul className="tx-history" data-testid={`list-history-${tid}`}>
              {tx.history.map((h, i) => <li key={i}><strong>{STATUS_LABELS[h.status]}</strong><time dateTime={h.at}>{new Date(h.at).toLocaleString()}</time></li>)}
            </ul>
            {tx.status === 'cancelled' && <p className="field-hint">Reason: {d.cancellationReason}</p>}
          </section>
        </div>
      )}

      {err('status')}
      {(tx.status === 'received' || tx.status === 'completed') && <ReuseUpdate key={tid} tx={tx} />}
      {Object.keys(errors).length > 0 && <div className="status-message" role="alert" data-testid={`status-tx-errors-${tid}`}>{Object.values(errors).join(' ')}</div>}

      {!terminal ? (
        <div className="tx-actions">
          {next && <button type="button" className="button-primary" onClick={() => { setOpen(true); go(next); }} data-testid={`button-advance-${tid}`}>{ACTION[next]} <ArrowRight size={14} /></button>}
          <div className="cancel-row">
            <input className="field-input" placeholder="Cancellation reason (5+ characters)" value={d.cancellationReason} aria-label="Cancellation reason" onChange={(e) => set({ cancellationReason: e.target.value })} data-testid={`input-cancel-reason-${tid}`} />
            <button type="button" className="button-secondary" onClick={() => go('cancelled')} data-testid={`button-cancel-transaction-${tid}`}><Ban size={13} /> Cancel demo</button>
          </div>
        </div>
      ) : <p className="muted-line" data-testid={`status-terminal-${tid}`}>{STATUS_LABELS[tx.status]} — {tx.status === 'completed' ? 'terms and receipt locked; actual reuse may be updated separately.' : 'read-only.'} No real sale, delivery or quality confirmation.</p>}
    </article>
  );
}
