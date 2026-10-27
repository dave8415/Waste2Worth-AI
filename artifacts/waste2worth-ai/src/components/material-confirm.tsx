import { useMemo, useState, type FormEvent } from "react";
import { catalogEntry, searchableCatalog } from "@/lib/material-catalog";
import { scanDisplayName, scanMaterialId, type Assessment } from "@/lib/journey";

export function MaterialConfirmForm({
  scan,
  onConfirm,
}: {
  scan: Assessment;
  onConfirm: (confirmation: { materialId: string; materialName: string }) => void;
}) {
  const suggestedId = scanMaterialId(scan);
  const suggestedName = scanDisplayName(scan);
  const unmatched = suggestedId === "other-agricultural-residue" || suggestedId === "unknown";
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(unmatched ? "other-agricultural-residue" : suggestedId);
  const [customName, setCustomName] = useState(unmatched ? suggestedName : "");
  const options = useMemo(() => {
    const list = searchableCatalog(query);
    const selected = catalogEntry(selectedId);
    if (selected && !list.some(entry => entry.id === selectedId)) return [selected, ...list];
    return list;
  }, [query, selectedId]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const other = selectedId === "other-agricultural-residue";
    const name = other
      ? customName.trim() || suggestedName
      : catalogEntry(selectedId)?.label ?? suggestedName;
    onConfirm({
      materialId: other ? "other-agricultural-residue" : selectedId,
      materialName: name,
    });
  }

  return (
    <form className="material-confirm" onSubmit={submit} data-testid="form-confirm-material">
      <h3>{unmatched ? "Correct material" : "Please confirm the material"}</h3>
      <p className="muted-line" data-testid="text-suggested-material">Gemini’s suggested material: {suggestedName}</p>
      <label className="field">
        <span>Search materials</span>
        <input
          className="field-input"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search rice husk, sekam padi, sawdust…"
          data-testid="input-material-search"
        />
      </label>
      <label className="field">
        <span>Material</span>
        <select
          className="field-input"
          value={selectedId}
          onChange={event => setSelectedId(event.target.value)}
          data-testid="select-confirm-material"
        >
          {options.map(entry => (
            <option key={entry.id} value={entry.id}>{entry.label}</option>
          ))}
        </select>
      </label>
      {selectedId === "other-agricultural-residue" && (
        <label className="field">
          <span>Another material name</span>
          <input
            className="field-input"
            value={customName}
            onChange={event => setCustomName(event.target.value)}
            placeholder="Enter the material name"
            data-testid="input-custom-material-name"
          />
        </label>
      )}
      <button type="submit" className="button-secondary" data-testid="button-confirm-material">Confirm material</button>
    </form>
  );
}
