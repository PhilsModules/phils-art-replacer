export class ArtScanner {
    constructor() {
        this.defaultIcons = [
            "icons/svg/mystery-man.svg",
            "icons/svg/mystery-man-black.svg",
            "CONST.DEFAULT_TOKEN",
            "undefined",
            "null",
            ""
        ];
        this.extensions = new Set(["png", "webp", "jpg", "jpeg", "gif", "svg"]);
        this.ignoreFolders = new Set(["lang", "languages", "scripts", "styles", "packs", "audio", "sounds", "fonts"]);
    }

    /**
     * Scans all actors in the world.
     * @returns {Promise<Array<{actor: Actor, matches: Array<string>}>>}
     */
    async scanActors() {
        // Scan all actors, not just those missing art
        // Use .values() to iterate the Actor instances, as game.actors is a Map/Collection
        const actors = game.actors.values();
        ui.notifications.info(game.i18n.localize("PhilsArtReplacer.Scanning"));

        const results = [];
        const fileIndex = await this._buildFileIndex();
        console.log(`Phil's Art Replacer | Indexed ${fileIndex.length} files.`);

        const blacklist = ["transparent", "1x1", "mystery-man", "default-token"];

        for (const actor of actors) {
            // Normalize actor name: "Goblin King" -> "goblinking"
            const normalizedActorName = actor.name.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (!normalizedActorName) continue;

            const matches = fileIndex.filter(path => {
                const lowerPath = path.toLowerCase();
                // Blacklist check
                if (blacklist.some(term => lowerPath.includes(term))) return false;

                const fileName = path.split('/').pop().toLowerCase();
                const baseName = fileName.substring(0, fileName.lastIndexOf('.'));

                // Normalize file name: "goblin_king" -> "goblinking"
                const normalizedFileName = baseName.replace(/[^a-z0-9]/g, "");

                // Relaxed match: Substring check (Bidirectional)
                // 1. File contains Actor Name (e.g. "Walkena_Avatar" contains "Walkena")
                if (normalizedFileName.includes(normalizedActorName)) return true;

                // 2. Actor Name contains File Name (e.g. "Walkena Priestess" contains "Walkena")
                // Prevent short matches (e.g. "a" matching "apple")
                if (normalizedFileName.length > 3 && normalizedActorName.includes(normalizedFileName)) return true;

                return false;
            });

            // Filter out if the ONLY match is the one they already have?
            const currentImg = actor.img;
            const validMatches = matches.filter(m => m !== currentImg);

            if (validMatches.length > 0) {
                results.push({
                    actor: actor,
                    matches: validMatches
                });
            }
        }

        console.log(game.i18n.format("PhilsArtReplacer.FoundMatches", { count: results.length }));
        return results;
    }

    _needsArt(actor) {
        // Deprecated/Unused for main logic now, keeping as helper if needed
        const img = actor.img;
        const tokenImg = actor.prototypeToken?.texture?.src;
        const isDefault = (i) => !i || this.defaultIcons.includes(i);
        return isDefault(img) || isDefault(tokenImg);
    }

    async _buildFileIndex() {
        ui.notifications.info(game.i18n.localize("PhilsArtReplacer.Indexing"));
        const files = [];

        // 1. Scan Installed Modules
        if (game.modules) {
            for (const [id, module] of game.modules.entries()) {
                if (!module.active) continue;
                // Browse the module's root directly
                await this._recursiveBrowse("modules", id, files, 0);
            }
        }

        // 2. Scan Systems
        if (game.system) {
            await this._recursiveBrowse("systems", game.system.id, files, 0);
        }

        // 3. Scan User Data (Foundry-wide)
        // We use source="data". We must skip "modules" and "systems" folders here to avoid huge redundancy/loops
        // as "data" often contains "modules" folder in some setups, or at least we don't want to re-scan them if we did above.
        await this._recursiveBrowse("data", "", files, 0, ["modules", "systems"]);

        return files;
    }

    async _recursiveBrowse(source, target, fileList, depth, extraIgnore = []) {
        if (depth > 10) return; // Prevent deep recursion

        try {
            const FilePickerClass = foundry.applications?.apps?.FilePicker || window.FilePicker;
            if (!FilePickerClass) return;

            const res = await FilePickerClass.browse(source, target);

            // Add files
            for (const file of res.files) {
                const ext = file.split('.').pop().toLowerCase();
                if (this.extensions.has(ext)) {
                    fileList.push(file);
                }
            }

            // Recurse directories
            for (const dir of res.dirs) {
                const dirname = dir.split('/').pop();

                if (this.ignoreFolders.has(dirname)) continue;
                if (extraIgnore.includes(dirname)) continue;

                // For nested browsing, pass target + dirname? 
                // Foundy FilePicker.browse usually returns FULL PATH in res.dirs if source is not wildcard?
                // Actually res.dirs usually returns "modules/my-module/subfolder".
                // AND for subsequent calls we usually pass that full path string as target.

                await this._recursiveBrowse(source, dir, fileList, depth + 1, extraIgnore);
            }

        } catch (e) {
            // Suppress errors for common access denials to avoid spamming console
            // console.warn(`Phil's Art Replacer | Error browsing ${source}/${target}:`, e);
        }
    }
}
