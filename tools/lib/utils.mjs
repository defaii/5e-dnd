/** Utilitaires partagés pour l'import AideDD → Foundry */

export function generateId(length = 16) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < length; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Convertit les mètres AideDD en pieds D&D (1,5 m ≈ 5 ft) */
export function metersToFeet(meters) {
  const n = parseFloat(String(meters).replace(",", "."));
  if (Number.isNaN(n)) return 0;
  return Math.round((n * 10) / 3);
}

export function parseMeters(text) {
  const match = String(text).match(/([\d,]+)\s*m/i);
  return match ? metersToFeet(match[1]) : null;
}

export function stripHtml(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function toProseHtml(html) {
  const cleaned = html
    .replace(/src="assets\//g, 'src="https://www.aidedd.org/assets/')
    .replace(/src="\/assets\//g, 'src="https://www.aidedd.org/assets/')
    .replace(/href="\/regles\//g, 'href="https://www.aidedd.org/regles/');
  return `<div class="prose">${cleaned}</div>`;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
