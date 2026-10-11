import { useState, type ChangeEvent } from 'react';
import { Download, Paperclip, Trash2 } from 'lucide-react';
import { useTransactions } from '@/lib/transaction-state';
import { downloadEvidence } from '@/lib/evidence-storage';
import type { DemoTransaction, EvidenceMeta } from '@/lib/transactions';

const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf,text/plain,text/csv,.csv,.txt';

export function EvidencePanel({ tx }: { tx: DemoTransaction }) {
  const { attachEvidence, removeEvidence } = useTransactions();
  const [category, setCategory] = useState<EvidenceMeta['category']>('delivery');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const full = tx.evidence.length >= 5;

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Each file must be 5 MB or smaller.'); return; }
    setBusy(true); setError('');
    try { await attachEvidence(tx.id, file, category); }
    catch (err) { setError(err instanceof Error ? err.message : 'The file could not be stored in this browser.'); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    setBusy(true); setError('');
    try { await removeEvidence(tx.id, id); setConfirmId(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'The file could not be removed.'); }
    finally { setBusy(false); }
  }
  async function download(meta: EvidenceMeta) {
    setError('');
    try { await downloadEvidence(meta); }
    catch (err) { setError(err instanceof Error ? err.message : 'Download failed.'); }
  }

  return (
    <section className="tx-block" data-testid={`evidence-panel-${tx.id}`}>
      <h4><Paperclip size={13} /> Local attachments · {tx.evidence.length}/5</h4>
      <p className="field-hint">Files are copied into this browser's IndexedDB only — never uploaded. JPEG, PNG, WebP, PDF, TXT or CSV; 5 MB each, 50 MB per browser. Attachments are unverified and prove nothing.</p>
      <div className="evidence-controls">
        <select className="field-input" value={category} disabled={busy || full} onChange={(e) => setCategory(e.target.value as EvidenceMeta['category'])} data-testid={`select-evidence-category-${tx.id}`} aria-label="Attachment category">
          <option value="delivery">Delivery</option><option value="weighing">Weighing</option><option value="quality">Quality</option>
        </select>
        <label className={`button-secondary${busy || full ? ' is-disabled' : ''}`}>
          {busy ? 'Working...' : full ? 'Limit reached' : 'Attach file'}
          <input type="file" className="sr-only" accept={ACCEPT} disabled={busy || full} onChange={onFile} data-testid={`input-evidence-file-${tx.id}`} />
        </label>
      </div>
      {error && <div className="status-message" role="alert" data-testid={`error-evidence-${tx.id}`}>{error}</div>}
      {tx.evidence.length > 0 && (
        <ul className="evidence-list">
          {tx.evidence.map((m) => (
            <li key={m.id} data-testid={`item-evidence-${m.id}`}>
              <div className="evidence-meta"><strong>{m.name}</strong><small>{m.category} · {(m.size / 1024).toFixed(1)} KB · {new Date(m.attachedAt).toLocaleString()}</small></div>
              {confirmId === m.id ? (
                <div className="evidence-actions">
                  <span className="field-hint">Delete file?</span>
                  <button type="button" className="button-danger" disabled={busy} onClick={() => remove(m.id)} data-testid={`button-confirm-remove-evidence-${m.id}`}>Delete</button>
                  <button type="button" className="reset-button" disabled={busy} onClick={() => setConfirmId(null)} data-testid={`button-cancel-remove-evidence-${m.id}`}>Keep</button>
                </div>
              ) : (
                <div className="evidence-actions">
                  <button type="button" className="icon-btn" disabled={busy} onClick={() => download(m)} aria-label={`Download ${m.name}`} data-testid={`button-download-evidence-${m.id}`}><Download size={14} /></button>
                  <button type="button" className="icon-btn" disabled={busy} onClick={() => setConfirmId(m.id)} aria-label={`Remove ${m.name}`} data-testid={`button-remove-evidence-${m.id}`}><Trash2 size={14} /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
