export const PREFERRED_MATERIAL_IDS = [
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
] as const;

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

interface CatalogAlias {
  id: string;
  label: string;
  aliases: string[];
}

const LEGACY: Record<string, string> = {
  "empty-fruit-bunch": "oil-palm-empty-fruit-bunch",
  bagasse: "sugarcane-bagasse",
  other: "other-agricultural-residue",
};

const CATALOG: CatalogAlias[] = [
  { id: "rice-husk", label: "Rice husk", aliases: ["rice husk", "rice husks", "rice hull", "rice hulls", "sekam padi", "paddy husk"] },
  { id: "rice-straw", label: "Rice straw", aliases: ["rice straw", "jerami padi", "paddy straw"] },
  { id: "rice-bran", label: "Rice bran", aliases: ["rice bran", "bekatul", "dedak padi"] },
  { id: "corn-cob", label: "Corn cob", aliases: ["corn cob", "corn cobs", "maize cob", "tongkol jagung"] },
  { id: "corn-husk", label: "Corn husk", aliases: ["corn husk", "corn husks", "klobot jagung", "maize husk"] },
  { id: "corn-stalk", label: "Corn stalk", aliases: ["corn stalk", "corn stover", "batang jagung"] },
  { id: "sugarcane-bagasse", label: "Sugarcane bagasse", aliases: ["sugarcane bagasse", "ampas tebu", "cane bagasse"] },
  { id: "sugarcane-trash", label: "Sugarcane trash", aliases: ["sugarcane trash", "cane trash", "daun tebu"] },
  { id: "oil-palm-empty-fruit-bunch", label: "Oil palm empty fruit bunch", aliases: ["empty fruit bunch", "empty fruit bunches", "tandan kosong sawit", "tangkos", "efb", "palm fruit bunch"] },
  { id: "palm-kernel-shell", label: "Palm kernel shell", aliases: ["palm kernel shell", "palm kernel shells", "cangkang sawit", "pks", "palm shell"] },
  { id: "palm-mesocarp-fiber", label: "Palm mesocarp fiber", aliases: ["palm mesocarp fiber", "palm fibre", "serat sawit", "mesocarp fibre"] },
  { id: "oil-palm-frond", label: "Oil palm frond", aliases: ["oil palm frond", "palm frond", "pelepah sawit"] },
  { id: "oil-palm-trunk", label: "Oil palm trunk", aliases: ["oil palm trunk", "palm trunk", "batang sawit"] },
  { id: "coconut-shell", label: "Coconut shell", aliases: ["coconut shell", "coconut shells", "tempurung kelapa"] },
  { id: "coconut-husk", label: "Coconut husk", aliases: ["coconut husk", "coconut husks", "sabut kelapa"] },
  { id: "coconut-coir-dust", label: "Coconut coir dust", aliases: ["coconut coir dust", "coco peat", "cocopeat", "serbuk sabut"] },
  { id: "coffee-husk", label: "Coffee husk", aliases: ["coffee husk", "coffee husks", "kulit kopi"] },
  { id: "coffee-pulp", label: "Coffee pulp", aliases: ["coffee pulp", "pulpa kopi"] },
  { id: "spent-coffee-grounds", label: "Spent coffee grounds", aliases: ["spent coffee grounds", "coffee grounds", "ampas kopi"] },
  { id: "cocoa-pod-husk", label: "Cocoa pod husk", aliases: ["cocoa pod husk", "cocoa husk", "kulit kakao", "kulit buah kakao"] },
  { id: "cocoa-bean-shell", label: "Cocoa bean shell", aliases: ["cocoa bean shell", "cocoa shell", "kulit biji kakao"] },
  { id: "banana-pseudostem", label: "Banana pseudostem", aliases: ["banana pseudostem", "banana stem", "batang pisang"] },
  { id: "banana-leaf", label: "Banana leaf", aliases: ["banana leaf", "banana leaves", "daun pisang"] },
  { id: "banana-peel", label: "Banana peel", aliases: ["banana peel", "banana peels", "kulit pisang"] },
  { id: "cassava-peel", label: "Cassava peel", aliases: ["cassava peel", "cassava peels", "kulit singkong", "kulit ubi kayu"] },
  { id: "cassava-stalk", label: "Cassava stalk", aliases: ["cassava stalk", "cassava stem", "batang singkong"] },
  { id: "sawdust", label: "Sawdust", aliases: ["sawdust", "serbuk gergaji"] },
  { id: "wood-chip", label: "Wood chip", aliases: ["wood chip", "wood chips", "serpihan kayu"] },
  { id: "wood-shaving", label: "Wood shaving", aliases: ["wood shaving", "wood shavings", "tatal kayu"] },
  { id: "wood-bark", label: "Wood bark", aliases: ["wood bark", "tree bark", "kulit kayu"] },
  { id: "wood-offcut", label: "Wood offcut", aliases: ["wood offcut", "wood offcuts", "potongan kayu"] },
  { id: "wood-pellet", label: "Wood pellet", aliases: ["wood pellet", "wood pellets", "pelet kayu"] },
  { id: "peanut-shell", label: "Peanut shell", aliases: ["peanut shell", "peanut husk", "kulit kacang tanah"] },
  { id: "soybean-residue", label: "Soybean residue", aliases: ["soybean residue", "soybean husk", "ampas kedelai", "kulit kedelai"] },
  { id: "other-agricultural-residue", label: "Other agricultural residue", aliases: ["other agricultural residue", "agricultural residue"] },
  { id: "unknown", label: "Unknown material", aliases: [] },
];

