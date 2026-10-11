import { useState } from 'react';
import { CircleAlert, HardDrive } from 'lucide-react';
import { useBiomass } from '@/lib/biomass-state';

export function StorageNotice() {
  const { storageWarning, resetPrototype } = useBiomass();
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState(false);
  return (
    <aside className="storage-notice" aria-label="Browser storage" data-testid="storage-notice">
      <div className="storage-copy">
        <HardDrive size={15} />
        <span>Entries stay in this browser only (local storage). Nothing is saved to a server or shared with anyone.</span>
      </div>
      {storageWarning && <div className="storage-warning" role="alert" data-testid="status-storage-warning"><CircleAlert size={14} /> {storageWarning}</div>}
      {cleared && <span className="storage-ok" role="status" data-testid="status-reset-done">Local prototype entries deleted.</span>}
      {confirming ? (
        <div className="reset-confirm" role="group" aria-label="Confirm reset">
          <span>Delete all local supply, interest and impact entries?</span>
          <button type="button" className="button-danger" onClick={() => { resetPrototype(); setConfirming(false); setCleared(true); }} data-testid="button-confirm-reset">Yes, delete</button>
          <button type="button" className="reset-button" onClick={() => setConfirming(false)} data-testid="button-cancel-reset">Cancel</button>
        </div>
      ) : (
        <button type="button" className="reset-button" onClick={() => { setConfirming(true); setCleared(false); }} data-testid="button-reset-prototype">Reset prototype data</button>
      )}
    </aside>
  );
}
