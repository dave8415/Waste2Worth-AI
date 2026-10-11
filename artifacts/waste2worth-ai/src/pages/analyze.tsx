import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowRight, Check, ChevronRight, CircleAlert, Camera, FileImage, Leaf, LoaderCircle, PenLine, ShieldCheck, Sparkles, Upload, X } from 'lucide-react';
import { useAnalyzeWaste } from '@workspace/api-client-react';
import { Header, Footer } from '@/components/layout';
import { JourneyNav } from '@/components/journey-nav';
import { useBiomass } from '@/lib/biomass-state';
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

function AnalysisResult({ result, onContinue }: { result: NonNullable<ReturnType<typeof useAnalyzeWaste>['data']>; onContinue: () => void }) {
  const confidence = result.confidence;
  return (
    <div className="result-content" data-testid="analysis-result">
      <div className="result-topline">
        <span className="result-tag"><Sparkles size={13} /> Photo assessment</span>
        <span className="confidence" data-testid="text-confidence">Confidence: {confidence}</span>
      </div>
      <h2 className="result-name" data-testid="text-waste-type">{result.wasteType}</h2>
      <section className="result-block" aria-labelledby="clues-heading">
        <h3 id="clues-heading">Visible clues</h3>
        <ul className="clue-list" data-testid="list-visible-clues">
          {result.visibleClues.map((clue, index) => <li key={`${index}-${clue}`} data-testid={`text-visible-clue-${index}`}><Check size={14} />{clue}</li>)}
        </ul>
      </section>
      <section className="result-block" aria-labelledby="uses-heading">
        <h3 id="uses-heading">Possible uses to explore</h3>
        <div className="uses-list" data-testid="list-possible-uses">
          {result.possibleUses.map((use, index) => <span className="use-chip" key={`${index}-${use}`} data-testid={`text-possible-use-${index}`}>{use}</span>)}
        </div>
      </section>
      <div className="caution-box" data-testid="text-limitation-note">
        <strong><CircleAlert size={13} /> Important limitation</strong>
        {result.limitationNote}
      </div>
      <div className="warning-callout" data-testid="photo-testing-warning">
        <CircleAlert size={16} />
        <span>A photo cannot confirm moisture, quality, or energy value. Lab testing may still be needed.</span>
      </div>
      <button type="button" className="button-primary continue-button" onClick={onContinue} data-testid="button-continue-exchange">
        Confirm material and find demo matches <ArrowRight size={16} />
      </button>
    </div>
  );
}

function ManualEntry() {
  const { updateSupply, state } = useBiomass();
  const [, navigate] = useLocation();
  const [material, setMaterial] = useState<MaterialId | ''>(state.supply.material);
  const [error, setError] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!material) { setError('Choose a material, or select other / uncertain.'); return; }
    updateSupply({ material });
    navigate('/exchange');
  }
  return (
    <form className="manual-entry" onSubmit={submit} data-testid="form-manual-material" noValidate>
      <div>
        <span className="panel-kicker"><PenLine size={12} /> NO PHOTO? ENTER IT YOURSELF</span>
        <p>You know your material better than any photo. Choose it directly and continue, even if photo analysis is unavailable.</p>
      </div>
      <div className="manual-row">
        <label htmlFor="manual-material" className="sr-only">Material</label>
        <select id="manual-material" className="field-input" value={material} aria-invalid={!!error} aria-describedby={error ? 'manual-material-error' : undefined}
          onChange={(e) => { setMaterial(e.target.value as MaterialId | ''); setError(''); }} data-testid="select-manual-material">
          <option value="">Choose material</option>
          {MATERIALS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <button type="submit" className="button-secondary" data-testid="button-manual-continue">Continue <ArrowRight size={14} /></button>
      </div>
      {error && <span id="manual-material-error" className="field-error" role="alert" data-testid="error-manual-material">{error}</span>}
      <Link href="/exchange" className="text-link small" data-testid="link-skip-to-exchange">Or go straight to the supply form</Link>
    </form>
  );
}