const CANONICAL = new Set<string>(PREFERRED_MATERIAL_IDS);

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

function catalogEntry(id: string | undefined): CatalogAlias | undefined {
  if (!id) return undefined;
  const canonical = LEGACY[id] ?? id;
  return CATALOG.find(entry => entry.id === canonical);
}

function entryPhrases(entry: CatalogAlias): string[] {
  return [entry.id.replace(/-/g, " "), entry.label, ...entry.aliases];
}

export function canonicalMaterialId(id: string | undefined): string | undefined {
  if (!id) return undefined;
  const slug = id.trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (!slug) return undefined;
  if (LEGACY[slug]) return LEGACY[slug];
  if (CANONICAL.has(slug)) return slug;
  return undefined;
}

export function nameMatchesMaterial(name: string | undefined, id: string | undefined): boolean {
  const entry = catalogEntry(canonicalMaterialId(id) ?? id);
  if (!name?.trim() || !entry) return false;
  return entryPhrases(entry).some(phrase => hasMaterialPhrase(name, phrase));
}

export function inferCatalogId(text: string): string {
  const value = text.trim();
  if (!value) return "";
  if (isNonResidueName(value)) return "";
  const slug = normalizeMaterialText(value).replace(/ /g, "-");
  const fromSlug = canonicalMaterialId(slug);
  if (fromSlug) return fromSlug;
  const matches = CATALOG
    .flatMap(entry => entryPhrases(entry).map(phrase => ({ phrase, id: entry.id })))
    .filter(item => item.phrase)
    .sort((a, b) => normalizeMaterialText(b.phrase).length - normalizeMaterialText(a.phrase).length);
  return matches.find(item => hasMaterialPhrase(value, item.phrase))?.id ?? "";
}

export function humanizeMaterialName(name: string | undefined, materialId?: string): string {
  const trimmed = name?.trim() ?? "";
  const slug = normalizeMaterialText(trimmed).replace(/ /g, "-");
  const fromSlug = canonicalMaterialId(slug);
  if (trimmed && fromSlug) return catalogEntry(fromSlug)?.label ?? trimmed;
  const entry = catalogEntry(materialId);
  if (entry && (!trimmed || slug === entry.id)) return entry.label;
  return trimmed || entry?.label || "Agricultural residue";
}

export function coerceResidueFlag(value: unknown): ResidueAssessment | undefined {
  if (value === true || value === "true") return "true";
  if (value === false || value === "false") return "false";
  if (value === "unknown") return "unknown";
  return undefined;
}
