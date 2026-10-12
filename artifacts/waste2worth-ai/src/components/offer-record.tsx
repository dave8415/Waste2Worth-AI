import { useMemo } from 'react';
import { Link } from 'wouter';
import { SearchX } from 'lucide-react';
import { useTransactions } from '@/lib/transaction-state';
import { exploreUses, findMatches, materialLabel } from '@/lib/biomass';
import { relatedTransactions, type MaterialRecord } from '@/lib/journey';
import { STATUS_LABELS } from '@/lib/transactions';
import { MatchCard } from './match-card';
import { TransactionCard } from './transaction-card';
import { ScanSummary } from './scan-summary';
import { ConnectedReport } from './connected-report';
import { ReuseForm } from './reuse-form';

const LOG: Record<string, string> = { 'buyer-pickup': 'Buyer pickup', 'supplier-delivery': 'Supplier delivers', 'third-party': 'Third-party transport', 'to-be-agreed': 'To be agreed' };
export const logisticsLabel = (l: string) => LOG[l] ?? l;

export function offerStatus(record: MaterialRecord, txs: ReturnType<typeof relatedTransactions>) {
  if (!record.offer) return 'Scanned, not offered';
  const live = txs.find(t => t.status !== 'cancelled');
  if (live) return `Demo: ${STATUS_LABELS[live.status]}`;
  return 'Offered · awaiting demo interest';
}

export function OfferRecord({ record }: { record: MaterialRecord }) {
  const { state } = useTransactions();
  const offer = record.offer!;
  const linked = useMemo(() => relatedTransactions(record, state.transactions), [record, state.transactions]);
  const matches = useMemo(() => findMatches(offer.supply), [offer.supply]);
  const routes = useMemo(() => exploreUses(offer.supply), [offer.supply]);
  const reserved = linked.some(t => t.status !== 'cancelled');
  return (
    <article className="offer-record" data-testid={`card-offer-${record.id}`}>
      <header className="offer-record-head">
        <div>
          <span className="panel-kicker">OFFER · {record.id.slice(0, 8).toUpperCase()}</span>
          <h2 className="panel-title">{offer.supply.quantityTonnes} t · {record.scan.wasteType}</h2>
          <p className="panel-copy">{offer.supply.location}, {offer.supply.region} · IDR {Number(offer.terms.askingPricePerTonneIdr).toLocaleString('id-ID')} / t · {logisticsLabel(offer.terms.logistics)}</p>
        </div>
        <span className="status-pill" data-testid={`status-offer-${record.id}`}>{offerStatus(record, linked)}</span>
      </header>
      <dl className="offer-facts">
        <div><dt>Matching category</dt><dd>{materialLabel(offer.supply.material)}</dd></div>
        <div><dt>Submitted</dt><dd>{new Date(offer.submittedAt).toLocaleString()}</dd></div>
        <div><dt>Quality</dt><dd>Unknown until checked</dd></div>
        <div><dt>Notes</dt><dd>{offer.notes || 'None'}</dd></div>
      </dl>
      <details className="fold">
        <summary data-testid={`toggle-offer-scan-${record.id}`}>Original scan findings (read-only)</summary>
        <ScanSummary scan={record.scan} source={record.source} compact />
      </details>

      <section aria-labelledby={`m-${record.id}`} className="offer-section">
        <h3 id={`m-${record.id}`} className="sub-head">FICTIONAL DEMO matches <small>{matches.length}</small></h3>
        <p className="panel-copy">Sample listings only. Expressing interest creates a local record; no real buyer is contacted.{reserved ? ' This batch already has an active demo transaction, so it cannot be reserved twice.' : ''}</p>
        {matches.length === 0 ? (
          <div className="empty-block" data-testid={`status-no-matches-${record.id}`}><SearchX size={22} /><p>No demo listing accepts {materialLabel(offer.supply.material)}. That says nothing about real demand. You can still create a preliminary report below.</p></div>
        ) : (
          <div className="match-list">{matches.map(m => <MatchCard key={m.buyer.id} match={m} supply={offer.supply} offerId={record.id} terms={offer.terms} locked={reserved} />)}</div>
        )}
      </section>

      <section className="offer-section" aria-labelledby={`t-${record.id}`}>
        <h3 id={`t-${record.id}`} className="sub-head">Linked demo transactions <small>{linked.length}</small></h3>
        {linked.length === 0 ? <p className="muted-line" data-testid={`status-no-linked-${record.id}`}>None yet. Pickup, schedule, transport and receipt details are added here after interest.</p>
          : <div className="tx-list">{linked.map(t => <div key={t.id}><TransactionCard tx={t} />{(t.status === 'received' || t.status === 'completed') && <ReuseForm tx={t} />}</div>)}</div>}
      </section>

      <details className="fold">
        <summary data-testid={`toggle-offer-uses-${record.id}`}>Suitability checks for possible uses</summary>
        <div className="routes">
          {routes.map((r, i) => (
            <article key={r.use} className="route-card" data-testid={`card-route-${record.id}-${i}`}>
              <span className="step-number">0{i + 1} / {r.use.toUpperCase()}</span>
              <span className={`outlook ${offer.supply.material === 'other' ? 'warn' : ''}`}>{r.outlook}</span>
              <p>{r.explanation}</p>
              <h4>Checks before use</h4>
              <ul>{r.checks.map(c => <li key={c}>{c}</li>)}</ul>
            </article>
          ))}
        </div>
      </details>

      <ConnectedReport record={record} />
      <Link href="/reports" className="text-link small" data-testid={`link-offer-reports-${record.id}`}>All reports</Link>
    </article>
  );
}
