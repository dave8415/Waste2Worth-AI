export const MATERIAL_CATEGORIES = [
  "rice residues",
  "corn residues",
  "sugarcane residues",
  "palm oil residues",
  "coconut residues",
  "coffee residues",
  "cocoa residues",
  "banana residues",
  "cassava residues",
  "peanut and legume residues",
  "fruit processing residues",
  "wood and forestry residues",
  "other agricultural residue",
  "unknown or unsupported material",
] as const;

export type MaterialCategory = typeof MATERIAL_CATEGORIES[number];

export const MATERIAL_IDS = [
  "rice-husk", "rice-straw", "rice-bran",
  "corn-cob", "corn-husk", "corn-stalk",
  "sugarcane-bagasse", "sugarcane-trash",
  "oil-palm-empty-fruit-bunch", "palm-kernel-shell", "palm-mesocarp-fiber", "oil-palm-frond", "oil-palm-trunk",
  "coconut-shell", "coconut-husk", "coconut-coir-dust",
  "coffee-husk", "coffee-pulp", "spent-coffee-grounds", "cocoa-pod-husk", "cocoa-bean-shell",
  "banana-pseudostem", "banana-leaf", "banana-peel", "cassava-peel", "cassava-stalk",
  "sawdust", "wood-chip", "wood-shaving", "wood-bark", "wood-offcut", "wood-pellet",
  "peanut-shell", "soybean-residue",
  "other-agricultural-residue", "unknown",
  "empty-fruit-bunch", "bagasse", "other",
] as const;

export type MaterialId = typeof MATERIAL_IDS[number];

export interface CatalogEntry {
  id: MaterialId;
  label: string;
  category: MaterialCategory;
  aliases: string[];
}

