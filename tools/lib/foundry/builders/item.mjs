import { generateId, slugify, toProseHtml } from "../../utils.mjs";

const NOW = Date.now();

function baseDocument(name, type, img) {
  return {
    _id: generateId(),
    name,
    type,
    folder: null,
    img: img ?? "icons/svg/mystery-man.svg",
    system: {},
    effects: [],
    flags: {},
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
}

function sourceBlock(label, rules = "2024") {
  return { book: label || "AideDD", page: "", license: "", revision: 1, rules };
}

function inferActivityType(parsed) {
  const text = `${parsed.descriptionHtml} ${parsed.higherLevels}`.toLowerCase();
  if (text.includes("esprit") || text.includes("invoq") || text.includes("summon")) return "summon";
  if (text.includes("soin") || text.includes("point") && text.includes("vie")) return "heal";
  if (text.includes("dégât") || text.includes("degat") || text.includes("damage")) return "attack";
  return "utility";
}

function buildUtilityActivities() {
  const activityId = generateId();
  return {
    [activityId]: {
      _id: activityId,
      type: "utility",
      activation: { type: "action", value: null, condition: "" },
      consumption: {
        targets: [],
        scaling: { allowed: false, max: "", formula: "" },
      },
      description: { chatFlavor: "" },
      duration: { units: "inst", value: "", concentration: false, override: false },
      effects: [],
      range: { units: "self", value: "", long: null, override: false },
      target: {
        template: { contiguous: false, units: "ft", type: "" },
        affects: { choice: false, type: "", count: "", special: "" },
        override: false,
        prompt: false,
      },
      uses: { spent: 0, recovery: [], max: "" },
      sort: 0,
      name: "",
      img: "",
      appliedEffects: [],
    },
  };
}

export function buildSpellDocument(parsed, rules = "2024") {
  const doc = baseDocument(
    parsed.name,
    "spell",
    "systems/dnd5e/icons/svg/tradition/conjuration.svg"
  );
  const activityId = generateId();
  const activityType = inferActivityType(parsed);

  doc.system = {
    activities: {
      [activityId]: {
        _id: activityId,
        type: activityType,
        activation: {
          type: parsed.activation.type,
          value: parsed.activation.value,
          condition: parsed.activationLabel ?? "",
        },
        consumption: {
          targets: [],
          scaling: parsed.higherLevels
            ? { allowed: true, max: "@item.level", formula: "" }
            : { allowed: false, max: "", formula: "" },
          spellSlot: true,
        },
        description: {
          chatFlavor: parsed.higherLevels ?? "",
        },
        duration: {
          units: parsed.duration.units,
          value: parsed.duration.value,
          concentration: parsed.duration.concentration,
          override: false,
        },
        effects: [],
        range: {
          units: parsed.range.units,
          value: parsed.range.value,
          long: null,
          override: false,
        },
        target: {
          template: { contiguous: false, units: "ft", type: "" },
          affects: { choice: false, type: "", count: "", special: "" },
          override: false,
          prompt: true,
        },
        uses: { spent: 0, recovery: [], max: "" },
        sort: 0,
        name: "",
        img: "",
        appliedEffects: [],
      },
    },
    description: {
      value: toProseHtml(parsed.descriptionHtml),
      chat: "",
    },
    source: sourceBlock(parsed.source, rules),
    activation: {
      type: parsed.activation.type,
      value: parsed.activation.value,
      condition: parsed.activationLabel ?? "",
    },
    duration: {
      units: parsed.duration.units,
      value: parsed.duration.value,
      concentration: parsed.duration.concentration,
      override: false,
    },
    materials: {
      value: parsed.properties.includes("material") ? parsed.componentsLabel : "",
      consumed: false,
      cost: 0,
      supply: 0,
    },
    method: "spell",
    prepared: 2,
    properties: parsed.properties,
    school: parsed.school,
    level: parsed.level,
    identifier: slugify(parsed.name),
  };

  if (parsed.classLabels?.length) {
    doc.system.description.value += `<p><em>Classes : ${parsed.classLabels.join(", ")}</em></p>`;
  }

  return doc;
}

export function buildRaceDocument(parsed, rules = "2024") {
  const doc = baseDocument(parsed.name, "race", "icons/svg/mystery-man.svg");
  doc.system = {
    advancement: [{ type: "Size", configuration: { sizes: ["med"] }, level: 0, title: "" }],
    description: { value: toProseHtml(parsed.descriptionHtml) },
    identifier: slugify(parsed.name),
    source: sourceBlock(parsed.source, rules),
    movement: { walk: "30", units: "ft", hover: false },
    senses: { darkvision: 0, special: "" },
    type: { value: "humanoid" },
  };
  return doc;
}

export function buildClassDocument(parsed, rules = "2024") {
  const doc = baseDocument(parsed.name, "class", "icons/svg/mystery-man.svg");
  doc.system = {
    advancement: [
      { type: "HitPoints", configuration: {}, level: 0, title: "" },
      { type: "Subclass", configuration: {}, level: 3, title: "" },
      { type: "AbilityScoreImprovement", configuration: { cap: 2, fixed: {}, points: 2 }, level: 4, title: "" },
    ],
    description: { value: toProseHtml(parsed.descriptionHtml) },
    identifier: parsed.classIdentifier ?? slugify(parsed.name),
    source: sourceBlock(parsed.source, rules),
    startingEquipment: [],
    hd: { denominator: parsed.hitDie ?? 8, spent: 0 },
    primaryAbility: { str: false, dex: false, con: false, int: false, wis: false, cha: false },
    properties: [],
    spellcasting: {
      progression: "none",
      ability: "",
      preparation: { formula: "" },
    },
  };
  return doc;
}

export function buildBackgroundDocument(parsed, rules = "2024") {
  const doc = baseDocument(parsed.name, "background", "icons/svg/mystery-man.svg");
  const advancement = [];

  if (parsed.proficiencies?.skills?.length) {
    advancement.push({
      type: "Trait",
      title: "Proficiencies",
      configuration: {
        choices: [{ count: parsed.proficiencies.skills.length, pool: parsed.proficiencies.skills }],
      },
      level: 0,
    });
  }

  doc.system = {
    advancement,
    description: { value: toProseHtml(parsed.descriptionHtml) },
    identifier: slugify(parsed.name),
    source: sourceBlock(parsed.source, rules),
    startingEquipment: [],
  };
  return doc;
}

export function buildSubclassDocument(parsed, rules = "2024") {
  const doc = baseDocument(parsed.name, "subclass", "icons/svg/mystery-man.svg");
  doc.system = {
    advancement: [],
    description: { value: toProseHtml(parsed.descriptionHtml) },
    identifier: slugify(parsed.name),
    source: sourceBlock(parsed.source, rules),
    classIdentifier: slugify(parsed.parentClass ?? "barbarian"),
    spellcasting: { progression: "none", preparation: { formula: "" } },
  };
  return doc;
}

export function buildFeatDocument(parsed, rules = "2024") {
  const doc = baseDocument(parsed.name, "feat", "icons/svg/item-bag.svg");
  doc.system = {
    activities: buildUtilityActivities(),
    description: { value: toProseHtml(parsed.descriptionHtml) },
    identifier: slugify(parsed.name),
    source: sourceBlock(parsed.source, rules),
    type: { value: "feat" },
  };
  return doc;
}

export function buildItemFromArticle(parsed, rules = "2024") {
  switch (parsed.type) {
    case "race":
      return buildRaceDocument(parsed, rules);
    case "class":
      return buildClassDocument(parsed, rules);
    case "background":
      return buildBackgroundDocument(parsed, rules);
    case "subclass":
      return buildSubclassDocument(parsed, rules);
    case "feat":
    case "article":
    default:
      return buildFeatDocument(parsed, rules);
  }
}
