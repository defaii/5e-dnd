const MODULE_ID = "5e-dnd";
const FOLDER_NAME = "5e D&D Compendium";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getActivities(item) {
  const activities = item?.system?.activities;
  if (!activities) return [];
  if (Array.isArray(activities)) return activities;
  if (typeof activities.values === "function") return Array.from(activities.values());
  return Object.values(activities);
}

function getDocumentDescription(doc) {
  return doc?.system?.description?.chat
    || doc?.system?.description?.value
    || doc?.system?.details?.biography?.value
    || "";
}

async function postDocumentToChat(doc) {
  const description = getDocumentDescription(doc);
  const content = description && globalThis.TextEditor?.enrichHTML
    ? await TextEditor.enrichHTML(description, { async: true })
    : description;

  const image = doc.img
    ? `<img src="${escapeHtml(doc.img)}" alt="${escapeHtml(doc.name)}" width="36" height="36">`
    : "";

  return ChatMessage.create({
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor: doc.documentName === "Actor" ? doc : doc.actor }),
    flavor: doc.name,
    content: `
      <div class="dnd5e chat-card item-card">
        <header class="card-header flexrow">
          ${image}
          <h3>${escapeHtml(doc.name)}</h3>
        </header>
        <div class="card-content">${content}</div>
      </div>
    `,
  });
}

async function useItem(item, event) {
  const activity = getActivities(item).find((a) => typeof a?.use === "function");

  try {
    if (activity) return await activity.use({ event });
    if (typeof item?.use === "function") return await item.use({ event });
  } catch (err) {
    console.warn(`[${MODULE_ID}] Utilisation dnd5e impossible, carte simple envoyée.`, err);
  }

  return postDocumentToChat(item);
}

function getActorItems(actor) {
  const items = actor?.items;
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (typeof items.values === "function") return Array.from(items.values());
  if (Array.isArray(items.contents)) return items.contents;
  return [];
}

async function useActor(actor, event) {
  const items = getActorItems(actor).filter((item) => {
    return getActivities(item).length || getDocumentDescription(item);
  });

  if (!items.length) return postDocumentToChat(actor);
  if (items.length === 1) return useItem(items[0], event);

  return Dialog.prompt({
    title: `Utiliser ${actor.name}`,
    label: "Utiliser",
    content: `
      <form>
        <div class="form-group">
          <label>Action</label>
          <select name="item">${items.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("")}</select>
        </div>
      </form>
    `,
    callback: (html) => {
      const selected = html.find("[name=item]").val();
      const item = items.find((i) => i.id === selected);
      return item ? useItem(item, event) : null;
    },
  });
}

function getEntryElement(entry) {
  if (entry instanceof HTMLElement) return entry;
  if (entry?.[0] instanceof HTMLElement) return entry[0];
  if (typeof entry?.get === "function") return entry.get(0);
  return null;
}

function getCompendiumEntryData(entry) {
  const element = getEntryElement(entry);
  const uuid = element?.dataset?.uuid || element?.closest("[data-uuid]")?.dataset?.uuid || "";
  const packId = element?.dataset?.pack || element?.closest("[data-pack]")?.dataset?.pack || "";
  const documentId = element?.dataset?.documentId
    || element?.dataset?.entryId
    || element?.closest("[data-document-id]")?.dataset?.documentId
    || element?.closest("[data-entry-id]")?.dataset?.entryId
    || "";

  if (uuid.startsWith("Compendium.")) {
    const parts = uuid.split(".");
    return { uuid, packId: `${parts[1]}.${parts[2]}`, documentId: parts[3] };
  }

  return { uuid, packId, documentId };
}

async function resolveCompendiumEntry(entry) {
  const { uuid, packId, documentId } = getCompendiumEntryData(entry);
  if (uuid && globalThis.fromUuid) {
    const doc = await fromUuid(uuid);
    if (doc) return doc;
  }

  const pack = game.packs.get(packId);
  return pack && documentId ? pack.getDocument(documentId) : null;
}

async function useDocument(doc, event) {
  if (!doc) return ui.notifications?.warn("Impossible de trouver ce document.");
  if (doc.documentName === "Actor") return useActor(doc, event);
  if (doc.documentName === "Item") return useItem(doc, event);
  return postDocumentToChat(doc);
}

Hooks.on("getItemSheetHeaderButtons", (app, buttons) => {
  buttons.unshift({
    label: "Utiliser",
    class: "5e-dnd-use-item",
    icon: "fas fa-dice-d20",
    onclick: (event) => useItem(app.object, event),
  });
});

Hooks.on("getActorSheetHeaderButtons", (app, buttons) => {
  buttons.unshift({
    label: "Utiliser",
    class: "5e-dnd-use-actor",
    icon: "fas fa-dice-d20",
    onclick: (event) => useActor(app.object, event),
  });
});

Hooks.on("getCompendiumEntryContext", (_html, options) => {
  if (!Array.isArray(options)) return;

  options.push({
    name: "Utiliser",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: (entry) => {
      const { packId } = getCompendiumEntryData(entry);
      const pack = game.packs.get(packId);
      return ["Actor", "Item"].includes(pack?.documentName);
    },
    callback: async (entry) => useDocument(await resolveCompendiumEntry(entry)),
  });
});

Hooks.once("ready", async () => {

  // -------------------------------------------------
  // 2️⃣  S’assurer que le module est bien actif.
  // -------------------------------------------------
  const mod = game.modules.get(MODULE_ID);
  if (!mod?.active) {
    console.warn(`Module "${MODULE_ID}" n’est pas actif ; aucune opération effectuée.`);
    return;
  }

  // -------------------------------------------------
  // 3️⃣  Créer (ou récupérer) le dossier de type "Compendium".
  // -------------------------------------------------
  let folder = game.folders.find(
    f => f.type === "Compendium" && f.name === FOLDER_NAME
  );

  if (!folder) {
    folder = await Folder.create({
      name: FOLDER_NAME,
      type: "Compendium",
      color: "#6f4dbd",
      sorting: "a"
    });
    console.log(`Dossier créé : ${folder.name}`);
  }

  // -------------------------------------------------
  // 4️⃣  Récupérer **tous** les packs du module.
  //    (compatible v10‑v13)
  // -------------------------------------------------
  const packs = game.packs.filter(p => p.metadata?.packageName === MODULE_ID);

  if (!packs.length) {
    console.warn(`Aucun pack trouvé pour le module "${MODULE_ID}". Vérifiez l'ID du module et le champ utilisé (metadata.package / metadata.module).`);
    return;
  }

  console.log("Packs trouvés :", packs.map(p => p.collection));

  // -------------------------------------------------
  // 5️⃣  Placer chaque pack dans le dossier créé.
  // -------------------------------------------------
  for (const pack of packs) {
    // La méthode qui écrit réellement le paramètre «folder » dans la configuration.
    await pack.setFolder(folder.id);
  }

  // -------------------------------------------------
  // 6️⃣  Rafraîchir la sidebar des compendiums
  // -------------------------------------------------
  try {
    mod.api = { useDocument, useItem, useActor };
  } catch (err) {
    console.warn(`[${MODULE_ID}] API locale non exposée.`, err);
  }
  ui.compendium?.render(true);
});
