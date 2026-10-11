/** Curated demo coverage, not a complete administrative gazetteer. */
export const PROVINCE_CITIES: Record<string, readonly string[]> = {
  "DKI Jakarta": ["Jakarta", "Central Jakarta", "North Jakarta", "West Jakarta", "South Jakarta", "East Jakarta", "Thousand Islands Regency"],
  "West Java": ["Bandung", "Bandung Regency", "West Bandung Regency", "Karawang", "Bekasi", "Bekasi Regency", "Bogor", "Bogor Regency", "Cianjur", "Garut", "Subang", "Indramayu", "Cirebon", "Sukabumi", "Tasikmalaya"],
  "Central Java": ["Semarang", "Semarang Regency", "Surakarta", "Banyumas", "Cilacap", "Demak", "Kendal", "Klaten", "Kudus", "Magelang", "Pati", "Purworejo", "Sragen", "Tegal"],
  "East Java": ["Surabaya", "Malang", "Malang Regency", "Banyuwangi", "Blitar", "Bojonegoro", "Gresik", "Jember", "Kediri", "Lamongan", "Lumajang", "Madiun", "Mojokerto", "Pasuruan", "Sidoarjo", "Tuban"],
  "North Sumatra": ["Medan", "Deli Serdang", "Langkat", "Asahan", "Simalungun", "Labuhanbatu", "Binjai", "Pematangsiantar"],
  "Riau": ["Pekanbaru", "Dumai", "Kampar", "Siak", "Pelalawan", "Rokan Hulu", "Rokan Hilir", "Indragiri Hilir"],
  "West Kalimantan": ["Pontianak", "Kubu Raya", "Ketapang", "Sambas", "Sanggau", "Sintang", "Mempawah", "Singkawang"],
  "Banten": ["Serang", "Serang Regency", "Tangerang", "Tangerang Regency", "South Tangerang", "Cilegon", "Lebak", "Pandeglang"],
  "Lampung": ["Bandar Lampung", "Metro", "Central Lampung", "South Lampung", "East Lampung", "North Lampung"],
  "South Sumatra": ["Palembang", "Banyuasin", "Musi Banyuasin", "Ogan Komering Ilir", "Muara Enim"],
  "Jambi": ["Jambi", "Muaro Jambi", "Batang Hari", "Tanjung Jabung Barat", "Tanjung Jabung Timur"],
  "Bali": ["Denpasar", "Badung", "Gianyar", "Tabanan", "Buleleng", "Karangasem"],
  "Special Region of Yogyakarta": ["Yogyakarta", "Bantul", "Sleman", "Kulon Progo", "Gunungkidul"],
  "South Sulawesi": ["Makassar", "Maros", "Gowa", "Bone", "Wajo", "Pinrang"],
  "East Kalimantan": ["Samarinda", "Balikpapan", "Kutai Kartanegara", "East Kutai", "Paser"],
};
export const PROVINCES = Object.keys(PROVINCE_CITIES);
export function isValidLocation(province: string, city: string): boolean {
  return !!PROVINCE_CITIES[province]?.includes(city.trim());
}
export function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
