import { useState } from 'react';
import { CircleAlert, HardDrive } from 'lucide-react';
import { useBiomass } from '@/lib/biomass-state';
import { useTransactions } from '@/lib/transaction-state';
import { useJourney } from '@/lib/journey-state';

export function StorageNotice() {
  const { storageWarning, resetPrototype } = useBiomass();
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState(false);
  const { storageWarning: txWarning, resetTransactions } = useTransactions();
  const [busy, setBusy] = useState(false);
  const { storageWarning: journeyWarning, resetJourney } = useJourney();
  const [resetError, setResetError] = useState('');
  async function reset() {
    setBusy(true); setResetError('');
    try { await resetTransactions(); resetPrototype(); resetJourney(); setConfirming(false); setCleared(true); }
    catch (e) { setResetError(`Reset failed: ${e instanceof Error ? e.message : 'unknown error'}. Some local data may remain.`); }
    finally { setBusy(false); }
  }
  return (
    <aside className="storage-notice" aria-label="Browser storage" data-testid="storage-notice">
      <div className="storage-copy">
        <HardDrive size={15} />
        <span>Material records, offers, reports, demo transactions and attachments stay in this browser only (localStorage and IndexedDB). Nothing is uploaded, saved to a server or shared.</span>
      </div>
      {storageWarning && <div className="storage-warning" role="alert" data-testid="status-storage-warning"><CircleAlert size={14} /> {storageWarning}</div>}
      {journeyWarning && <div className="storage-warning" role="alert" data-testid="status-journey-storage-warning"><CircleAlert size={14} /> {journeyWarning}</div>}
      {txWarning && <div className="storage-warning" role="alert" data-testid="status-transaction-storage-warning"><CircleAlert size={14} /> {txWarning}</div>}
      {resetError && <div className="storage-warning" role="alert" data-testid="status-reset-error"><CircleAlert size={14} /> {resetError}</div>}
      {cleared && <span className="storage-ok" role="status" data-testid="status-reset-done">Local prototype entries deleted.</span>}
      {confirming ? (
        <div className="reset-confirm" role="group" aria-label="Confirm reset">
          <span>Delete all local material records, offers, reports, supply, interest, transaction, attachment and impact entries?</span>
          <button type="button" className="button-danger" disabled={busy} onClick={reset} data-testid="button-confirm-reset">Yes, delete</button>
          <button type="button" className="reset-button" onClick={() => setConfirming(false)} data-testid="button-cancel-reset">Cancel</button>
        </div>
      ) : (
        <button type="button" className="reset-button" onClick={() => { setConfirming(true); setCleared(false); }} data-testid="button-reset-prototype">Reset prototype data</button>
      )}
    </aside>
  );
}
