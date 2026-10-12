import { useState, type FormEvent } from 'react';
import { HardDrive } from 'lucide-react';
import { Header, Footer } from '@/components/layout';
import { StorageNotice } from '@/components/storage-notice';
import { PROVINCES, PROVINCE_CITIES } from '@/lib/locations';

const KEY = 'waste2worth-profile-v1';
type Profile = { role: string; business: string; province: string; city: string };
const empty: Profile = { role: '', business: '', province: '', city: '' };
function load(): { p: Profile; warn: string } {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { p: empty, warn: '' };
    const o = JSON.parse(raw);
    const p: Profile = { role: String(o.role ?? '').slice(0, 40), business: String(o.business ?? '').slice(0, 120), province: String(o.province ?? ''), city: String(o.city ?? '') };
    if (p.province && !PROVINCE_CITIES[p.province]) { p.province = ''; p.city = ''; }
    if (p.city && !PROVINCE_CITIES[p.province]?.includes(p.city)) p.city = '';
    return { p, warn: '' };
  } catch { return { p: empty, warn: 'Saved profile could not be read from this browser.' }; }
}

export default function ProfilePage() {
  const [init] = useState(load);
  const [v, setV] = useState<Profile>(init.p);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState(init.warn);
  const [ok, setOk] = useState(false);
  const set = (patch: Partial<Profile>) => { setV(p => ({ ...p, ...patch })); setOk(false); setErrors({}); };
  function save(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!v.role) er.role = 'Choose a role.';
    if (v.business.length > 120) er.business = 'Use at most 120 characters.';
    if (v.city && !v.province) er.province = 'Choose a province for this city.';
    if (v.province && v.city && !PROVINCE_CITIES[v.province]?.includes(v.city)) er.city = 'City must belong to the selected province.';
    if (Object.keys(er).length) { setErrors(er); return; }
    try { localStorage.setItem(KEY, JSON.stringify(v)); setOk(true); setStatus(''); }
    catch { setStatus('Could not save to browser storage. Your profile will not survive reload.'); }
  }
  function clear() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } setV(empty); setOk(false); }
  const err = (k: string) => errors[k] && <span className="field-error" role="alert" data-testid={`error-profile-${k}`}>{errors[k]}</span>;
  return (
    <div className="app-shell">
      <Header />
      <main className="page-main narrow">
        <section className="page-intro">
          <span className="eyebrow"><span className="eyebrow-dot" /> Profile · this device only</span>
          <h1>Who’s in the field.</h1>
          <p>Optional context kept in this browser. There is no account, login or server copy.</p>
        </section>
        <form className="panel form-grid" onSubmit={save} noValidate data-testid="form-profile">
          <div className="field"><label htmlFor="p-role">Role</label>
            <select id="p-role" className="field-input" value={v.role} aria-invalid={!!errors.role} onChange={e => set({ role: e.target.value })} data-testid="select-profile-role">
              <option value="">Choose role</option><option value="farmer">Farmer</option><option value="collector">Collector / aggregator</option><option value="cooperative">Cooperative</option><option value="processor">Processor</option><option value="other">Other</option>
            </select>{err('role')}</div>
          <div className="field"><label htmlFor="p-biz">Business type (optional)</label>
            <input id="p-biz" className="field-input" maxLength={120} value={v.business} onChange={e => set({ business: e.target.value })} data-testid="input-profile-business" />{err('business')}</div>
          <div className="field"><label htmlFor="p-prov">Province</label>
            <select id="p-prov" className="field-input" value={v.province} aria-invalid={!!errors.province} onChange={e => set({ province: e.target.value, city: '' })} data-testid="select-profile-province">
              <option value="">Not set</option>{PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>{err('province')}</div>
          <div className="field"><label htmlFor="p-city">City / regency</label>
            <select id="p-city" className="field-input" value={v.city} disabled={!v.province} aria-invalid={!!errors.city} onChange={e => set({ city: e.target.value })} data-testid="select-profile-city">
              <option value="">{v.province ? 'Not set' : 'Choose province first'}</option>{(PROVINCE_CITIES[v.province] ?? []).map(c => <option key={c} value={c}>{c}</option>)}
            </select>{err('city')}</div>
          <div className="field span-2 profile-actions">
            {status && <div className="status-message" role="alert" data-testid="status-profile-error">{status}</div>}
            {ok && <div className="confirm-box" role="status" data-testid="status-profile-saved"><HardDrive size={14} /> Saved in this browser.</div>}
            <button type="submit" className="button-primary" data-testid="button-save-profile">Save profile</button>
            <button type="button" className="reset-button" onClick={clear} data-testid="button-clear-profile">Clear</button>
          </div>
        </form>
        <StorageNotice />
      </main>
      <Footer />
    </div>
  );
}
