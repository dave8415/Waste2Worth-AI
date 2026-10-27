import { BookOpen } from "lucide-react";
import {
  hasVerifiedNumericReference,
  lookupMaterialReference,
  referenceItems,
  REFERENCE_GUIDANCE,
  REFERENCE_HEADLINE,
  REFERENCE_UNAVAILABLE,
} from "@/lib/material-reference";

export function MaterialReferenceCard({ wasteType, materialId }: { wasteType: string; materialId?: string }) {
  const reference = lookupMaterialReference(wasteType, materialId);
  if (!reference || !hasVerifiedNumericReference(reference)) {
    return (
      <p className="reference-unavailable" data-testid="text-reference-unavailable">{REFERENCE_UNAVAILABLE}</p>
    );
  }
  return (
    <section className="result-block reference-card" data-testid="section-typical-reference">
      <h3>Typical reference values</h3>
      <p className="reference-headline" data-testid="text-reference-headline">{REFERENCE_HEADLINE}</p>
      <dl className="reference-grid" data-testid="list-reference-values">
        {referenceItems(reference).map(item => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd data-testid={`text-reference-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>{item.value}</dd>
            {item.detail && <small>{item.detail}</small>}
          </div>
        ))}
      </dl>
      {reference.combustionRisks?.length ? (
        <p className="reference-note" data-testid="text-reference-combustion">{reference.combustionRisks.join(" ")}</p>
      ) : null}
      {reference.processing?.length ? (
        <p className="reference-note" data-testid="text-reference-processing">{reference.processing.join(" ")}</p>
      ) : null}
      <a
        className="reference-source"
        href={reference.source.urls[0]}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="link-reference-source"
      >
        <BookOpen size={12} /> Source: {reference.source.label}
        {reference.source.year ? ` (${reference.source.year})` : ""}
      </a>
      <p className="reference-guidance" data-testid="text-reference-guidance">{REFERENCE_GUIDANCE}</p>
    </section>
  );
}
