## v1.1.0 - UI Overhaul & Initialization Protection
*   **NEU: Responsives UI-Design:** Das Fenster passt sich nun intelligent an. Die Optionen werden bei breiteren Fenstern automatisch nebeneinander (Grid) angeordnet, um Platz zu sparen, und stapeln sich bei schmalen Fenstern sauber untereinander (Liste).
*   **NEU: Bidirektionale Suche:** Die Suchlogik wurde massiv verbessert. Das Modul findet nun auch generische Bilder für spezifische Akteure (z.B. findet "Walkena Priestess" nun das Bild "Walkena", statt gar nichts zu finden).
*   **NEU: Lokalisierung (DE/EN):** Das Modul ist nun vollständig ins Deutsche und Englische übersetzt. Inklusive aller Buttons, Tooltips und Benachrichtigungen.
*   **NEU: Bild-Vorschau & Details:**
    *   **Click-to-Enlarge:** Ein Klick auf ein Vorschaubild öffnet es nun in voller Größe (ImagePopout).
    *   **Metadaten:** Unter jedem Bild werden nun Dateiname, Auflösung (z.B. 512x512) und Dateigröße (KB/MB) angezeigt.
*   **Fix: "Replace All" Filter-Logik:** Ein Fehler wurde behoben, bei dem der "Token-Bilder ignorieren" Filter nur visuell wirkte. Der "Alles Ersetzen" Button ignoriert nun tatsächlich auch technisch alle ausgeblendeten Token-Bilder.
*   **UI Polish:** Abstände optimiert, Footer-Layout korrigiert und Textumbruch für lange Dateinamen hinzugefügt.