export const CATALOG: CatalogEntry[] = [
  { id: "rice-husk", label: "Rice husk", category: "rice residues", aliases: ["rice husk", "rice husks", "rice hull", "rice hulls", "sekam padi", "paddy husk"] },
  { id: "rice-straw", label: "Rice straw", category: "rice residues", aliases: ["rice straw", "jerami padi", "paddy straw"] },
  { id: "rice-bran", label: "Rice bran", category: "rice residues", aliases: ["rice bran", "bekatul", "dedak padi"] },
  { id: "corn-cob", label: "Corn cob", category: "corn residues", aliases: ["corn cob", "corn cobs", "maize cob", "tongkol jagung"] },
  { id: "corn-husk", label: "Corn husk", category: "corn residues", aliases: ["corn husk", "corn husks", "klobot jagung", "maize husk"] },
  { id: "corn-stalk", label: "Corn stalk", category: "corn residues", aliases: ["corn stalk", "corn stover", "batang jagung"] },
  { id: "sugarcane-bagasse", label: "Sugarcane bagasse", category: "sugarcane residues", aliases: ["sugarcane bagasse", "ampas tebu", "cane bagasse"] },
  { id: "sugarcane-trash", label: "Sugarcane trash", category: "sugarcane residues", aliases: ["sugarcane trash", "cane trash", "daun tebu"] },
  { id: "oil-palm-empty-fruit-bunch", label: "Oil palm empty fruit bunch", category: "palm oil residues", aliases: ["empty fruit bunch", "empty fruit bunches", "tandan kosong sawit", "tangkos", "efb", "palm fruit bunch"] },
  { id: "palm-kernel-shell", label: "Palm kernel shell", category: "palm oil residues", aliases: ["palm kernel shell", "palm kernel shells", "cangkang sawit", "pks", "palm shell"] },
  { id: "palm-mesocarp-fiber", label: "Palm mesocarp fiber", category: "palm oil residues", aliases: ["palm mesocarp fiber", "palm fibre", "serat sawit", "mesocarp fibre"] },
  { id: "oil-palm-frond", label: "Oil palm frond", category: "palm oil residues", aliases: ["oil palm frond", "palm frond", "pelepah sawit"] },
  { id: "oil-palm-trunk", label: "Oil palm trunk", category: "palm oil residues", aliases: ["oil palm trunk", "palm trunk", "batang sawit"] },
  { id: "coconut-shell", label: "Coconut shell", category: "coconut residues", aliases: ["coconut shell", "coconut shells", "tempurung kelapa"] },
  { id: "coconut-husk", label: "Coconut husk", category: "coconut residues", aliases: ["coconut husk", "coconut husks", "sabut kelapa"] },
  { id: "coconut-coir-dust", label: "Coconut coir dust", category: "coconut residues", aliases: ["coconut coir dust", "coco peat", "cocopeat", "serbuk sabut"] },
  { id: "coffee-husk", label: "Coffee husk", category: "coffee residues", aliases: ["coffee husk", "coffee husks", "kulit kopi"] },
  { id: "coffee-pulp", label: "Coffee pulp", category: "coffee residues", aliases: ["coffee pulp", "pulpa kopi"] },
  { id: "spent-coffee-grounds", label: "Spent coffee grounds", category: "coffee residues", aliases: ["spent coffee grounds", "coffee grounds", "ampas kopi"] },
  { id: "cocoa-pod-husk", label: "Cocoa pod husk", category: "cocoa residues", aliases: ["cocoa pod husk", "cocoa husk", "kulit kakao", "kulit buah kakao"] },
  { id: "cocoa-bean-shell", label: "Cocoa bean shell", category: "cocoa residues", aliases: ["cocoa bean shell", "cocoa shell", "kulit biji kakao"] },
  { id: "banana-pseudostem", label: "Banana pseudostem", category: "banana residues", aliases: ["banana pseudostem", "banana stem", "batang pisang"] },
  { id: "banana-leaf", label: "Banana leaf", category: "banana residues", aliases: ["banana leaf", "banana leaves", "daun pisang"] },
  { id: "banana-peel", label: "Banana peel", category: "banana residues", aliases: ["banana peel", "banana peels", "kulit pisang"] },
  { id: "cassava-peel", label: "Cassava peel", category: "cassava residues", aliases: ["cassava peel", "cassava peels", "kulit singkong", "kulit ubi kayu"] },
  { id: "cassava-stalk", label: "Cassava stalk", category: "cassava residues", aliases: ["cassava stalk", "cassava stem", "batang singkong"] },
  { id: "sawdust", label: "Sawdust", category: "wood and forestry residues", aliases: ["sawdust", "serbuk gergaji"] },
  { id: "wood-chip", label: "Wood chip", category: "wood and forestry residues", aliases: ["wood chip", "wood chips", "serpihan kayu"] },
  { id: "wood-shaving", label: "Wood shaving", category: "wood and forestry residues", aliases: ["wood shaving", "wood shavings", "tatal kayu"] },
  { id: "wood-bark", label: "Wood bark", category: "wood and forestry residues", aliases: ["wood bark", "tree bark", "kulit kayu"] },
  { id: "wood-offcut", label: "Wood offcut", category: "wood and forestry residues", aliases: ["wood offcut", "wood offcuts", "potongan kayu"] },
  { id: "wood-pellet", label: "Wood pellet", category: "wood and forestry residues", aliases: ["wood pellet", "wood pellets", "pelet kayu"] },
  { id: "peanut-shell", label: "Peanut shell", category: "peanut and legume residues", aliases: ["peanut shell", "peanut husk", "kulit kacang tanah"] },
  { id: "soybean-residue", label: "Soybean residue", category: "peanut and legume residues", aliases: ["soybean residue", "soybean husk", "ampas kedelai", "kulit kedelai"] },
  { id: "other-agricultural-residue", label: "Other agricultural residue", category: "other agricultural residue", aliases: ["other agricultural residue", "agricultural residue"] },
  { id: "unknown", label: "Unknown material", category: "unknown or unsupported material", aliases: [] },
];

export const LEGACY_MATERIALS: CatalogEntry[] = [
  { id: "empty-fruit-bunch", label: "Empty palm fruit bunches", category: "palm oil residues", aliases: [] },
  { id: "bagasse", label: "Sugarcane bagasse", category: "sugarcane residues", aliases: ["bagasse"] },
  { id: "other", label: "Other / uncertain material", category: "other agricultural residue", aliases: [] },
];

const CANONICAL_BY_LEGACY: Partial<Record<MaterialId, MaterialId>> = {
  "empty-fruit-bunch": "oil-palm-empty-fruit-bunch",
  bagasse: "sugarcane-bagasse",
  other: "other-agricultural-residue",
};

export const ALL_MATERIAL_ENTRIES: CatalogEntry[] = [...CATALOG, ...LEGACY_MATERIALS];

export const NON_RESIDUE_TERMS = [
  "gabah",
  "paddy rice",
  "paddy grain",
  "rice grain",
  "unmilled rice",
  "beras",
  "rice field",
  "standing crop",
] as const;

export type ResidueAssessment = "true" | "false" | "unknown";

export function isMaterialId(id: string | undefined): id is MaterialId {
  return Boolean(id && (MATERIAL_IDS as readonly string[]).includes(id));
}

export function normalizeMaterialText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasMaterialPhrase(text: string, phrase: string): boolean {
  const haystack = normalizeMaterialText(text).split(" ").filter(Boolean);
  const needle = normalizeMaterialText(phrase).split(" ").filter(Boolean);
  if (!needle.length || haystack.length < needle.length) return false;
  return haystack.some((_, index) =>
    needle.every((token, offset) => haystack[index + offset] === token),
  );
}

