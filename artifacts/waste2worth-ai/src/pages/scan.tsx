import { MaterialQualityPanel } from '@/components/material-quality-panel';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, Camera, ChevronRight, FileImage, Leaf, LoaderCircle, PenLine, Plus, ShieldCheck, Upload, X } from 'lucide-react';
import { useAnalyzeWaste } from '@workspace/api-client-react';
import { Header, Footer } from '@/components/layout';
import { JourneyNav } from '@/components/journey-nav';
import { StorageNotice } from '@/components/storage-notice';
import { ScanSummary } from '@/components/scan-summary';
import { ShortOfferForm } from '@/components/offer-form';
import { useJourney } from '@/lib/journey-state';
import { assessmentSchema } from '@/lib/journey';
import { MATERIALS, type MaterialId } from '@/lib/biomass';

type Photo = { file: File; preview: string; imageBase64: string };

function prepareImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const source = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(source);
      const maxEdge = 1500;
      const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('This photo could not be prepared. Please try another image.'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const encoded = canvas.toDataURL('image/jpeg', 0.84).split(',')[1];
      if (!encoded) reject(new Error('This photo could not be prepared. Please try another image.'));
      else resolve(encoded);
    };
    image.onerror = () => {
      URL.revokeObjectURL(source);
      reject(new Error('This image could not be opened. Try a JPG, PNG, or WebP photo.'));
    };
    image.src = source;
  });
}

function errorText(error: unknown): string {
  if (error instanceof Error && 'data' in error && error.data && typeof error.data === 'object') {
    const data = error.data as { error?: unknown };
    if (typeof data.error === 'string') return data.error;
  }
  if (error instanceof Error) {
    const message = error.message;
    try {
      const parsed = JSON.parse(message) as { message?: string; error?: string };
      return parsed.message || parsed.error || message;
    } catch {
      return message;
    }
  }
  return 'We could not analyze this image right now. Please try again.';
}

function isConfigurationError(message: string): boolean {
  return /not configured|rejected the api key|configured gemini model is unavailable/i.test(message);
}


function ManualEntry({ onDone }: { onDone: () => void }) {
  const { startScan } = useJourney();
  const [material, setMaterial] = useState<MaterialId | ''>('');
  const [error, setError] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!material) { setError('Choose a material, or select other / uncertain.'); return; }
    const label = MATERIALS.find(m => m.id === material)!.label;
    const r = startScan({ wasteType: label, confidence: 'low', visibleClues: [], possibleUses: [], visibleQualityIndicators: [], possibleContamination: [],
      limitationNote: 'Identified manually by the user. No photo was analysed; quality, contamination and moisture are unknown.' }, 'manual');
    if (!r.ok) { setError(Object.values(r.errors).join(' ')); return; }
    onDone();
  }
  return (
    <form className="manual-entry" onSubmit={submit} data-testid="form-manual-material" noValidate>
      <div>
        <span className="panel-kicker"><PenLine size={12} /> NO PHOTO? ENTER IT YOURSELF</span>
        <p>You know your material. Name it directly and continue to the offer — saved as a manual record, not a photo analysis.</p>
      </div>
      <div className="manual-row">
        <label htmlFor="manual-material" className="sr-only">Material</label>
        <select id="manual-material" className="field-input" value={material} aria-invalid={!!error} onChange={(e) => { setMaterial(e.target.value as MaterialId | ''); setError(''); }} data-testid="select-manual-material">
          <option value="">Choose material</option>
          {MATERIALS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <button type="submit" className="button-secondary" data-testid="button-manual-continue">Continue <ArrowRight size={14} /></button>
      </div>
      {error && <span className="field-error" role="alert" data-testid="error-manual-material">{error}</span>}
    </form>
  );
}

