import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowDown, ArrowRight, Camera, ClipboardCheck, ScanSearch } from 'lucide-react';
import { Header, Footer } from '@/components/layout';
import { StorageNotice } from '@/components/storage-notice';

const img = (name: string) => `${import.meta.env.BASE_URL}images/${name}`;

function Photo({ src, alt, testId, eager = false, missingLabel }: { src: string; alt: string; testId: string; eager?: boolean; missingLabel: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <div className="hv-photo-missing" role="img" aria-label={`${missingLabel} photo is missing`} data-testid={`${testId}-missing`}>{missingLabel} photo missing</div>;
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding={eager ? 'sync' : 'async'}
      fetchPriority={eager ? 'high' : undefined}
      onError={() => setFailed(true)}
      data-testid={testId}
    />
  );
}

const STEPS = [
  { icon: Camera, text: 'Take a photo of agricultural waste.' },
  { icon: ScanSearch, text: 'Get an initial identification and practical reuse suggestions.' },
  { icon: ClipboardCheck, text: 'Explore possible uses and record what happens to the material.' },
];

export default function Home() {
  return (
    <div className="app-shell home-inter">
      <Header />
      <main className="home-main hv">
        <section className="hv-hero" aria-labelledby="hero-title" data-testid="home-hero">
          <div className="hv-hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> Waste2Worth AI</span>
            <h1 id="hero-title">A better use for agricultural waste</h1>
            <p>We’re a team building a simple AI tool to help farmers identify agricultural waste and find practical ways to reuse it. Our goal is to reduce waste and create new opportunities for local communities.</p>
            <div className="hv-actions">
              <Link href="/scan" className="button-primary hv-cta" data-testid="button-start-analysis"><Camera size={16} /> Scan material</Link>
              <a href="#how-it-works" className="text-link hv-link" data-testid="link-how-it-works">How it works <ArrowDown size={14} /></a>
            </div>
          </div>
          <figure className="hv-hero-photo">
            <Photo src={img('farmer-field.jpg')} eager testId="img-hero-farmer" missingLabel="Farmer" alt="A farmer in a yellow shirt raking harvested rice spread out to dry on a paved village courtyard" />
            <figcaption>Drying the harvest. What is left after milling is where the next question starts.</figcaption>
          </figure>
        </section>

        <section className="hv-steps" id="how-it-works" data-testid="how-it-works">
          <div className="hv-steps-head">
            <span className="eyebrow"><span className="eyebrow-dot" /> How it works</span>
            <h2>Three simple steps</h2>
          </div>
          <ol>
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={i} data-testid={`step-card-${i + 1}`}>
                  <span className="hv-step-num">{String(i + 1).padStart(2, '0')}</span>
                  <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
                  <p>{s.text}</p>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="hv-why" aria-labelledby="why-title" data-testid="section-why">
          <div className="hv-why-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> Why it matters</span>
            <h2 id="why-title">Useful material is often left unused</h2>
            <p>After harvest and milling, materials like rice husk and rice straw pile up. Some sits in sheds, some is left in the field, and some is burned to clear space.</p>
            <p>Waste2Worth AI helps you name what you have and look at practical ways it could be used, so the next step is a decision rather than a guess.</p>
          </div>
          <div className="hv-why-photos">
            <figure>
              <Photo src={img('rice-husk.jpg')} testId="img-rice-husk" missingLabel="Rice husk" alt="A large pile of rice husk stored under a metal-roofed shed, with filled sacks stacked to one side" />
              <figcaption><strong>Rice husk</strong> Collected after milling, often stored in bulk with no planned use.</figcaption>
            </figure>
            <figure>
              <Photo src={img('rice-straw.jpg')} testId="img-rice-straw" missingLabel="Rice straw" alt="Rice straw burning in a harvested field, with thick smoke rising against an evening sky" />
              <figcaption><strong>Rice straw</strong> Frequently burned in the field after harvest. This is the problem we want to help with.</figcaption>
            </figure>
          </div>
        </section>

        <StorageNotice />

        <section className="trust-band hv-trust" data-testid="photo-limitations">
          <div>
            <span className="eyebrow"><span className="eyebrow-dot" /> Honest about limits</span>
            <h2>A photo can only tell part of the story.</h2>
            <p>A photo can suggest what a material is and show visible clues. It cannot confirm moisture, quality, or energy value. Testing may still be needed before technical, safety, or commercial decisions.</p>
          </div>
          <Link href="/scan" className="button-primary hv-cta" data-testid="button-try-analysis">Scan material <ArrowRight size={16} /></Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
