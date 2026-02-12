Hooks.once("ready", async function () {

  const MODULE_ID = "5e-dnd";
  const FOLDER_NAME = "5e D&D Compendium";

  // Vérifie si le dossier existe déjà
  let folder = game.folders.find(f => 
    f.type === "Compendium" && f.name === FOLDER_NAME
  );

  // Si pas trouvé → on le crée
  if (!folder) {
    folder = await Folder.create({
      name: FOLDER_NAME,
      type: "Compendium",
      color: "#6f4dbd",
      sorting: "a"
    });
  }

  // Récupère tous les packs du module
  const packs = game.packs.filter(p => p.metadata.package === MODULE_ID);

  // Assigne chaque pack au dossier
  for (let pack of packs) {
    await pack.configure({ folder: folder.id });
  }

});