export function isNonResidueName(text: string | undefined): boolean {
  if (!text?.trim()) return false;
  return NON_RESIDUE_TERMS.some(term => hasMaterialPhrase(text, term));
}

function entryPhrases(entry: CatalogEntry): string[] {
  return [entry.id.replace(/-/g, " "), entry.label, ...entry.aliases];
}

export function catalogEntry(id: string | undefined): CatalogEntry | undefined {
  if (!id) return undefined;
  return ALL_MATERIAL_ENTRIES.find(entry => entry.id === id);
}

export function canonicalMaterialId(id: string | undefined): MaterialId | undefined {
  if (!isMaterialId(id)) return undefined;
  return CANONICAL_BY_LEGACY[id] ?? (CATALOG.some(entry => entry.id === id) ? id : id);
}

export function nameMatchesMaterial(name: string | undefined, id: string | undefined): boolean {
  if (!name?.trim() || !id) return false;
  const entry = catalogEntry(canonicalMaterialId(id) ?? id);
  if (!entry) return false;
  return entryPhrases(entry).some(phrase => hasMaterialPhrase(name, phrase));
}

export function inferCatalogId(text: string): MaterialId | "" {
  const value = text.trim();
  if (!value) return "";
  if (isNonResidueName(value)) return "";
  const slug = normalizeMaterialText(value).replace(/ /g, "-");
  if (isMaterialId(slug)) return canonicalMaterialId(slug) ?? slug;
  const matches = ALL_MATERIAL_ENTRIES
    .flatMap(entry => entryPhrases(entry).map(phrase => ({
      phrase,
      id: (CANONICAL_BY_LEGACY[entry.id] ?? entry.id) as MaterialId,
    })))
    .filter(item => item.phrase)
    .sort((a, b) => normalizeMaterialText(b.phrase).length - normalizeMaterialText(a.phrase).length);
  return matches.find(item => hasMaterialPhrase(value, item.phrase))?.id ?? "";
}

export function resolveMaterialId(materialId: string | undefined, ...names: Array<string | undefined>): MaterialId {
  const fromId = canonicalMaterialId(materialId);
  if (fromId) return fromId;
  for (const name of names) {
    const inferred = name ? inferCatalogId(name) : "";
    if (inferred) return inferred;
  }
  return "other-agricultural-residue";
}

export function materialDisplayName(id: string, fallback?: string): string {
  return catalogEntry(id)?.label ?? fallback ?? "Agricultural residue";
}

export function humanizeMaterialName(name: string | undefined, materialId?: string): string {
  const trimmed = name?.trim() ?? "";
  const slug = normalizeMaterialText(trimmed).replace(/ /g, "-");
  if (trimmed && isMaterialId(slug)) {
    return catalogEntry(canonicalMaterialId(slug) ?? slug)?.label ?? trimmed;
  }
  const entry = catalogEntry(materialId);
  if (entry && (!trimmed || slug === entry.id)) return entry.label;
  return trimmed || entry?.label || "Agricultural residue";
}

export function searchableCatalog(query: string): CatalogEntry[] {
  const needle = query.trim().toLowerCase();
  const list = CATALOG.filter(entry => entry.id !== "unknown");
  if (!needle) return list;
  return list.filter(entry =>
    entry.label.toLowerCase().includes(needle)
    || entry.id.includes(needle)
    || entry.aliases.some(alias => alias.includes(needle)),
  );
}

export function equivalentMaterialIds(id: string): MaterialId[] {
  const canonical = canonicalMaterialId(id) ?? (isMaterialId(id) ? id : "other-agricultural-residue");
  const group = (Object.entries(CANONICAL_BY_LEGACY) as Array<[MaterialId, MaterialId]>)
    .filter(([, value]) => value === canonical)
    .map(([legacy]) => legacy);
  return [...new Set([canonical, ...(isMaterialId(id) ? [id] : []), ...group])];
}

export function needsMaterialConfirmation(input: {
  confidence?: string;
  materialId?: string;
  needsUserConfirmation?: boolean;
  confirmed?: boolean;
  isAgriculturalResidue?: ResidueAssessment;
}): boolean {
  if (input.confirmed) return false;
  const id = canonicalMaterialId(input.materialId) ?? input.materialId;
  if (input.needsUserConfirmation) return true;
  if (input.isAgriculturalResidue === "false" || input.isAgriculturalResidue === "unknown") return true;
  if (input.confidence === "medium" || input.confidence === "low") return true;
  return id === "other-agricultural-residue" || id === "unknown" || id === "other";
}
