import { useState } from 'react';
import { useBiomass } from '@/lib/biomass-state';
import { useTransactions } from '@/lib/transaction-state';
import { STATUS_LABELS } from '@/lib/transactions';

export function TransactionSelector() {
  const { state, updateImpact, updateSupply } = useBiomass();
  const { state: txState } = useTransactions();
  const [msg, setMsg] = useState('');
  const id = state.impact.transactionId ?? '';
  const tx = txState.transactions.find((t) => t.id === id);
  const d = tx?.draft;
  const importable = !!tx && ['received', 'completed'].includes(tx.status) && !!d?.actualCollectedTonnes.trim() && !!d?.actualReusedTonnes.trim();

  function importActuals() {
    if (!tx || !d || !importable) return;
    const s = tx.supply;
    updateSupply({ material: s.material, quantityTonnes: String(s.quantityTonnes), location: s.location, region: s.region, moisturePercent: s.moisturePercent === null ? '' : String(s.moisturePercent), quality: s.quality, qualityNotes: s.qualityNotes });
    updateImpact({ transactionId: tx.id, reportDate: d.receivedDate, collectedTonnes: d.actualCollectedTonnes, reusedTonnes: d.actualReusedTonnes, intendedUse: d.destinationUse, massBasis: 'unknown' });
    setMsg('Imported the record\'s supply snapshot and user-reported actual quantities. Mass basis reset to unknown: this record does not establish wet or dry weight. Generate the summary again.');
  }

  return (
    <div className="tx-selector" data-testid="transaction-selector">
      <div className="field">
        <label htmlFor="transactionId">Link a FICTIONAL DEMO transaction (optional)</label>
        <select className="field-input" id="transactionId" value={tx ? id : ''} onChange={(e) => { updateImpact({ transactionId: e.target.value }); setMsg(''); }} data-testid="select-transaction">
          <option value="">None</option>
          {txState.transactions.map((t) => <option key={t.id} value={t.id}>{t.buyerName} (FICTIONAL DEMO) · {STATUS_LABELS[t.status]} · {t.createdAt.slice(0, 10)}</option>)}
        </select>
        <span className="field-hint">Linking adds transaction details to the summary but does not change your quantities. Only the explicit import copies actual collected/reused entries.</span>
      </div>
      {id && !tx && <div className="status-message" role="alert" data-testid="status-transaction-missing">The linked demo record no longer exists. Choose another or none.</div>}
      {tx && (
        importable
          ? <button type="button" className="button-secondary" onClick={importActuals} data-testid="button-import-transaction">Import actual quantities from this record</button>
          : <p className="field-hint" data-testid="status-import-unavailable">Import needs a received or completed record with both actual collected and actual reused tonnes entered. Ordered, received or completed status is never treated as reuse.</p>
      )}
      {msg && <p className="confirm-box" role="status" data-testid="status-import-done">{msg}</p>}
    </div>
  );
}