export default function Analyze() {
  const mutation = useAnalyzeWaste();
  const { adoptIdentification } = useBiomass();
  const [, navigate] = useLocation();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [validationError, setValidationError] = useState('');
  const [requestError, setRequestError] = useState('');
  const pickerRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const busy = mutation.isPending;

  useEffect(() => () => {
    if (photo?.preview) URL.revokeObjectURL(photo.preview);
  }, [photo?.preview]);

  async function acceptFile(file?: File) {
    setValidationError('');
    setRequestError('');
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setValidationError('Choose a JPG, PNG, or WebP image. Other file types are not supported.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setValidationError('This photo is larger than 15 MB. Choose a smaller image and try again.');
      return;
    }
    try {
      const imageBase64 = await prepareImage(file);
      mutation.reset();
      setPhoto({ file, preview: URL.createObjectURL(file), imageBase64 });
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'This photo could not be prepared.');
    }
  }

  async function analyzePhoto() {
    if (!photo || busy) return;
    setRequestError('');
    try {
      await mutation.mutateAsync({ data: { imageBase64: photo.imageBase64, mimeType: 'image/jpeg' } });
    } catch (error) {
      setRequestError(errorText(error));
    }
  }

  function clearPhoto() {
    setPhoto(null);
    setValidationError('');
    setRequestError('');
    mutation.reset();
    if (pickerRef.current) pickerRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
  }

  const message = requestError;
  const configError = message ? isConfigurationError(message) : false;

  return (
    <div className="app-shell">
      <Header />
      <main className="analyze-main">
        <JourneyNav />
        <section className="analyze-intro">
          <span className="eyebrow"><span className="eyebrow-dot" /> A field-side first look</span>
          <h1>What could this<br />material become?</h1>
          <p>Upload or take a clear photo of crop or plantation residue. We’ll help identify what’s visible and share possible directions for its next use.</p>
        </section>
        <div className="analysis-layout">
          <section className="upload-panel" aria-labelledby="upload-heading" data-testid="upload-panel">
            <span className="panel-kicker">01 — ADD A PHOTO</span>
            <h2 id="upload-heading" className="panel-title">Show us the material</h2>
            <p className="panel-copy">Use a close, well-lit photo with one material clearly in view.</p>
            <div className={`drop-zone ${photo ? 'has-image' : ''}`} data-testid="photo-drop-zone">
              {photo ? (
                <>
                  <img src={photo.preview} alt={`Selected photo: ${photo.file.name}`} className="photo-preview" data-testid="img-photo-preview" />
                  <div className="preview-shade">
                    <span>{photo.file.name}</span>
                    <button type="button" onClick={clearPhoto} aria-label="Remove selected photo" data-testid="button-remove-photo"><X size={14} /> Remove</button>
                  </div>
                </>
              ) : (
                <>
                  <span className="drop-icon"><FileImage size={23} /></span>
                  <strong className="drop-title">Choose a photo to get started</strong>
                  <span className="drop-caption">JPG, PNG, or WebP · up to 15 MB<br />Your photo is resized before sending.</span>
                </>
              )}
              <input
                ref={pickerRef}
                className="file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Choose a photo of agricultural or plantation residue"
                onChange={(event) => void acceptFile(event.currentTarget.files?.[0])}
                data-testid="input-photo-upload"
              />
            </div>
            <div className="file-actions">
              <button type="button" className="button-secondary" onClick={() => pickerRef.current?.click()} data-testid="button-upload-photo">
                <Upload size={15} /> Upload photo
              </button>
              <button type="button" className="button-secondary" onClick={() => cameraRef.current?.click()} data-testid="button-take-photo">
                <Camera size={15} /> Take photo
              </button>
              <input
                ref={cameraRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                aria-label="Take a photo of agricultural or plantation residue"
                onChange={(event) => void acceptFile(event.currentTarget.files?.[0])}
                data-testid="input-camera-capture"
                hidden
              />
            </div>
            <p className="file-help">For a better read: natural light, simple background, close focus.</p>
            {validationError && <div className="status-message" role="alert" data-testid="status-validation-error">{validationError}</div>}
            {requestError && (
              <div className={`status-message ${configError ? 'info' : ''}`} role="alert" data-testid={configError ? 'status-gemini-configuration' : 'status-analysis-error'}>
                <strong>{configError ? 'Analysis needs a setup check.' : 'We could not complete the analysis.'}</strong><br />
                {message}
              </div>
            )}
            <button type="button" className="button-primary submit-analysis" onClick={() => void analyzePhoto()} disabled={!photo || busy} data-testid="button-analyze-photo">
              {busy ? <><LoaderCircle size={16} /> Looking closely…</> : <>Identify this material <ChevronRight size={16} /></>}
            </button>
            <div className="privacy-note"><ShieldCheck size={14} /> This image is used to request your identification. The result is a visual estimate, not a material certification.</div>
          </section>

          <section className="result-panel" aria-live="polite" aria-busy={busy} data-testid="analysis-panel">
            <span className="panel-kicker">02 — WHAT WE CAN SEE</span>
            {busy ? (
              <div className="loading-state" data-testid="status-analysis-loading">
                <span className="loader-ring" />
                <h2>Taking a closer look</h2>
                <p>Checking visible details and considering practical reuse directions. This can take a few moments.</p>
              </div>
            ) : mutation.data ? (
              <AnalysisResult result={mutation.data} onContinue={() => { adoptIdentification(mutation.data!.wasteType); navigate('/exchange'); }} />
            ) : (
              <div className="result-empty" data-testid="analysis-empty-state">
                <span className="empty-icon"><Leaf size={25} /></span>
                <h2>Your field notes will appear here</h2>
                <p>After you add a photo, the likely material, visible clues, and possible uses will be gathered here.</p>
              </div>
            )}
          </section>
        </div>
        <ManualEntry />
      </main>
      <Footer />
    </div>
  );
}