import { DEFAULT_PACK_BY_TYPE } from "../mappings.mjs";

const URL_PATTERNS = [
  { type: "spell", test: /\/dnd\/sorts\.php/i },
  { type: "monster-legacy", test: /\/dnd\/monstres\.php/i },
  { type: "monster", test: /\/monster\/(?:fr\/|[a-z-]+)/i },
  { type: "race", test: /\/regles\/races\//i },
  { type: "class", test: /\/regles\/classes\//i },
  { type: "background", test: /\/regles\/historiques\//i },
  { type: "feat", test: /\/regles\/personnalisation\//i },
  { type: "subclass", test: /\/regles\/classes\/[^/]+\/[^/]+\//i },
];

export function detectContentType(url) {
  for (const pattern of URL_PATTERNS) {
    if (pattern.test.test(url)) return pattern.type;
  }
  if (url.includes("/regles/")) return "article";
  return "unknown";
}

export function resolvePack(entry, contentType) {
  if (entry.pack) return entry.pack;
  return DEFAULT_PACK_BY_TYPE[contentType] ?? "dons";
}

export function resolveDocumentType(contentType) {
  switch (contentType) {
    case "spell":
      return "Item";
    case "monster":
    case "monster-legacy":
      return "Actor";
    default:
      return "Item";
  }
}
