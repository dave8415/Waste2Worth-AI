import { useState } from 'react';
import { CircleAlert, HardDrive } from 'lucide-react';
import { useBiomass } from '@/lib/biomass-state';
import { useTransactions } from '@/lib/transaction-state';
import { useJourney } from '@/lib/journey-state';

export function StorageNotice({ allowReset = false }: { allowReset?: boolean }) {
  const { storageWarning, resetPrototype } = useBiomass();
  const { storageWarning: txWarning, resetTransactions } = useTransactions();
  const { storageWarning: journeyWarning, resetJourney } = useJourney();
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetError, setResetError] = useState('');
  const warning = journeyWarning || storageWarning || txWarning;
  async function reset() {
    setBusy(true); setResetError('');
    try { await resetTransactions(); resetPrototype(); resetJourney(); setConfirming(false); setCleared(true); }
    catch { setResetError('Some saved records could not be cleared. Please try again.'); }
    finally { setBusy(false); }
  }
  return (
    <aside className="storage-notice" aria-label="Where your records are kept" data-testid="storage-notice">
      <div className="storage-copy">
        <HardDrive size={15} />
        <span>Your records stay on this device. Scan photos are kept only until you close or reload the page. Download reports you want to keep.</span>
      </div>
      {warning && <div className="storage-warning" role="alert" data-testid="status-storage-warning"><CircleAlert size={14} /> Records may not be saved on this device. Download your report before leaving.</div>}
      {allowReset && (
        <details className="advanced-reset">
          <summary data-testid="toggle-advanced">Advanced</summary>
          {resetError && <div className="storage-warning" role="alert" data-testid="status-reset-error"><CircleAlert size={14} /> {resetError}</div>}
          {cleared && <span className="storage-ok" role="status" data-testid="status-reset-done">All records on this device were cleared.</span>}
          {confirming ? (
            <div className="reset-confirm" role="group" aria-label="Confirm clearing records">
              <span>Clear all scans, offers and reports from this device? This cannot be undone.</span>
              <button type="button" className="button-danger" disabled={busy} onClick={reset} data-testid="button-confirm-reset">Yes, clear</button>
              <button type="button" className="reset-button" onClick={() => setConfirming(false)} data-testid="button-cancel-reset">Cancel</button>
            </div>
          ) : (
            <button type="button" className="reset-button" onClick={() => { setConfirming(true); setCleared(false); }} data-testid="button-reset-prototype">Clear records on this device</button>
          )}
        </details>
      )}
    </aside>
  );
}
