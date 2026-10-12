import { useState, type FormEvent } from 'react';
import { Check, CircleAlert, MapPin, Scale } from 'lucide-react';
import { useTransactions } from '@/lib/transaction-state';
import type { BuyerMatch, Supply } from '@/lib/biomass';
import type { OfferDraft } from '@/lib/transactions';

export function MatchCard({ match, supply, offerId, terms, locked }: { match: BuyerMatch; supply: Supply; offerId?: string; terms?: OfferDraft; locked?: boolean }) {
  const { createTransaction, state } = useTransactions();
  const { buyer } = match;
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const full = state.transactions.length >= 100;
  const msgId = `message-${buyer.id}`;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (full) { setError('Limit of 100 local demo records reached. Reset prototype data to add more.'); return; }
    const r = createTransaction(buyer.id, message, supply, offerId, terms);
    if (!r.ok) { setError(Object.values(r.errors).join(' ')); return; }
    setSent(true); setOpen(false); setMessage(''); setError('');
  }

  return (
    <article className="match-card" data-testid={`card-match-${buyer.id}`}>
      <div className="match-head">
        <span className="demo-badge">FICTIONAL DEMO</span>
        <span className={`fit-badge ${match.score === 2 && supply.quality !== 'contaminated' ? 'good' : ''}`} data-testid={`text-fit-${buyer.id}`}>
          {supply.quality === 'contaminated' ? 'Quality review required' : match.score === 2 ? 'Indicative fit' : 'Partial fit'}
        </span>
      </div>
      <h3>{buyer.name} <small>(FICTIONAL DEMO)</small></h3>
      <p className="match-industry">{buyer.industry} · {buyer.intendedUse}</p>
      <dl className="match-facts">
        <div><dt><MapPin size={12} /> Demo area</dt><dd>{buyer.regions.join(', ')}</dd></div>
        <div><dt><Scale size={12} /> Min lot / demand</dt><dd>{buyer.minimumTonnes} t / {buyer.demandTonnes} t</dd></div>
        <div><dt>Potential volume</dt><dd data-testid={`text-potential-${buyer.id}`}>{match.potentialTonnes.toLocaleString()} t (indicative)</dd></div>
      </dl>
      <ul className="match-reasons">
        {match.reasons.map((r, i) => {
          const neg = (i === 1 && !match.regionFits) || (i === 2 && !match.quantityFits) || i === 3;
          return <li key={r} className={neg ? 'neg' : ''}>{neg ? <CircleAlert size={13} /> : <Check size={13} />}{r}</li>;
        })}
      </ul>
      <p className="match-req"><strong>Requirements:</strong> {buyer.requirements}</p>
      <p className="match-req">Matching compares material, quantity and region only. Moisture, quality and safe use are not verified.</p>
      {supply.quality === 'contaminated' && (
        <div className="warning-callout" data-testid={`status-quality-warning-${buyer.id}`}>
          <CircleAlert size={16} />
          <span>Reported contamination: this match is not approval to use or dispatch the material. Identify and assess contaminants before proceeding.</span>
        </div>
      )}
      {sent && <div className="confirm-box" role="status" data-testid={`status-interest-recorded-${buyer.id}`}>FICTIONAL DEMO record created locally in this browser. Nothing was sent, no real sale exists. Continue it under linked demo transactions below.</div>}
      {open ? (
        <form onSubmit={submit} className="interest-form" noValidate>
          <label htmlFor={msgId}>Message for this demo listing</label>
          <textarea id={msgId} className="field-input" rows={3} value={message} maxLength={1200} aria-invalid={!!error} aria-describedby={error ? `${msgId}-error` : `${msgId}-hint`}
            onChange={(e) => { setMessage(e.target.value); setError(''); }} placeholder="Describe your material, timing and questions." data-testid={`input-interest-message-${buyer.id}`} />
          <span id={`${msgId}-hint`} className="field-hint">{message.trim().length}/1000 · saved locally only, not sent. Your offer terms are snapshotted.</span>
          {error && <span id={`${msgId}-error`} className="field-error" role="alert" data-testid={`error-interest-${buyer.id}`}>{error}</span>}
          <div className="interest-actions">
            <button type="submit" className="button-primary" data-testid={`button-submit-interest-${buyer.id}`}>Create local demo record</button>
            <button type="button" className="reset-button" onClick={() => { setOpen(false); setError(''); }} data-testid={`button-cancel-interest-${buyer.id}`}>Cancel</button>
          </div>
        </form>
      ) : (
        <button type="button" className="button-secondary" disabled={locked} aria-label={locked ? 'Batch already has an active demo transaction' : `Express interest to ${buyer.name}, fictional demo`} onClick={() => { setOpen(true); setSent(false); }} data-testid={`button-express-interest-${buyer.id}`}>Express interest (FICTIONAL DEMO)</button>
      )}
    </article>
  );
}
