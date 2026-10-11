import { Lock, Unlock } from 'lucide-react';
import { pickupForBuyer, type DemoTransaction } from '@/lib/transactions';

export function BuyerPreview({ tx }: { tx: DemoTransaction }) {
  const p = pickupForBuyer(tx);
  const unlocked = p.released;
  return (
    <section className="tx-block buyer-preview" data-testid={`privacy-preview-${tx.id}`}>
      <h4>{unlocked ? <Unlock size={13} /> : <Lock size={13} />} Buyer preview (simulated)</h4>
      <dl className="tx-dl">
        <div><dt>Pickup area</dt><dd data-testid={`text-preview-area-${tx.id}`}>{p.area || 'Not set'}</dd></div>
        <div><dt>Address</dt><dd data-testid={`text-preview-address-${tx.id}`}>{p.address ?? (unlocked ? 'Not provided' : 'Locked — private until both parties agree and terms are agreed')}</dd></div>
        <div><dt>Pin</dt><dd data-testid={`text-preview-pin-${tx.id}`}>{p.pin ?? (unlocked ? 'Not provided' : 'Locked')}</dd></div>
      </dl>
      <p className="field-hint">Local prototype only: this preview is not production security or access control, and no real two-party agreement exists.</p>
    </section>
  );
}
