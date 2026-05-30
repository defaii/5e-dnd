import * as cheerio from "cheerio";
import {
  mapAlignment,
  mapCreatureType,
  mapSize,
  normalizeKey,
  DAMAGE_MAP,
  CONDITION_MAP,
} from "../../mappings.mjs";
import { parseMeters, stripHtml } from "../../utils.mjs";

const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
const ABILITY_LABELS = {
  for: "str",
  str: "str",
  dex: "dex",
  con: "con",
  int: "int",
  sag: "wis",
  wis: "wis",
  sagesse: "wis",
  cha: "cha",
};

function parseTypeLine(text) {
  const sizeMatch = text.match(/taille\s*([A-Z]{1,2})|^(Tiny|Small|Medium|Large|Huge|Gargantuan|[A-Z]{1,2})\b/i);
  let size = "med";
  if (sizeMatch) size = mapSize(sizeMatch[1] ?? sizeMatch[2]);

  const alignmentPart = text.split(",").pop()?.trim() ?? "";
  const alignment = mapAlignment(alignmentPart);
  const creatureType = mapCreatureType(text);

  return { size, alignment, creatureType, typeLine: text };
}

function parseHp(text) {
  const match = text.match(/(\d+)\s*\(([^)]+)\)/);
  if (match) return { value: parseInt(match[1], 10), formula: match[2] };
  const simple = text.match(/(\d+)/);
  return { value: simple ? parseInt(simple[1], 10) : 10, formula: "2d8" };
}

function parseSpeed(text) {
  const movement = { walk: "0", units: "ft", hover: false, fly: null, swim: null, climb: null, burrow: null };
  const parts = text.split(",").map((p) => p.trim());

  for (const part of parts) {
    const lower = normalizeKey(part);
    if (lower.includes("vol")) {
      const ft = parseMeters(part) ?? parseFeet(part);
      movement.fly = { number: ft ?? 0, condition: lower.includes("stationnaire") ? "hover" : "" };
      movement.hover = lower.includes("stationnaire") || lower.includes("hover");
    } else if (lower.includes("nage") || lower.includes("swim")) {
      movement.swim = String(parseMeters(part) ?? parseFeet(part) ?? 0);
    } else if (lower.includes("escalade") || lower.includes("climb")) {
      movement.climb = String(parseMeters(part) ?? parseFeet(part) ?? 0);
    } else if (lower.includes("fouiss") || lower.includes("burrow")) {
      movement.burrow = String(parseMeters(part) ?? parseFeet(part) ?? 0);
    } else {
      const ft = parseMeters(part) ?? parseFeet(part);
      if (ft !== null) movement.walk = String(ft);
    }
  }
  return movement;
}

function parseFeet(text) {
  const match = text.match(/([\d,]+)\s*(ft|pieds)/i);
  return match ? Math.round(parseFloat(match[1].replace(",", "."))) : null;
}

function parseAbilities($, container) {
  const abilities = {};
  for (const key of ABILITY_KEYS) {
    abilities[key] = { value: 10, proficient: 0, max: null, bonuses: { check: "", save: "" }, mod: 0 };
  }

  container.find(".car1, .car4").each((_, el) => {
    const label = normalizeKey($(el).text());
    const key = ABILITY_LABELS[label];
    if (!key) return;
    const valueEl = $(el).next(".car2, .car5");
    const modEl = valueEl.next(".car3, .car6");
    const saveEl = modEl.next(".car3, .car6");
    const value = parseInt(valueEl.text(), 10) || 10;
    const modText = modEl.text().replace(/[()]/g, "");
    const mod = parseInt(modText, 10) || Math.floor((value - 10) / 2);
    const saveText = saveEl.text().replace(/[()]/g, "");
    const saveMod = parseInt(saveText, 10);
    abilities[key] = {
      value,
      proficient: saveMod !== mod ? 1 : 0,
      max: null,
      bonuses: { check: "", save: "" },
      mod,
    };
  });

  return abilities;
}

function parseCr(text) {
  const match = text.match(/(\d+(?:\/\d+)?)/);
  return match ? match[1] : "0";
}

function parseXp(text) {
  const match = text.match(/(\d[\d\s?]*)/);
  if (!match) return 0;
  return parseInt(match[1].replace(/[\s?]/g, ""), 10) || 0;
}

