import { Link } from 'wouter';
import { ArrowDown, ArrowRight, Leaf, Sprout } from 'lucide-react';
import { Header, Footer } from '@/components/layout';
import { StorageNotice } from '@/components/storage-notice';

export default function Home() {
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
            <Link href="/analyze" className="step-card" data-testid="step-card-1">
              <span className="step-number">01 / IDENTIFY</span>
              <h3>Name the material</h3>
              <p>Photograph a residue for a likely identification with visible clues, or simply choose it yourself if photo analysis is unavailable.</p>
            </Link>
            <Link href="/exchange" className="step-card" data-testid="step-card-2">
              <span className="step-number">02 / EXCHANGE</span>
              <h3>Compare with demo demand</h3>
              <p>Enter quantity and region to see indicative matches from fictional sample listings, and record interest locally. No messages are sent.</p>
            </Link>
            <Link href="/impact" className="step-card" data-testid="step-card-3">
              <span className="step-number">03 / IMPACT</span>
              <h3>Check uses, record honestly</h3>
              <p>See checks for each possible route and build an unverified summary from your own collected and reused tonnes.</p>
            </Link>
          </div>
        </section>

        <section className="material-strip" aria-label="Examples of materials" data-testid="materials-strip">
          <span className="material-title">From harvest to next use.</span>
          <span className="material-chip"><Sprout size={16} /> Straw & stalks</span>
          <span className="material-chip"><Leaf size={16} /> Husk & shell</span>
          <span className="material-chip"><Sprout size={16} /> Palm residues</span>
          <span className="material-chip"><Leaf size={16} /> Prunings & fronds</span>
        </section>

        <StorageNotice />

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
