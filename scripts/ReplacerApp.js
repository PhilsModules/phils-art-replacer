const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ReplacerApp extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(results) {
        super();
        this.results = results;
        this.selections = {}; // actorId -> selectedImagePath
        this.hideTokens = false;

        // Initialize default selections (first match)
        for (const res of results) {
            if (res.matches.length > 0) {
                this.selections[res.actor.id] = res.matches[0];
            } else {
                this.selections[res.actor.id] = "KEEP";
            }
        }
    }

    // ... (Parts config) ...

    async _prepareContext(options) {
        return {
            actors: this.results.map(r => {
                const selectedOnly = this.selections[r.actor.id] || "KEEP";
                const keepSelected = selectedOnly === "KEEP";

                // Map matches to objects
                const matchData = r.matches.map(m => {
                    const parts = m.split('/');
                    const filename = parts.pop();
                    const directory = parts.join('/');
                    const isToken = m.toLowerCase().includes("token");

                    return {
                        path: m,
                        filename: filename,
                        directory: directory,
                        isSelected: selectedOnly === m,
                        isToken: isToken
                    };
                });

                // Determine preview image
                let previewImg = r.actor.img;
                if (!keepSelected) {
                    previewImg = selectedOnly;
                }

                // Check if all matches are tokens
                const hasMatches = r.matches.length > 0;
                const allTokens = matchData.every(m => m.isToken);
                const hasOnlyTokens = hasMatches && allTokens;

                return {
                    id: r.actor.id,
                    name: r.actor.name,
                    currentImg: r.actor.img,
                    selectedMatch: previewImg,
                    isKeepSelected: keepSelected,
                    hasOnlyTokens: hasOnlyTokens,
                    matches: matchData
                };
            }),
            hideTokens: this.hideTokens
        };
    }

    _onRender(context, options) {
        console.log("Phil Replacer | _onRender called");

        // Init state class
        if (this.hideTokens) this.element.classList.add('hide-tokens');
        else this.element.classList.remove('hide-tokens');

        // Initial Metadata Load
        // We use a small timeout to let the DOM settle or images load
        setTimeout(() => {
            this.element.querySelectorAll('.match-item').forEach(row => {
                // Get actor ID from the radio group inside
                const radio = row.querySelector('input[type="radio"]');
                if (!radio) return;
                const actorId = radio.dataset.actorId;

                // Update Current
                const currentImg = row.querySelector(`#current-img-${actorId}`);
                if (currentImg) this._updateImageMeta(actorId, 'current', currentImg.src);

                // Update New (Default)
                const newImg = row.querySelector(`.preview-img[data-actor-id="${actorId}"]`);
                if (newImg) this._updateImageMeta(actorId, 'new', newImg.src);
            });
        }, 100);

        // Click Listener (Delegation)
        this.element.addEventListener('click', (ev) => {
            if (ev.target.classList.contains('clickable-img')) {
                const src = ev.target.src;
                if (src) {
                    new ImagePopout(src, { title: "Art Preview", shareable: false }).render(true);
                }
            }
        });

        // Change Listener
        this.element.addEventListener('change', (ev) => {
            // 1. Handle Token Toggle
            if (ev.target.name === 'hideTokens') {
                this.hideTokens = ev.target.checked;
                if (this.hideTokens) this.element.classList.add('hide-tokens');
                else this.element.classList.remove('hide-tokens');
                return;
            }

            // 2. Handle Art Selection
            if (ev.target.type === 'radio' && ev.target.dataset.actorId) {
                const actorId = ev.target.dataset.actorId;
                const val = ev.target.value;
                this.selections[actorId] = val;

                // Update "New" preview image
                const preview = this.element.querySelector(`.preview-img[data-actor-id="${actorId}"]`);
                if (preview) {
                    if (val === "KEEP") {
                        const currentSrc = ev.target.dataset.currentImg;
                        if (currentSrc) {
                            preview.src = currentSrc;
                            this._updateImageMeta(actorId, 'new', currentSrc);
                        }
                    } else {
                        preview.src = val;
                        this._updateImageMeta(actorId, 'new', val);
                    }
                }
            }
        });
    }

    async _updateImageMeta(actorId, type, src) {
        // type = 'current' or 'new'
        // Find elements
        // For 'current', we rely on DOM traversal since IDs are unique enough
        // Meta container IDs: meta-current-{id}, filename-new-{id} ...

        let filenameEl, detailsEl;

        if (type === 'current') {
            // Current image doesn't have a filename ID in my template above, let's look relative or add one? 
            // Actually I added "meta-filename" class inside the img-meta div
            const container = this.element.querySelector(`#current-img-${actorId}`).nextElementSibling;
            if (container) {
                filenameEl = container.querySelector('.meta-filename');
                detailsEl = container.querySelector('.meta-details');
            }
        } else {
            filenameEl = this.element.querySelector(`#filename-new-${actorId}`);
            detailsEl = this.element.querySelector(`#meta-new-${actorId}`);
        }

        if (!filenameEl || !detailsEl) return;

        // Set Filename
        const filename = src.split('/').pop();
        filenameEl.textContent = filename;
        filenameEl.title = filename;

        // Set Loading state
        detailsEl.textContent = "...";

        try {
            // 1. Get Dimensions
            const img = new Image();
            img.src = src;
            await img.decode(); // Wait for load
            const width = img.naturalWidth;
            const height = img.naturalHeight;

            // 2. Get File Size (HEAD request)
            // Note: This might fail for some internal Foundry paths or protected assets, but worth a try
            let sizeStr = "";
            try {
                const response = await fetch(src, { method: 'HEAD' });
                if (response.ok) {
                    const bytes = parseInt(response.headers.get('content-length') || 0);
                    if (bytes > 0) {
                        if (bytes > 1024 * 1024) sizeStr = ` • ${(bytes / (1024 * 1024)).toFixed(2)} MB`;
                        else sizeStr = ` • ${(bytes / 1024).toFixed(0)} KB`;
                    }
                }
            } catch (e) {
                // Ignore network errors for size
            }

            detailsEl.textContent = `${width}x${height}${sizeStr}`;

        } catch (err) {
            detailsEl.textContent = game.i18n.localize("PhilsArtReplacer.Unknown");
        }
    }

    async applyReplacements() {
        let count = 0;
        for (const [actorId, imgPath] of Object.entries(this.selections)) {
            if (!imgPath || imgPath === "KEEP") continue;

            // Skip tokens if filter is active
            if (this.hideTokens && imgPath.toLowerCase().includes("token")) continue;

            const actor = game.actors.get(actorId);
            if (!actor) continue;

            const updateData = {
                img: imgPath,
                "prototypeToken.texture.src": imgPath
            };

            await actor.update(updateData);
            count++;
        }
        ui.notifications.info(game.i18n.format("PhilsArtReplacer.ReplacedCount", { count: count }));
        this.close();
    }

    static DEFAULT_OPTIONS = {
        tag: "form",
        id: "phils-art-replacer-app",
        classes: ["phils-art-replacer"],
        window: {
            title: "PhilsArtReplacer.Title",
            resizable: true,
            width: 600,
            height: 700
        },
        position: {
            width: 600,
            height: 700
        },
        actions: {
            replaceAll: function () {
                this.applyReplacements();
            }
        }
    };

    static PARTS = {
        form: {
            template: "modules/phils-art-replacer/templates/replacer-app.hbs"
        },
        footer: {
            template: "modules/phils-art-replacer/templates/replacer-footer.hbs"
        }
    };
}

