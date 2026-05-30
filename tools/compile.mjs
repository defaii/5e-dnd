#!/usr/bin/env node
/**
 * Compile les JSON source vers les packs LevelDB via @foundryvtt/foundryvtt-cli
 * Nécessite: npm install (avec optional dependency)
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { buildPackExports, ensureDir, getPaths } from "./lib/io.mjs";

async function runCompile() {
  const paths = getPaths();
  await ensureDir(paths.buildDir);

  const summary = await buildPackExports(paths.srcDir, paths.buildDir);
  if (summary.length === 0) {
    console.error("Aucun JSON dans tools/src/. Lancez d'abord: npm run import");
    process.exit(1);
  }

  console.log("Exports JSON prêts dans tools/build/ :\n");
  for (const s of summary) {
    console.log(`  ${s.pack}: ${s.count} docs → ${s.file}`);
  }

  console.log(`
Pour importer dans Foundry VTT :
  1. Ouvrez votre monde Foundry (dnd5e v13+)
  2. Ouvrez le compendium cible (ex: 5eSorts)
  3. Clic droit → Import Data → choisissez le fichier build/<pack>.json
  4. Cochez « Merge » pour mettre à jour sans écraser tout le pack

Alternative CLI (si @foundryvtt/foundryvtt-cli installé) :
  npx fvtt package pack --json tools/build/sorts.json --pack packs/sorts
`);
}

runCompile().catch((err) => {
  console.error(err);
  process.exit(1);
});
