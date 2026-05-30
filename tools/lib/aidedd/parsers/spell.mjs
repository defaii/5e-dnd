import * as cheerio from "cheerio";
import { mapSchool, mapClass } from "../../mappings.mjs";
import { stripHtml } from "../../utils.mjs";

const ACTIVATION_MAP = {
  action: "action",
  "action bonus": "bonus",
  "1 action bonus": "bonus",
  "1 action": "action",
  reaction: "reaction",
  minute: "minute",
  minutes: "minute",
  heure: "hour",
  heures: "hour",
  rituel: "ritual",
};

const DURATION_MAP = {
  instantanee: "inst",
  instantanée: "inst",
  instantaneous: "inst",
  minute: "minute",
  minutes: "minute",
  heure: "hour",
  heures: "hour",
  jour: "day",
  jours: "day",
  concentration: "conc",
};

function normalize(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseLevelSchool(text) {
  const match = text.match(/niveau\s*(\d+|cantrip)\s*[-–]\s*(.+)/i);
  if (!match) return { level: 0, school: "evo", schoolLabel: text };
  const level = match[1].toLowerCase() === "cantrip" ? 0 : parseInt(match[1], 10);
  const schoolLabel = match[2].trim();
  return { level, school: mapSchool(schoolLabel), schoolLabel };
}

function parseRange(text) {
  const t = normalize(text);
  if (t.includes("personnelle") || t.includes("self")) return { value: "self", units: "self" };
  const touch = t.includes("contact") || t.includes("touch");
  if (touch) return { value: "touch", units: "touch" };
  const m = text.match(/([\d,]+)\s*m/i);
  if (m) return { value: String(Math.round((parseFloat(m[1].replace(",", ".")) * 10) / 3)), units: "ft" };
  const ft = text.match(/([\d,]+)\s*(ft|pieds|feet)/i);
  if (ft) return { value: ft[1].replace(",", "."), units: "ft" };
  return { value: "30", units: "ft" };
}

function parseDuration(text) {
  const t = normalize(text);
  const concentration = t.includes("concentration");
  let units = "inst";
  let value = "";

  if (concentration) {
    units = "minute";
    const m = text.match(/(\d+)\s*minute/i);
    value = m ? m[1] : "10";
    return { units, value, concentration: true };
  }

  if (t.includes("instantan")) return { units: "inst", value: "", concentration: false };
  const hour = text.match(/(\d+)\s*heure/i);
  if (hour) return { units: "hour", value: hour[1], concentration: false };
  const min = text.match(/(\d+)\s*minute/i);
  if (min) return { units: "minute", value: min[1], concentration: false };
  const day = text.match(/(\d+)\s*jour/i);
  if (day) return { units: "day", value: day[1], concentration: false };

  return { units, value, concentration: false };
}

function parseActivation(text) {
  const t = normalize(text);
  if (t.includes("action bonus") || t.includes("1 action bonus")) {
    return { type: "bonus", value: null };
  }
  for (const [key, value] of Object.entries(ACTIVATION_MAP)) {
    if (key === "action bonus" || key === "1 action bonus") continue;
    if (t.includes(key)) {
      const minuteMatch = text.match(/(\d+)\s*minute/i);
      if (value === "minute" && minuteMatch) {
        return { type: "minute", value: parseInt(minuteMatch[1], 10) };
      }
      return { type: value, value: null };
    }
  }
  return { type: "action", value: null };
}

function parseComponents(text) {
  const props = [];
  if (/V\b|vocal/i.test(text)) props.push("vocal");
  if (/S\b|somati/i.test(text)) props.push("somatic");
  if (/M\b|materi|matéri/i.test(text)) props.push("material");
  return props;
}

function parseClasses($) {
  const classes = [];
  $("div.classe, div.tcoe").each((_, el) => {
    const name = $(el).text().trim();
    if (name) classes.push(name);
  });
  return classes;
}

function parseHigherLevels(html) {
  const match = html.match(/Aux niveaux supérieurs[\s\S]*?(?=<br><\/div>|$)/i);
  return match ? match[0].replace(/<\/?[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
}

export function parseSpellPage(html, url) {
  const $ = cheerio.load(html);
  const name = $("h1").first().text().trim();
  if (!name || $("p.warning").length) {
    throw new Error(`Sort introuvable : ${url}`);
  }

  const ecoleText = $("div.ecole").first().text().trim();
  const { level, school, schoolLabel } = parseLevelSchool(ecoleText);
  const castingTime = $("div.t").first().text().replace(/^Temps d'incantation\s*:\s*/i, "").trim();
  const rangeText = $("div.r").first().text().replace(/^Portée\s*:\s*/i, "").trim();
  const componentsText = $("div.c").first().text().replace(/^Composantes\s*:\s*/i, "").trim();
  const durationText = $("div.d").first().text().replace(/^Durée\s*:\s*/i, "").trim();
  const descriptionHtml = $("div.description").first().html() ?? "";
  const source = $("div.source").first().text().trim();
  const classes = parseClasses($);
  const higher = parseHigherLevels(descriptionHtml);

  return {
    type: "spell",
    name,
    level,
    school,
    schoolLabel,
    activation: parseActivation(castingTime),
    activationLabel: castingTime,
    range: parseRange(rangeText),
    rangeLabel: rangeText,
    properties: parseComponents(componentsText),
    componentsLabel: componentsText,
    duration: parseDuration(durationText),
    durationLabel: durationText,
    descriptionHtml,
    higherLevels: higher,
    source,
    classes: classes.map(mapClass),
    classLabels: classes,
    url,
  };
}

export function parseSpellPageFromLegacy(html, url) {
  return parseSpellPage(html, url);
}
