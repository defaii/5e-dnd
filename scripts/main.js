Hooks.once("ready", async () => {
  // -------------------------------------------------
  // 1️⃣  ID du module – **COPIER EXACTEMENT** la valeur
  //     du champ "id" du fichier module.json.
  // -------------------------------------------------
  const MODULE_ID = "5e-dnd";                 // ← à vérifier
  const FOLDER_NAME = "5e D&D Compendium";

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

 
let subFolder = game.folders.find(f =>
  f.type === "Compendium" &&
  f.name === "Aptitudes de personnage" &&
  f.parent?.id === folder.id   // le sous‑dossier doit être à l’intérieur du dossier principal
);

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
  ui.compendium?.render(true);
});
