import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { slugify } from "./utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOLS_ROOT = path.resolve(__dirname, "..");
const MODULE_ROOT = path.resolve(TOOLS_ROOT, "..");

export async function loadConfig(configPath = path.join(TOOLS_ROOT, "import-config.json")) {
  const raw = await readFile(configPath, "utf8");
  return JSON.parse(raw);
}

export async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

export async function writeDocument(outputDir, doc, packName) {
  const packDir = path.join(outputDir, packName);
  await ensureDir(packDir);
  const filename = `${slugify(doc.name) || doc._id}.json`;
  await writeFile(path.join(packDir, filename), JSON.stringify(doc, null, 2), "utf8");
  return filename;
}

export async function writeActorBundle(outputDir, actorDoc, packName) {
  const packDir = path.join(outputDir, packName);
  await ensureDir(packDir);
  const items = actorDoc.items ?? [];
  const actorOnly = { ...actorDoc };
  delete actorOnly.items;

  const bundle = {
    actor: actorOnly,
    items,
    importHint: "Importez via Foundry : Import Data sur le compendium mobs.",
  };

  const filename = `${slugify(actorDoc.name) || actorDoc._id}.json`;
  await writeFile(path.join(packDir, filename), JSON.stringify(bundle, null, 2), "utf8");
  return filename;
}

export async function cleanOutput(dir) {
  await rm(dir, { recursive: true, force: true });
  await ensureDir(dir);
}

export async function buildPackExports(srcDir, buildDir) {
  await ensureDir(buildDir);
  const packs = await readdir(srcDir, { withFileTypes: true });
  const summary = [];

  for (const pack of packs) {
    if (!pack.isDirectory()) continue;
    const packPath = path.join(srcDir, pack.name);
    const files = (await readdir(packPath)).filter((f) => f.endsWith(".json"));
    const documents = [];

    for (const file of files) {
      const content = JSON.parse(await readFile(path.join(packPath, file), "utf8"));
      if (content.actor) {
        documents.push(content.actor, ...content.items);
      } else {
        documents.push(content);
      }
    }

    if (documents.length === 0) continue;

    const exportPath = path.join(buildDir, `${pack.name}.json`);
    await writeFile(exportPath, JSON.stringify(documents, null, 2), "utf8");
    summary.push({ pack: pack.name, count: documents.length, file: exportPath });
  }

  return summary;
}

export function getPaths() {
  return {
    toolsRoot: TOOLS_ROOT,
    moduleRoot: MODULE_ROOT,
    srcDir: path.join(TOOLS_ROOT, "src"),
    buildDir: path.join(TOOLS_ROOT, "build"),
    outputDir: path.join(TOOLS_ROOT, "output"),
  };
}
