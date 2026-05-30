import { generateId, slugify, toProseHtml } from "../../utils.mjs";
import { buildFeatDocument } from "./item.mjs";

const NOW = Date.now();

function parseDarkvision(text) {
  const match = text.match(/(\d+)\s*m/i);
  if (match) return Math.round((parseFloat(match[1]) * 10) / 3);
  const ft = text.match(/(\d+)\s*ft/i);
  return ft ? parseInt(ft[1], 10) : 0;
}

function buildFeatureItems(entries, kind) {
  return entries.map((entry) => {
    const feat = buildFeatDocument(
      {
        name: entry.name,
        descriptionHtml: entry.html,
        source: "AideDD",
        type: "feat",
      },
      "2024"
    );
    feat.system.type = { value: kind === "action" ? "monster" : "monster" };
    feat.flags["5e-dnd"] = { featureKind: kind };
    return feat;
  });
}

export function buildActorDocument(parsed, rules = "2024") {
  const actorId = generateId();
  const traitItems = buildFeatureItems(parsed.traits ?? [], "trait");
  const actionItems = buildFeatureItems(parsed.actions ?? [], "action");
  const embeddedItems = [...traitItems, ...actionItems];

  const biographySections = [];
  if (parsed.descriptionHtml) biographySections.push(parsed.descriptionHtml);
  for (const t of parsed.traits ?? []) biographySections.push(`<h3>${t.name}</h3>${t.html}`);
  for (const a of parsed.actions ?? []) biographySections.push(`<h3>${a.name}</h3>${a.html}`);

  const doc = {
    _id: actorId,
    name: parsed.name,
    type: "npc",
    folder: null,
    img: parsed.image ?? "icons/svg/mystery-man.svg",
    system: {
      abilities: parsed.abilities,
      attributes: {
        ac: { flat: parsed.ac, calc: "default", formula: "" },
        hp: {
          value: parsed.hp.value,
          max: parsed.hp.value,
          temp: 0,
          tempmax: 0,
          formula: parsed.hp.formula,
        },
        init: { ability: "dex", bonus: parsed.initiative ? `@mod + ${parsed.initiative - Math.floor((parsed.abilities.dex?.value ?? 10 - 10) / 2)}` : "@mod", roll: { min: null, max: null, mode: 0 } },
        movement: parsed.speed,
        senses: { darkvision: parseDarkvision(parsed.sensesText), blindsight: 0, tremorsense: 0, truesight: 0, units: "ft", special: parsed.sensesText },
        spellcasting: "",
        exhaustion: 0,
        concentration: { ability: "", bonuses: { save: "" }, limit: 1 },
        death: { success: 0, failure: 0, ability: "", roll: { min: null, max: null, mode: 0 } },
        loyalty: { value: null },
      },
      details: {
        biography: {
          value: toProseHtml(biographySections.join("")),
          public: "",
        },
        alignment: parsed.alignment,
        cr: parsed.cr,
        type: { value: parsed.creatureType, subtype: "", swarm: "", custom: "" },
        ideal: "",
        bond: "",
        flaw: "",
        race: "",
        habitat: { value: [], custom: "" },
        treasure: { value: [], custom: "" },
      },
      traits: {
        size: parsed.size,
        di: { value: parsed.damageImmunities, bypasses: [], custom: "" },
        dr: { value: parsed.resistances, bypasses: [], custom: "" },
        dv: { value: [], bypasses: [], custom: "" },
        ci: { value: parsed.conditionImmunities, custom: "" },
        languages: { value: parsed.languages.map((l) => l.toLowerCase()), custom: "" },
        dm: { amount: {}, bypasses: [], custom: "" },
        important: false,
      },
      skills: {},
      tools: {},
      spells: { spell1: { value: 0, override: null }, spell2: { value: 0, override: null }, spell3: { value: 0, override: null }, spell4: { value: 0, override: null }, spell5: { value: 0, override: null }, spell6: { value: 0, override: null }, spell7: { value: 0, override: null }, spell8: { value: 0, override: null }, spell9: { value: 0, override: null }, pact: { value: 0, override: null }, spell0: { value: 0, override: null } },
      bonuses: { mwak: { attack: "", damage: "" }, rwak: { attack: "", damage: "" }, msak: { attack: "", damage: "" }, rsak: { attack: "", damage: "" }, abilities: { check: "", save: "", skill: {} }, spell: { dc: "" } },
      resources: { legact: { value: 0, max: 0, sr: false, lr: false }, legres: { value: 0, max: 0, sr: false, lr: false }, lair: { value: false, initiative: null, inside: false } },
      source: { book: parsed.source || "AideDD", page: "", custom: "", license: "", revision: 1, rules },
    },
    prototypeToken: {
      name: parsed.name,
      displayName: 20,
      actorLink: false,
      disposition: -1,
      width: 1,
      height: 1,
      texture: { src: parsed.image ?? "icons/svg/mystery-man.svg", scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0, rotation: 0, tint: "#ffffff", anchorX: 0.5, anchorY: 0.5, fit: "contain" },
      lockRotation: false,
      rotation: 0,
      alpha: 1,
      sight: { enabled: true, range: parseDarkvision(parsed.sensesText), angle: 360, visionMode: "basic", color: null, attenuation: 0.1, brightness: 0, saturation: 0, contrast: 0 },
      detectionModes: [],
      appendNumber: false,
      prependName: false,
      hexagonalShape: 0,
    },
    items: embeddedItems,
    effects: [],
    flags: { "5e-dnd": { aideddUrl: parsed.url } },
    ownership: { default: 0 },
    _stats: {
      systemId: "dnd5e",
      systemVersion: "5.2.5",
      coreVersion: "13.351",
      createdTime: NOW,
      modifiedTime: NOW,
      lastModifiedBy: null,
      compendiumSource: null,
      duplicateSource: null,
      exportSource: { worldId: "aidedd-import", uuid: null, coreVersion: "13.351", systemId: "dnd5e", systemVersion: "5.2.5" },
    },
  };

  return doc;
}

export function flattenActorExport(actorDoc) {
  const items = actorDoc.items ?? [];
  delete actorDoc.items;
  return { actor: actorDoc, items };
}
