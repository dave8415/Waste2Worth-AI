import { type ReactNode, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArrowDown, ArrowRight, Check, ChevronRight, CircleAlert, Camera, FileImage, Leaf, LoaderCircle, ShieldCheck, Sparkles, Sprout, Upload, X } from 'lucide-react';
import { useAnalyzeWaste } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type Photo = {
  file: File;
  preview: string;
  imageBase64: string;
};

function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Waste2Worth AI home" data-testid="link-home-brand">
      <span className="brand-mark"><Sprout size={21} strokeWidth={1.7} /></span>
      <span className="brand-name">Waste<span>2</span>Worth</span>
    </Link>
  );
}

function Header() {
  const [location] = useLocation();
  return (
    <header className="site-header" data-testid="site-header">
      <Brand />
      <nav className="nav-links" aria-label="Main navigation">
        <Link href="/" className={`nav-link ${location === '/' ? 'active' : ''}`} data-testid="link-home">How it works</Link>
        <Link href="/analyze" className="nav-cta" data-testid="link-analyze">
          <Camera size={15} /> Identify a material
        </Link>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer" data-testid="site-footer">
      <Brand />
      <span>Practical ideas for the materials already growing around us.</span>
      <span>Photo guidance, not a laboratory result.</span>
    </footer>
  );
}

function Home() {
  return (
    <div className="app-shell">
      <Header />
      <main className="home-main">
        <section className="hero" aria-labelledby="hero-title" data-testid="home-hero">
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> A clearer next step for crop residue</span>
            <h1 id="hero-title">See what’s left.<br /><em>See what’s possible.</em></h1>
            <p>Take a photo of an agricultural or plantation leftover. Get a plain-language identification and practical directions for putting it to use.</p>
            <div className="hero-actions">
              <Link href="/analyze" className="button-primary" data-testid="button-start-analysis">Explore a material <ArrowRight size={16} /></Link>
              <a href="#how-it-works" className="text-link" data-testid="link-how-it-works">How it works <ArrowDown size={14} /></a>
            </div>
          </div>
          <div className="hero-art" aria-label="Illustration of a harvested field and grain stalks" role="img" data-testid="hero-field-illustration">
            <div className="sun-disc" />
            <div className="crop-stalk" />
            <div className="land-line" />
            <div className="land-line two" />
            <div className="land-line three" />
            <div className="field-note">
              <span className="field-note-icon"><Leaf size={17} /></span>
              <span><strong>Left in the field?</strong><small>There may be another use.</small></span>
            </div>
          </div>
        </section>

        <section className="home-section" id="how-it-works" data-testid="how-it-works">
          <div className="section-heading">
            <div>
              <span className="eyebrow"><span className="eyebrow-dot" /> From photo to possibility</span>
              <h2>A useful starting point,<br />not another complicated tool.</h2>
            </div>
            <p>Built for people who work with crops and plantation materials directly. No specialist vocabulary needed.</p>
          </div>
          <div className="steps-grid">
            <article className="step-card" data-testid="step-card-1">
              <span className="step-number">01 / NOTICE</span>
              <h3>Show us what you have</h3>
              <p>Photograph a single residue or by-product in clear, natural light. A close, in-focus view works best.</p>
            </article>
            <article className="step-card" data-testid="step-card-2">
              <span className="step-number">02 / IDENTIFY</span>
              <h3>Get a likely identification</h3>
              <p>The image is reviewed for visible clues and returned with a confidence level, in everyday language.</p>
            </article>
            <article className="step-card" data-testid="step-card-3">
              <span className="step-number">03 / CONSIDER</span>
              <h3>Explore possible uses</h3>
              <p>See practical directions worth exploring locally, from soil improvement to material or energy uses.</p>
            </article>
          </div>
        </section>

        <section className="material-strip" aria-label="Examples of materials" data-testid="materials-strip">
          <span className="material-title">From harvest to next use.</span>
          <span className="material-chip"><Sprout size={16} /> Straw & stalks</span>
          <span className="material-chip"><Leaf size={16} /> Husk & shell</span>
          <span className="material-chip"><Sprout size={16} /> Palm residues</span>
          <span className="material-chip"><Leaf size={16} /> Prunings & fronds</span>
        </section>

        <section className="trust-band" data-testid="photo-limitations">
          <div>
            <span className="eyebrow"><span className="eyebrow-dot" /> Grounded by design</span>
            <h2>A photo can only tell part of the story.</h2>
            <p>Images can suggest a material and show visible clues. They cannot confirm moisture, quality, or energy value. Lab testing may still be needed before making technical, safety, or commercial decisions.</p>
          </div>
          <Link href="/analyze" className="button-primary" data-testid="button-try-analysis">Try a photo <ArrowRight size={16} /></Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}

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
  return /gemini|api key|configuration|not configured|service unavailable/i.test(message);
}

function AnalysisResult({ result }: { result: NonNullable<ReturnType<typeof useAnalyzeWaste>['data']> }) {
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
    </div>
  );
}

function Analyze() {
  const mutation = useAnalyzeWaste();
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
                <strong>{configError ? 'Analysis is not configured yet.' : 'We could not complete the analysis.'}</strong><br />
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
              <AnalysisResult result={mutation.data} />
            ) : (
              <div className="result-empty" data-testid="analysis-empty-state">
                <span className="empty-icon"><Leaf size={25} /></span>
                <h2>Your field notes will appear here</h2>
                <p>After you add a photo, the likely material, visible clues, and possible uses will be gathered here.</p>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/analyze" component={Analyze} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