export default function Scan() {
  const mutation = useAnalyzeWaste();
  const { active, startScan, rememberPhoto } = useJourney();
  const [, navigate] = useLocation();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [validationError, setValidationError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [fresh, setFresh] = useState(false);
  const [offering, setOffering] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const offerRef = useRef<HTMLDivElement>(null);
  const busy = mutation.isPending;
  const record = fresh ? undefined : active;

  useEffect(() => () => { if (photo?.preview) URL.revokeObjectURL(photo.preview); }, [photo?.preview]);
  useEffect(() => { if (offering) offerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [offering]);

  async function acceptFile(file?: File) {
    setValidationError(''); setRequestError('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setValidationError('Choose a JPG, PNG, or WebP image. Other file types are not supported.'); return; }
    if (file.size > 15 * 1024 * 1024) { setValidationError('This photo is larger than 15 MB. Choose a smaller image and try again.'); return; }
    try {
      const imageBase64 = await prepareImage(file);
      mutation.reset();
      setPhoto({ file, preview: URL.createObjectURL(file), imageBase64 });
      setFresh(true);
      setOffering(false);
    } catch (error) { setValidationError(error instanceof Error ? error.message : 'This photo could not be prepared.'); }
  }

  async function analyzePhoto() {
    if (!photo || busy) return;
    setRequestError('');
    try {
      const data = await mutation.mutateAsync({ data: { imageBase64: photo.imageBase64, mimeType: 'image/jpeg' } });
      const parsed = assessmentSchema.safeParse(data);
      if (!parsed.success) { setRequestError('The analysis response could not be read. Try another photo or enter the material manually.'); return; }
      const r = startScan(parsed.data, 'photo');
      if (!r.ok) { setRequestError(Object.values(r.errors).join(' ')); return; }
      rememberPhoto(r.value.id, 'data:image/jpeg;base64,' + photo.imageBase64);
      setFresh(false); setOffering(false);
    } catch (error) { setRequestError(errorText(error)); }
  }

  function clearPhoto() {
    setPhoto(null); setValidationError(''); setRequestError(''); mutation.reset();
    if (pickerRef.current) pickerRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
  }
  function newScan() { clearPhoto(); setFresh(true); setOffering(false); }

  const configError = requestError ? isConfigurationError(requestError) : false;

  return (
    <div className="app-shell">
      <Header />
      <main className="analyze-main">
        <JourneyNav />
        <section className="analyze-intro">
          <span className="eyebrow"><span className="eyebrow-dot" /> Scan · then offer the same batch</span>
          <h1>Photograph the pile.<br />Offer it in one go.</h1>
          <p>A photo gives a first visual read of the material. Everything you see here travels with this batch into Market and its report.</p>
        </section>
        <div className="analysis-layout">
          <section className="upload-panel" aria-labelledby="upload-heading" data-testid="upload-panel">
            <span className="panel-kicker">01 — ADD A PHOTO</span>
            <h2 id="upload-heading" className="panel-title">Show us the material</h2>
            <p className="panel-copy">Close, well-lit, one material in view.</p>
            <div className={`drop-zone ${photo ? 'has-image' : ''}`} data-testid="photo-drop-zone">
              {photo ? (
                <>
                  <img src={photo.preview} alt={`Selected photo: ${photo.file.name}`} className="photo-preview" data-testid="img-photo-preview" />
                  <div className="preview-shade"><span>{photo.file.name}</span>
                    <button type="button" onClick={clearPhoto} aria-label="Remove selected photo" data-testid="button-remove-photo"><X size={14} /> Remove</button></div>
                </>
              ) : (
                <>
                  <span className="drop-icon"><FileImage size={23} /></span>
                  <strong className="drop-title">Choose a photo to get started</strong>
                  <span className="drop-caption">JPG, PNG, or WebP · up to 15 MB<br />Resized before sending. Not stored after reload.</span>
                </>
              )}
              <input ref={pickerRef} className="file-input" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose a photo of agricultural or plantation residue" onChange={(e) => void acceptFile(e.currentTarget.files?.[0])} data-testid="input-photo-upload" />
            </div>
            <div className="file-actions">
              <button type="button" className="button-secondary" onClick={() => pickerRef.current?.click()} data-testid="button-upload-photo"><Upload size={15} /> Upload photo</button>
              <button type="button" className="button-secondary" onClick={() => cameraRef.current?.click()} data-testid="button-take-photo"><Camera size={15} /> Take photo</button>
              <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Take a photo of agricultural or plantation residue" onChange={(e) => void acceptFile(e.currentTarget.files?.[0])} data-testid="input-camera-capture" hidden />
            </div>
            {validationError && <div className="status-message" role="alert" data-testid="status-validation-error">{validationError}</div>}
            {requestError && (
              <div className={`status-message ${configError ? 'info' : ''}`} role="alert" data-testid={configError ? 'status-gemini-configuration' : 'status-analysis-error'}>
                <strong>{configError ? 'Analysis needs a setup check.' : 'We could not complete the analysis.'}</strong><br />{requestError}<br />You can still enter the material manually below.
              </div>
            )}
            <button type="button" className="button-primary submit-analysis" onClick={() => void analyzePhoto()} disabled={!photo || busy} data-testid="button-analyze-photo">
              {busy ? <><LoaderCircle size={16} className="spin" /> Looking closely…</> : <>Identify this material <ChevronRight size={16} /></>}
            </button>
            <div className="privacy-note"><ShieldCheck size={14} /> The result is a visual estimate, not a material certification.</div>
          </section>

          <section className="result-panel" aria-live="polite" aria-busy={busy} data-testid="analysis-panel">
            <span className="panel-kicker">WHAT WE CAN SEE</span>
            {busy ? (
              <div className="loading-state" data-testid="status-analysis-loading">
                <span className="loader-ring" /><h2>Taking a closer look</h2>
                <p>Checking visible details, quality hints and possible contamination.</p>
              </div>
            ) : record ? (
              <div className="result-content" data-testid="analysis-result">
                {!photo && record.source === 'photo' && <p className="muted-line" data-testid="text-photo-not-persisted">Restored saved result. The photo itself is not kept after reload.</p>}
                <ScanSummary scan={record.scan} source={record.source} />
                {record.offer ? (
                  <div className="confirm-box" role="status" data-testid="status-already-offered">This batch is already offered. It cannot be submitted twice.
                    <button type="button" className="button-primary" onClick={() => navigate('/market')} data-testid="button-view-offer-market">View in Market <ArrowRight size={15} /></button></div>
                ) : !offering && (
                  <button type="button" className="button-primary continue-button" onClick={() => setOffering(true)} data-testid="button-offer-material" aria-label="Offer this material">Offer this material <ArrowRight size={16} /></button>
                )}
                <button type="button" className="text-link small" onClick={newScan} data-testid="button-new-scan"><Plus size={13} /> Scan a different batch</button>
              </div>
            ) : (
              <div className="result-empty" data-testid="analysis-empty-state">
                <span className="empty-icon"><Leaf size={25} /></span>
                <h2>Your field notes will appear here</h2>
                <p>Material, visible quality hints, possible contamination and uses — then a short offer form, right here.</p>
              </div>
            )}
          </section>
        </div>
        {record && <MaterialQualityPanel key={record.id} record={record} />}
        {record && !record.offer && offering && (
          <div ref={offerRef} className="panel offer-panel" data-testid="section-short-offer">
            <ShortOfferForm record={record} onSubmitted={() => navigate('/market')} />
          </div>
        )}
        {!record && <ManualEntry onDone={() => { setFresh(false); setOffering(true); }} />}
        <StorageNotice />
      </main>
      <Footer />
    </div>
  );
}
