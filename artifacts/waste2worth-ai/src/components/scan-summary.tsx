import { Check, CircleAlert, Eye, FlaskConical } from 'lucide-react';
import type { Assessment } from '@/lib/journey';

export function ScanSummary({ scan, source, compact }: { scan: Assessment; source: 'photo' | 'manual'; compact?: boolean }) {
  const list = (items: string[], empty: string, id: string) => items.length
    ? <ul className="clue-list" data-testid={id}>{items.map((c, i) => <li key={`${i}-${c}`}><Check size={14} />{c}</li>)}</ul>
    : <p className="muted-line" data-testid={`${id}-empty`}>{empty}</p>;
  return (
    <div className={`scan-summary ${compact ? 'compact' : ''}`} data-testid="scan-summary">
      <div className="result-topline">
        <span className="result-tag"><Eye size={13} /> {source === 'photo' ? 'Photo estimate' : 'Manual identification'}</span>
        <span className="confidence" data-testid="text-confidence">Confidence: {scan.confidence}</span>
      </div>
      <h2 className="result-name" data-testid="text-waste-type">{scan.wasteType}</h2>
      <div className="scan-grid">
        <section className="result-block"><h3>Visible clues</h3>{list(scan.visibleClues, source === 'manual' ? 'No photo analysed. Identified by you.' : 'None listed.', 'list-visible-clues')}</section>
        <section className="result-block"><h3>Visible quality indicators</h3>{list(scan.visibleQualityIndicators, 'Unknown — not separately assessed.', 'list-quality-indicators')}</section>
        <section className="result-block"><h3>Possible contamination</h3>{list(scan.possibleContamination, 'Unknown. A photo cannot confirm the material is clean.', 'list-possible-contamination')}</section>
        {!compact && <section className="result-block"><h3>Possible uses to explore</h3>
          {scan.possibleUses.length ? <div className="uses-list" data-testid="list-possible-uses">{scan.possibleUses.map((u, i) => <span className="use-chip" key={`${i}-${u}`}>{u}</span>)}</div> : <p className="muted-line">Unknown — see suitability checks after offering.</p>}
        </section>}
      </div>
      {!compact && scan.limitationNote && <div className="caution-box" data-testid="text-limitation-note"><strong><CircleAlert size={13} /> Important limitation</strong>{scan.limitationNote}</div>}
      <div className="warning-callout" data-testid="photo-testing-warning"><FlaskConical size={16} /><span>Visual estimates only. A photo cannot confirm moisture, cleanliness, quality, or energy value. Lab testing may still be needed.</span></div>
    </div>
  );
}
