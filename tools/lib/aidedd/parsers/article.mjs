import * as cheerio from "cheerio";
import { mapSkill, normalizeKey } from "../../mappings.mjs";
import { stripHtml } from "../../utils.mjs";

function detectArticleType(url, title) {
  const path = new URL(url).pathname;
  if (path.includes("/regles/races/")) return "race";
  if (path.includes("/regles/classes/")) return "class";
  if (path.includes("/regles/historiques/")) return "background";
  if (path.includes("/regles/personnalisation/")) return "feat";
  if (path.includes("sous-classe") || path.includes("archétype") || path.includes("arcane")) return "subclass";
  if (normalizeKey(title).includes("voie ") || normalizeKey(title).includes("serment")) return "subclass";
  return "article";
}

function parseBackgroundProficiencies(contentText) {
  const skills = [];
  const tools = [];
  const skillMatch = contentText.match(/Comp[eé]tences ma[iî]tris[eé]es\s*:\s*([^\n<]+)/i);
  const toolMatch = contentText.match(/Outils ma[iî]tris[eé]s\s*:\s*([^\n<]+)/i);

  if (skillMatch) {
    for (const part of skillMatch[1].split(",")) {
      const mapped = mapSkill(part.trim());
      if (mapped) skills.push(`skills:${mapped}`);
    }
  }
  if (toolMatch) {
    for (const part of toolMatch[1].split(",")) {
      tools.push(part.trim());
    }
  }
  return { skills, tools };
}

function parseRaceTraits($) {
  const traits = [];
  $("h3, h4").each((_, el) => {
    const title = $(el).text().trim();
    if (/^(Bec|Gardiens|Traits|Patrie|Grand dessein|Cr[eé]er)/i.test(title)) return;
    const next = $(el).nextUntil("h2, h3, h4");
    const html = next.map((__, n) => $.html(n)).get().join("");
    if (title.length > 2 && html.trim()) {
      traits.push({ title, html });
    }
  });
  return traits;
}

function parseClassIdentifier(url, title) {
  const slug = url.split("/").filter(Boolean).pop()?.replace(/\.php$/, "") ?? "";
  if (slug && slug !== "classes") return slug;
  return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function parseArticlePage(html, url) {
  const $ = cheerio.load(html);
  const name = $("article h1").first().text().trim() || $("h1").first().text().trim();
  if (!name) throw new Error(`Page introuvable : ${url}`);

  const articleType = detectArticleType(url, name);
  const contentHtml = $("article .content").first().html() ?? $(".content").first().html() ?? "";
  const contentText = stripHtml(contentHtml);

  const result = {
    type: articleType,
    name,
    url,
    descriptionHtml: contentHtml,
    source: "AideDD",
  };

  if (articleType === "background") {
    result.proficiencies = parseBackgroundProficiencies(contentText);
    const featureMatch = contentHtml.match(/<h4>Capacit[eé]\s*:\s*([^<]+)<\/h4>/i);
    result.featureName = featureMatch?.[1]?.trim() ?? null;
  }

  if (articleType === "race") {
    result.traits = parseRaceTraits($);
  }

  if (articleType === "class") {
    result.classIdentifier = parseClassIdentifier(url, name);
    const hdMatch = contentText.match(/DV\s*:\s*1d(\d+)/i);
    result.hitDie = hdMatch ? parseInt(hdMatch[1], 10) : 8;
    const saveMatch = contentText.match(/Jets de sauvegarde\s*:\s*([^\n]+)/i);
    result.savesText = saveMatch?.[1] ?? "";
  }

  if (articleType === "subclass") {
    const classMatch = contentText.match(/(barbare|clerc|druide|ensorceleur|magicien|moine|paladin|r[oô]deur|roublard|guerrier|occultiste|artificier|barde)/i);
    result.parentClass = classMatch?.[1] ?? "barbarian";
  }

  return result;
}
