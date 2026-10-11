import { Download, ShieldAlert } from 'lucide-react';
import type { ImpactSummary } from '@/lib/biomass';

const BASIS: Record<string, string> = { unknown: 'Unknown', 'as-received': 'As received (wet)', dry: 'Dry' };

export function reportText(s: ImpactSummary, createdAt: string) {
  const share = s.reusedSharePercent === null ? 'Not calculable (zero collected)' : `${s.reusedSharePercent.toFixed(1)}%`;
  return [
    'WASTE2WORTH - UNVERIFIED PROTOTYPE ESG SUMMARY',
    `Generated: ${new Date(createdAt).toLocaleString()}`,
    '',
    s.disclaimer,
    '',
    `Material: ${s.material}`,
    `Location: ${s.location}`,
    `Intended use: ${s.intendedUse}`,
    `Mass basis: ${BASIS[s.massBasis]}`,
    `Collected: ${s.collectedTonnes} t (user-reported)`,
    `Reused: ${s.reusedTonnes} t (user-reported)`,
    `Reused share: ${share}`,
    `Unallocated: ${s.unallocatedTonnes} t - fate unknown`,
    'Emissions savings: NOT CALCULATED (required data missing)',
    'Jobs / income: Not measured',
    '',
    'ASSUMPTIONS',
    ...s.assumptions.map((a) => `- ${a}`),
    '',
    'MISSING EVIDENCE',
    ...s.missingEvidence.map((a) => `- ${a}`),
    '',
    'Not certified. Not a compliance report. Not proof of carbon credits.',
  ].join('\n');
}

export function ImpactReport({ summary, createdAt }: { summary: ImpactSummary; createdAt: string }) {
  const share = summary.reusedSharePercent;
  function download() {
    const blob = new Blob([reportText(summary, createdAt)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'waste2worth-unverified-esg-summary.txt';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <article className="report" data-testid="report-esg-summary" aria-labelledby="report-title">
      <div className="report-stamp"><ShieldAlert size={14} /> Unverified prototype</div>
      <h2 id="report-title">ESG summary</h2>
      <p className="report-date">Generated {new Date(createdAt).toLocaleString()} · {summary.material} · {summary.location}</p>
      <p className="report-disclaimer" data-testid="text-report-disclaimer">{summary.disclaimer}</p>
      <dl className="report-metrics">
        <div><dt>Collected</dt><dd data-testid="text-report-collected">{summary.collectedTonnes} t</dd></div>
        <div><dt>Reused</dt><dd data-testid="text-report-reused">{summary.reusedTonnes} t</dd></div>
        <div><dt>Reused share</dt><dd data-testid="text-report-share">{share === null ? 'Not calculable' : `${share.toFixed(1)}%`}</dd>{share === null && <small>Zero collected</small>}</div>
        <div><dt>Unallocated</dt><dd data-testid="text-report-unallocated">{summary.unallocatedTonnes} t</dd><small>Fate unknown</small></div>
      </dl>
      <div className="report-rows">
        <div><span>Intended use</span><strong>{summary.intendedUse}</strong></div>
        <div><span>Mass basis</span><strong>{BASIS[summary.massBasis]}</strong></div>
        <div className="not-calc" data-testid="text-emissions-not-calculated"><span>Emissions savings</span><strong>NOT CALCULATED — required data missing</strong></div>
        <div><span>Jobs and income</span><strong>Not measured</strong></div>
      </div>
      <div className="report-cols">
        <section><h3>Assumptions</h3><ul data-testid="list-report-assumptions">{summary.assumptions.map((a) => <li key={a}>{a}</li>)}</ul></section>
        <section><h3>Missing evidence</h3><ul data-testid="list-report-missing">{summary.missingEvidence.map((a) => <li key={a}>{a}</li>)}</ul></section>
      </div>
      <p className="report-foot">Not certified. Not a compliance report. Not proof of carbon credits.</p>
      <button type="button" className="button-primary" onClick={download} data-testid="button-download-report"><Download size={15} /> Download text summary</button>
    </article>
  );
}
