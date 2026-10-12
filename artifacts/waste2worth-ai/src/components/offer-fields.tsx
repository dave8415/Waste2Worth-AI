import type { ReactNode } from 'react';
import type { OfferDraft } from '@/lib/transactions';

type Props = {
  value: OfferDraft;
  onChange: (patch: Partial<OfferDraft>) => void;
  errors?: Record<string, string>;
  idPrefix: string;
  disabled?: boolean;
  showPrivate?: boolean;
};

export function OfferFields({ value: v, onChange, errors = {}, idPrefix, disabled, showPrivate = true }: Props) {
  const id = (k: string) => `${idPrefix}-${k}`;
  const F = ({ k, label, hint, children, wide }: { k: keyof OfferDraft; label: string; hint?: string; children: ReactNode; wide?: boolean }) => (
    <div className={`field${wide ? ' span-2' : ''}`}>
      <label htmlFor={id(k)}>{label}</label>
      {children}
      {hint && !errors[k] && <span className="field-hint">{hint}</span>}
      {errors[k] && <span className="field-error" role="alert" data-testid={`error-${idPrefix}-${k}`}>{errors[k]}</span>}
    </div>
  );
  const text = (k: keyof OfferDraft, props: Record<string, unknown> = {}) => (
    <input className="field-input" id={id(k)} disabled={disabled} aria-invalid={!!errors[k]} value={v[k] as string}
      onChange={(e) => onChange({ [k]: e.target.value } as Partial<OfferDraft>)} data-testid={`input-${idPrefix}-${k}`} {...props} />
  );
  return (
    <fieldset className="offer-fields" disabled={disabled} data-testid={`offer-fields-${idPrefix}`}>
      <div className="form-grid">
        {F({ k: 'village', label: 'Village / kelurahan (optional)', hint: 'Shown as the general pickup area.', children: text('village', { maxLength: 160 }) })}
        {showPrivate && F({ k: 'pickupPin', label: 'Pickup pin (latitude, longitude)', hint: 'Private until both simulated parties agree. Not a verified site.', children: text('pickupPin', { placeholder: '-6.91, 107.61' }) })}
        {showPrivate && F({ k: 'privatePickupAddress', label: 'Private pickup address', wide: true, hint: 'Supplier view only. Hidden from the buyer preview until agreement.', children: (
          <textarea className="field-input" rows={2} id={id('privatePickupAddress')} disabled={disabled} value={v.privatePickupAddress} maxLength={1000}
            onChange={(e) => onChange({ privatePickupAddress: e.target.value })} data-testid={`input-${idPrefix}-privatePickupAddress`} />) })}
        {F({ k: 'logistics', label: 'Logistics', children: (
          <select className="field-input" id={id('logistics')} disabled={disabled} value={v.logistics} onChange={(e) => onChange({ logistics: e.target.value as OfferDraft['logistics'] })} data-testid={`select-${idPrefix}-logistics`}>
            <option value="buyer-pickup">Buyer picks up</option><option value="supplier-delivery">Supplier delivers</option><option value="third-party">Third-party transport</option><option value="to-be-agreed">To be agreed (must be resolved before agreement)</option>
          </select>) })}
        {F({ k: 'transportPayer', label: 'Transport paid by', children: (
          <select className="field-input" id={id('transportPayer')} disabled={disabled} value={v.transportPayer} onChange={(e) => onChange({ transportPayer: e.target.value as OfferDraft['transportPayer'] })} data-testid={`select-${idPrefix}-transportPayer`}>
            <option value="unknown">Unknown / not agreed</option><option value="buyer">Buyer</option><option value="supplier">Supplier</option><option value="shared">Shared</option>
          </select>) })}
        {F({ k: 'estimatedTransportCostIdr', label: 'Estimated transport cost — IDR total for the trip', hint: 'Whole-trip total, not per tonne. 0 = free; blank = unknown.', children: text('estimatedTransportCostIdr', { inputMode: 'numeric', placeholder: 'Unknown' }) })}
        {F({ k: 'askingPricePerTonneIdr', label: 'Asking material price — IDR per tonne', hint: 'Per tonne of material, excludes transport. 0 = free; blank = unknown.', children: text('askingPricePerTonneIdr', { inputMode: 'numeric', placeholder: 'Unknown' }) })}
        {F({ k: 'pricing', label: 'Pricing', children: (
          <select className="field-input" id={id('pricing')} disabled={disabled} value={v.pricing} onChange={(e) => onChange({ pricing: e.target.value as OfferDraft['pricing'] })} data-testid={`select-${idPrefix}-pricing`}>
            <option value="negotiable">Negotiable</option><option value="fixed">Fixed (agreed price must match)</option>
          </select>) })}
        {F({ k: 'minimumOrderTonnes', label: 'Minimum order (tonnes)', hint: 'Cannot exceed available quantity.', children: text('minimumOrderTonnes', { inputMode: 'decimal', placeholder: 'None set' }) })}
        {F({ k: 'readyDate', label: 'Material ready date', children: text('readyDate', { type: 'date' }) })}
        {F({ k: 'deliveryWindowStart', label: 'Delivery window start', children: text('deliveryWindowStart', { type: 'date' }) })}
        {F({ k: 'deliveryWindowEnd', label: 'Delivery window end', children: text('deliveryWindowEnd', { type: 'date' }) })}
        {F({ k: 'loadingNeeds', label: 'Loading needs', hint: "Equipment, labour, or 'None'.", children: text('loadingNeeds', { maxLength: 1000 }) })}
        {F({ k: 'unloadingNeeds', label: 'Unloading needs', hint: "At destination, or 'None'.", children: text('unloadingNeeds', { maxLength: 1000 }) })}
      </div>
    </fieldset>
  );
}
