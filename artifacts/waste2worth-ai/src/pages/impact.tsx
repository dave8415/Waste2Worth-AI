import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, CircleAlert } from 'lucide-react';
import { Header, Footer } from '@/components/layout';
import { JourneyNav } from '@/components/journey-nav';
import { StorageNotice } from '@/components/storage-notice';
import { ImpactReport } from '@/components/impact-report';
import { useBiomass } from '@/lib/biomass-state';
import { useTransactions } from '@/lib/transaction-state';
import { TransactionSelector } from '@/components/transaction-selector';
import { USES, buildImpactSummary, exploreUses, materialLabel, parseSupply, type IntendedUse, type MassBasis } from '@/lib/biomass';

export default function Impact() {
  const { state, updateImpact, generateReport } = useBiomass();
  const parsed = useMemo(() => parseSupply(state.supply), [state.supply]);
  const supply = parsed.ok ? parsed.value : null;
  const routes = useMemo(() => (supply ? exploreUses(supply) : []), [supply]);
  const result = useMemo(() => (supply ? buildImpactSummary(supply, state.impact) : null), [supply, state.impact]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const im = state.impact;
  const { state: txState } = useTransactions();
  const linked = im.transactionId ? txState.transactions.find((t) => t.id === im.transactionId) : undefined;
  const linkMissing = !!im.transactionId && !linked;
  const stale = !!linked && !!state.reportCreatedAt && linked.updatedAt > state.reportCreatedAt;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!result) return;
    if (!result.ok) { setErrors(result.errors); return; }
    setErrors({});
    generateReport();
  }
  const change = (patch: Parameters<typeof updateImpact>[0], key: string) => {
    updateImpact(patch);
    if (errors[key]) setErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  };
  const aria = (id: string) => ({ id, 'aria-invalid': !!errors[id], 'aria-describedby': errors[id] ? `${id}-error` : `${id}-hint` });
  const err = (id: string) => errors[id] && <span className="field-error" id={`${id}-error`} role="alert" data-testid={`error-${id}`}>{errors[id]}</span>;

  return (
    <div className="app-shell">
      <Header />
      <main className="page-main">
        <JourneyNav />
        <section className="page-intro">
          <span className="eyebrow"><span className="eyebrow-dot" /> Step 03 · Impact</span>
          <h1>Check the route.<br /><em>Record only what you know.</em></h1>
          <p>Potential uses come with the checks they need. The summary reports your own numbers transparently, and says plainly what it cannot claim.</p>
        </section>

        <section className="panel" aria-label="Optional transaction source">
          <TransactionSelector />
        </section>
        {!supply ? (
          <section className="panel gate" data-testid="status-supply-required">
            <CircleAlert size={22} />
            <h2 className="panel-title">Supply details needed first</h2>
            <p className="panel-copy">Use routes and the summary depend on a valid material, quantity, location and region.</p>
            <Link href="/exchange" className="button-primary" data-testid="link-back-exchange"><ArrowLeft size={15} /> Complete supply on Exchange</Link>
          </section>
        ) : (
          <>
            <section aria-labelledby="routes-heading" data-testid="section-use-routes">
              <div className="section-heading compact">
                <div><span className="eyebrow"><span className="eyebrow-dot" /> Suitability screening</span><h2 id="routes-heading">Three possible routes for {materialLabel(supply.material).toLowerCase()}</h2></div>
                <p>{supply.quantityTonnes} t available · {supply.location}, {supply.region} · quality: {supply.quality}</p>
              </div>
              <div className="routes">
                {routes.map((r, i) => (
                  <article key={r.use} className="route-card" data-testid={`card-route-${i}`}>
                    <span className="step-number">0{i + 1} / {r.use.toUpperCase()}</span>
                    <span className={`outlook ${supply.quality === 'contaminated' || supply.material === 'other' ? 'warn' : ''}`}>{r.outlook}</span>
                    <p>{r.explanation}</p>
                    <h3>Checks before use</h3>
                    <ul>{r.checks.map((c) => <li key={c}>{c}</li>)}</ul>
                  </article>
                ))}
              </div>
            </section>

            <div className="impact-layout">
              <section className="panel" aria-labelledby="impact-form-heading">
                <span className="panel-kicker">WHAT ACTUALLY HAPPENED</span>
                <h2 id="impact-form-heading" className="panel-title">Collected and reused</h2>
                <p className="panel-copy">Enter these separately from available stock. Blank is not zero; type 0 if nothing was reused. Changing any value clears the generated summary.</p>
                <form onSubmit={submit} noValidate className="form-grid one" data-testid="form-impact">
                  <div className="field">
                    <label htmlFor="reportDate">Report date (optional)</label>
                    <input type="date" className="field-input" {...aria('reportDate')} value={im.reportDate ?? ''} onChange={(e) => change({ reportDate: e.target.value }, 'reportDate')} data-testid="input-report-date" />
                    {!errors.reportDate && <span className="field-hint" id="reportDate-hint">Shown as missing if blank.</span>}
                    {err('reportDate')}
                  </div>
                  <div className="field">
                    <label htmlFor="collectedTonnes">Collected (tonnes)</label>
                    <input className="field-input" inputMode="decimal" {...aria('collectedTonnes')} value={im.collectedTonnes} onChange={(e) => change({ collectedTonnes: e.target.value }, 'collectedTonnes')} data-testid="input-collected" />
                    {!errors.collectedTonnes && <span className="field-hint" id="collectedTonnes-hint">Mass you actually gathered.</span>}
                    {err('collectedTonnes')}
                  </div>
                  <div className="field">
                    <label htmlFor="reusedTonnes">Reused (tonnes)</label>
                    <input className="field-input" inputMode="decimal" {...aria('reusedTonnes')} value={im.reusedTonnes} onChange={(e) => change({ reusedTonnes: e.target.value }, 'reusedTonnes')} data-testid="input-reused" />
                    {!errors.reusedTonnes && <span className="field-hint" id="reusedTonnes-hint">Cannot exceed collected.</span>}
                    {err('reusedTonnes')}
                  </div>
                  <div className="field">
                    <label htmlFor="intendedUse">Intended use</label>
                    <select className="field-input" {...aria('intendedUse')} value={im.intendedUse} onChange={(e) => change({ intendedUse: e.target.value as IntendedUse }, 'intendedUse')} data-testid="select-intended-use">
                      {USES.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                    {err('intendedUse')}
                  </div>
                  <div className="field">
                    <label htmlFor="massBasis">Mass basis</label>
                    <select className="field-input" {...aria('massBasis')} value={im.massBasis} onChange={(e) => change({ massBasis: e.target.value as MassBasis }, 'massBasis')} data-testid="select-mass-basis">
                      <option value="unknown">Unknown</option>
                      <option value="as-received">As received (wet)</option>
                      <option value="dry">Dry</option>
                    </select>
                    {!errors.massBasis && <span className="field-hint" id="massBasis-hint">No conversion is performed.</span>}
                    {err('massBasis')}
                  </div>
                  <button type="submit" className="button-primary" data-testid="button-generate-report">Generate unverified summary</button>
                </form>
              </section>

              <section aria-live="polite" data-testid="section-report">
                {stale || linkMissing ? (
                  <div className="panel empty-block tall" role="alert" data-testid="status-report-stale">
                    <p><strong>{linkMissing ? 'Linked record not found.' : 'Summary out of date.'}</strong><br />{linkMissing ? 'The linked demo transaction was removed. Unlink it or choose another, then generate again.' : 'The linked demo transaction changed after this summary was generated. Generate again.'}</p>
                  </div>
                ) : state.reportCreatedAt && result?.ok ? (
                  <ImpactReport summary={result.value} createdAt={state.reportCreatedAt} transaction={linked} />
                ) : (
                  <div className="panel empty-block tall" data-testid="status-report-empty">
                    <p><strong>No summary yet.</strong><br />Enter collected and reused tonnes, then generate. If you change any input, generate again for an up-to-date summary.</p>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
        <StorageNotice />
      </main>
      <Footer />
    </div>
  );
}
