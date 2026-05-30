#!/usr/bin/env node
/**
 * Import AideDD → Foundry dnd5e
 *
 * Usage:
 *   npm run import              # importe import-config.json
 *   npm run import -- --dry-run   # parse sans écrire
 *   npm run import -- --url=https://www.aidedd.org/dnd/sorts.php?vf=...
 */

import path from "node:path";
import { fetchAideDD } from "./lib/aidedd/client.mjs";
import { detectContentType, resolvePack } from "./lib/aidedd/detect.mjs";
import { parseSpellPage } from "./lib/aidedd/parsers/spell.mjs";
import { parseMonsterPage, parseMonsterLegacyPage } from "./lib/aidedd/parsers/monster.mjs";
import { parseArticlePage } from "./lib/aidedd/parsers/article.mjs";
import { buildSpellDocument, buildItemFromArticle } from "./lib/foundry/builders/item.mjs";
import { buildActorDocument } from "./lib/foundry/builders/actor.mjs";
import { loadConfig, writeDocument, writeActorBundle, buildPackExports, ensureDir, cleanOutput, getPaths } from "./lib/io.mjs";
import { sleep } from "./lib/utils.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const clean = args.includes("--clean");
const singleUrl = args.find((a) => a.startsWith("--url="))?.split("=").slice(1).join("=");
const configPath = args.find((a) => a.startsWith("--config="))?.replace("--config=", "") ?? undefined;

async function parseEntry(url, html, contentType) {
  switch (contentType) {
    case "spell":
      return { parsed: parseSpellPage(html, url), docType: "Item" };
    case "monster":
      return { parsed: parseMonsterPage(html, url), docType: "Actor" };
    case "monster-legacy":
      return { parsed: parseMonsterLegacyPage(html, url), docType: "Actor" };
    case "race":
    case "class":
    case "background":
    case "feat":
    case "subclass":
    case "article":
      return { parsed: parseArticlePage(html, url), docType: "Item" };
    default:
      throw new Error(`Type de contenu non supporté pour ${url}`);
  }
}

function buildDocument(parsed, contentType, rules) {
  if (contentType === "spell") return buildSpellDocument(parsed, rules);
  if (contentType === "monster" || contentType === "monster-legacy") return buildActorDocument(parsed, rules);
  return buildItemFromArticle(parsed, rules);
}

async function importEntry(entry, rules, paths) {
  const url = entry.url;
  const contentType = detectContentType(url);
  if (contentType === "unknown") throw new Error(`URL non reconnue : ${url}`);

  const pack = resolvePack(entry, contentType);
  console.log(`→ ${contentType.padEnd(16)} | ${pack.padEnd(12)} | ${url}`);

  const html = await fetchAideDD(url);
  const { parsed } = await parseEntry(url, html, contentType);
  const document = buildDocument(parsed, contentType, rules);

  if (dryRun) {
    console.log(`  ✓ ${document.name} (${document.type})`);
    return { pack, document, dryRun: true };
  }

  let filename;
  if (document.type === "npc") {
    filename = await writeActorBundle(paths.srcDir, document, pack);
  } else {
    filename = await writeDocument(paths.srcDir, document, pack);
  }

  console.log(`  ✓ ${document.name} → src/${pack}/${filename}`);
  return { pack, document, filename };
}

async function main() {
  const paths = getPaths();
  if (clean && !dryRun) {
    await cleanOutput(paths.srcDir);
    await cleanOutput(paths.buildDir);
    console.log("Dossiers src/ et build/ nettoyés.\n");
  } else {
    await ensureDir(paths.srcDir);
    await ensureDir(paths.buildDir);
  }

  let entries = [];
  let rules = "2024";

  if (singleUrl) {
    entries = [{ url: singleUrl }];
  } else {
    const config = await loadConfig(configPath);
    rules = config.rules ?? "2024";
    entries = config.entries ?? [];
  }

  if (entries.length === 0) {
    console.error("Aucune entrée dans import-config.json");
    process.exit(1);
  }

  console.log(`Import AideDD → Foundry (${entries.length} entrée(s), rules=${rules})`);
  if (dryRun) console.log("Mode dry-run : aucun fichier écrit\n");

  const results = [];
  const errors = [];

  for (let i = 0; i < entries.length; i++) {
    try {
      results.push(await importEntry(entries[i], rules, paths));
    } catch (err) {
      errors.push({ url: entries[i].url, error: err.message });
      console.error(`  ✗ ${entries[i].url}: ${err.message}`);
    }
    if (i < entries.length - 1) await sleep(400);
  }

  if (!dryRun && results.length > 0) {
    const summary = await buildPackExports(paths.srcDir, paths.buildDir);
    console.log("\nExports compendium (build/) :");
    for (const s of summary) {
      console.log(`  • ${s.pack}: ${s.count} document(s) → ${path.relative(paths.toolsRoot, s.file)}`);
    }
  }

  console.log(`\nTerminé : ${results.length} ok, ${errors.length} erreur(s).`);
  if (errors.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
