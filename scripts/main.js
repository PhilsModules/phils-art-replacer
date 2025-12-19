import { ArtScanner } from './ArtScanner.js';
import { ReplacerApp } from './ReplacerApp.js';

const MODULE_ID = 'phils-art-replacer';

Hooks.once('init', () => {
    console.log(`${MODULE_ID} | Initializing Phil's Art Replacer`);
});

Hooks.on('getActorDirectoryEntryContext', (html, options) => {
    // Add context menu option to specific actors? 
    // Maybe better to have a global tool in the actor directory header.
});

Hooks.on('renderActorDirectory', (app, html, data) => {
    // Add button to header
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = '<i class="fas fa-palette"></i> Art Replacer';
    button.classList.add('phils-art-replacer-btn');

    button.onclick = async () => {
        ui.notifications.info("Scanning for missing art...");
        const scanner = new ArtScanner();
        const results = await scanner.scanActors();

        if (results.length === 0) {
            ui.notifications.info("No matching art found in active modules/systems.");
            return;
        }

        new ReplacerApp(results).render(true);
    };

    const element = html instanceof HTMLElement ? html : html[0];

    // Check for existing button to prevent duplicates
    if (element.querySelector('.phils-art-replacer-btn')) return;

    const header = element.querySelector('.header-actions');
    if (header) {
        header.appendChild(button);
    } else {
        // Fallback or log if header is missing
        console.warn(`${MODULE_ID} | Could not find .header-actions in Actor Directory`);
        element.appendChild(button);
    }
});
