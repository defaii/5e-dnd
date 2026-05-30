/** Correspondances AideDD (FR) → dnd5e Foundry */

export const SCHOOL_MAP = {
  abjuration: "abj",
  conjuration: "con",
  invocation: "con",
  divination: "div",
  enchantement: "enc",
  evocation: "evo",
  illusion: "ill",
  necromancie: "nec",
  transmutation: "trs",
};

export const SIZE_MAP = {
  tp: "tiny",
  p: "sm",
  m: "med",
  g: "lg",
  tg: "huge",
  gig: "grg",
  tiny: "tiny",
  small: "sm",
  medium: "med",
  large: "lg",
  huge: "huge",
  gargantuan: "grg",
};

export const TYPE_MAP = {
  "aberration": "aberration",
  "bete": "beast",
  "bête": "beast",
  "celeste": "celestial",
  "céleste": "celestial",
  "construct": "construct",
  "artificiel": "construct",
  "dragon": "dragon",
  "elementaire": "elemental",
  "élémentaire": "elemental",
  "fee": "fey",
  "fée": "fey",
  "fiélon": "fiend",
  "fielon": "fiend",
  "geant": "giant",
  "géant": "giant",
  "humanoide": "humanoid",
  "humanoïde": "humanoid",
  "monstruosite": "monstrosity",
  "monstruosité": "monstrosity",
  "mort-vivant": "undead",
  "plante": "plant",
  "vase": "ooze",
};

export const ALIGNMENT_MAP = {
  "loyal bon": "lg",
  "neutre bon": "ng",
  "chaotique bon": "cg",
  "loyal neutre": "ln",
  "neutre": "n",
  "neutre strict": "n",
  "chaotique neutre": "cn",
  "loyal mauvais": "le",
  "neutre mauvais": "ne",
  "chaotique mauvais": "ce",
  "loyal mauvais": "le",
  "chaotique mauvais": "ce",
  "tout alignement": "n",
};

export const SKILL_MAP = {
  acrobaties: "acr",
  arcane: "arc",
  athletisme: "ath",
  athlétisme: "ath",
  discretion: "ste",
  discrétion: "ste",
  dressage: "ani",
  escamotage: "slt",
  histoire: "his",
  intimidation: "itm",
  investigation: "inv",
  medecine: "med",
  médecine: "med",
  nature: "nat",
  perception: "prc",
  perspicacite: "ins",
  perspicacité: "ins",
  persuasion: "per",
  religion: "rel",
  representation: "prf",
  représentation: "prf",
  survie: "sur",
};

export const CLASS_MAP = {
  barde: "bard",
  clerc: "cleric",
  druide: "druid",
  ensorceleur: "sorcerer",
  magicien: "wizard",
  moine: "monk",
  paladin: "paladin",
  rôdeur: "ranger",
  rodeur: "ranger",
  roublard: "rogue",
  barbare: "barbarian",
  guerrier: "fighter",
  occultiste: "warlock",
  artificier: "artificer",
};

export const CONDITION_MAP = {
  charmé: "charmed",
  charme: "charmed",
  effrayé: "frightened",
  effraye: "frightened",
  agrippé: "grappled",
  agrippe: "grappled",
  paralysé: "paralyzed",
  paralyse: "paralyzed",
  pétrifié: "petrified",
  petrifie: "petrified",
  empoisonné: "poisoned",
  empoisonne: "poisoned",
  "à terre": "prone",
  "a terre": "prone",
  entravé: "restrained",
  entrave: "restrained",
  épuisement: "exhaustion",
  epuisement: "exhaustion",
  invisible: "invisible",
  inconscient: "unconscious",
  étourdi: "stunned",
  etourdi: "stunned",
};

export const DAMAGE_MAP = {
  acide: "acid",
  contondant: "bludgeoning",
  foudre: "lightning",
  feu: "fire",
  force: "force",
  froid: "cold",
  necrotique: "necrotic",
  nécrotique: "necrotic",
  perforant: "piercing",
  poison: "poison",
  psychique: "psychic",
  radiance: "radiant",
  tranchant: "slashing",
  tonnerre: "thunder",
};

export const DEFAULT_PACK_BY_TYPE = {
  spell: "sorts",
  monster: "mobs",
  "monster-legacy": "mobs",
  race: "race",
  class: "classe",
  background: "Historique",
  feat: "dons",
  subclass: "Sousclasse",
  article: "dons",
};

export function normalizeKey(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function mapSchool(frenchSchool) {
  return SCHOOL_MAP[normalizeKey(frenchSchool)] ?? "evo";
}

export function mapSize(token) {
  return SIZE_MAP[normalizeKey(token)] ?? "med";
}

export function mapCreatureType(text) {
  const key = normalizeKey(text);
  for (const [fr, en] of Object.entries(TYPE_MAP)) {
    if (key.includes(normalizeKey(fr))) return en;
  }
  return "humanoid";
}

export function mapAlignment(text) {
  const key = normalizeKey(text);
  for (const [fr, en] of Object.entries(ALIGNMENT_MAP)) {
    if (key.includes(fr)) return en;
  }
  return "n";
}

export function mapSkill(frenchName) {
  return SKILL_MAP[normalizeKey(frenchName)] ?? null;
}

export function mapClass(frenchName) {
  return CLASS_MAP[normalizeKey(frenchName)] ?? slugClass(frenchName);
}

function slugClass(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}