function splitList(text) {
  return text
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function mapDamageList(text) {
  return splitList(text)
    .map((part) => {
      const key = normalizeKey(part.replace(/d'attaques non magiques.*$/i, "").trim());
      for (const [fr, en] of Object.entries(DAMAGE_MAP)) {
        if (key.includes(normalizeKey(fr))) return en;
      }
      return null;
    })
    .filter(Boolean);
}

function mapConditionList(text) {
  const parts = text.split(";");
  const conditions = [];
  for (const part of parts) {
    const items = splitList(part);
    for (const item of items) {
      const key = normalizeKey(item);
      for (const [fr, en] of Object.entries(CONDITION_MAP)) {
        if (key.includes(fr)) {
          conditions.push(en);
          break;
        }
      }
    }
  }
  return [...new Set(conditions)];
}

function parseStatBlock($, isLegacy = false) {
  const name = $("h1").first().text().trim();
  const typeLine = $("div.type").first().text().trim();
  const { size, alignment, creatureType } = parseTypeLine(typeLine);

  const redBlock = $("div.red").first().length ? $("div.red").first() : $("div.jaune div.red").first();
  const redHtml = redBlock.html() ?? "";

  const acMatch = redHtml.match(/(?:CA|AC)<\/strong>\s*(\d+)/i);
  const hpMatch = redHtml.match(/(?:Pv|HP)<\/strong>\s*([^<]+)/i);
  const speedMatch = redHtml.match(/(?:Vitesse|Speed)<\/strong>\s*([^<]+)/i);
  const crMatch = redHtml.match(/(?:FP|CR)<\/strong>\s*([^<]+)/i);

  const resistMatch = redHtml.match(/(?:R[eé]sistances|Resistances)<\/strong>\s*([^<]+)/i);
  const immuneDmgMatch = redHtml.match(/Immunit[eé]s aux d[eé]g[aâ]ts<\/strong>\s*([^<;]+)/i);
  const immuneCondMatch = redHtml.match(/Immunit[eé]s aux [eé]tats<\/strong>\s*([^<;]+)/i);
  const immuneCombined = redHtml.match(/Immunit[eé]s<\/strong>\s*([^<]+)/i);
  const sensesMatch = redHtml.match(/(?:Sens|Senses)<\/strong>\s*([^<]+)/i);
  const languagesMatch = redHtml.match(/(?:Langues|Languages)<\/strong>\s*([^<]+)/i);
  const savesMatch = redHtml.match(/(?:Jets de sauvegarde|Saving Throws)<\/strong>\s*([^<]+)/i);

  const abilities = parseAbilities($, redBlock.length ? redBlock : $("div.jaune"));

  const traits = [];
  const actions = [];
  $("h2.rub, div.rub").each((_, heading) => {
    const section = normalizeKey($(heading).text());
    let el = $(heading).next();
    while (el.length && !el.is("h2.rub, div.rub")) {
      if (el.is("p")) {
        const html = el.html() ?? "";
        const plain = stripHtml(html);
        if (section.includes("action")) actions.push({ name: extractFeatureName(plain), html, plain });
        else traits.push({ name: extractFeatureName(plain), html, plain });
      }
      el = el.next();
    }
  });

  if (traits.length === 0 && actions.length === 0) {
    redBlock.nextAll("p").each((_, p) => {
      const html = $(p).html() ?? "";
      const plain = stripHtml(html);
      if (!plain) return;
      if (/^Actions$/i.test($(p).prev(".rub").text())) actions.push({ name: extractFeatureName(plain), html, plain });
      else traits.push({ name: extractFeatureName(plain), html, plain });
    });
  }

  const description = $("div.description").first().html() ?? "";
  const source = $("div.source").first().text().trim();
  const image = $("div.picture img").attr("src") ?? null;
  const initiativeMatch = redHtml.match(/Initiative<\/strong>\s*\+?(\d+)/i);

  let damageImmunities = [];
  let conditionImmunities = [];
  if (immuneCombined && !immuneDmgMatch) {
    const parts = immuneCombined[1].split(";");
    damageImmunities = mapDamageList(parts[0] ?? "");
    conditionImmunities = mapConditionList(parts.slice(1).join(";"));
  } else {
    damageImmunities = mapDamageList(immuneDmgMatch?.[1] ?? "");
    conditionImmunities = mapConditionList(immuneCondMatch?.[1] ?? "");
  }

  return {
    type: "monster",
    name,
    size,
    alignment,
    creatureType,
    typeLine,
    ac: acMatch ? parseInt(acMatch[1], 10) : 10,
    hp: parseHp(hpMatch?.[1] ?? "10"),
    speed: parseSpeed(speedMatch?.[1] ?? "9 m"),
    cr: parseCr(crMatch?.[1] ?? "0"),
    xp: parseXp(crMatch?.[1] ?? ""),
    abilities,
    savesText: savesMatch?.[1]?.trim() ?? "",
    resistances: mapDamageList(resistMatch?.[1] ?? ""),
    damageImmunities,
    conditionImmunities,
    sensesText: sensesMatch?.[1]?.trim() ?? "",
    languages: splitList(languagesMatch?.[1] ?? "common"),
    traits,
    actions,
    descriptionHtml: description,
    source,
    image: image ? new URL(image, "https://www.aidedd.org/monster/").href : null,
    initiative: initiativeMatch ? parseInt(initiativeMatch[1], 10) : null,
    isLegacy,
  };
}

function extractFeatureName(plain) {
  const match = plain.match(/^([^.]+?)(?:\.|\s-\s)/);
  return match ? match[1].replace(/\*\*/g, "").trim() : plain.slice(0, 40);
}

export function parseMonsterPage(html, url) {
  const $ = cheerio.load(html);
  const name = $("h1").first().text().trim();
  if (!name || $("p.warning").length) {
    throw new Error(`Monstre introuvable : ${url}`);
  }
  return parseStatBlock($, false);
}

export function parseMonsterLegacyPage(html, url) {
  const $ = cheerio.load(html);
  const name = $("h1").first().text().trim();
  if (!name) throw new Error(`Monstre introuvable : ${url}`);
  return parseStatBlock($, true);
}
