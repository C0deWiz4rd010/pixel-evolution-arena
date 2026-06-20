# Collector Tech UI Design Plan

## Zielbild

Die gesamte Oberfläche folgt standardmäßig dem Profil **Collector Tech**: ruhige dunkelblaue Spielflächen, klar gestufte Hauptcards, große Kreaturenmotive und sparsame Stage-Akzente. Innerhalb von drei Sekunden sollen Spieler erkennen, welches Sammlerstück ausgewählt ist, was als Nächstes freigeschaltet wird und welche Aktion den Fortschritt voranbringt.

Visuelle Referenz: `concept-images/generated/pixel-evolution-arena-collector-tech-cards-v3.png`.

## Designsystem

- Verwende drei Ebenen: offene Seitenfläche, normale `game-card`, hervorgehobene `focus-card`. Raster und Glow bleiben auf große Flächen beziehungsweise aktive Zustände begrenzt.
- Jede Hauptcard nutzt dieselbe Anatomie: kurze Metazeile, klarer Titel, optionales Motiv, kompakte Statusdaten und höchstens eine dominante Aktion. Sekundäraktionen werden als ruhige Outline-Buttons oder Disclosure dargestellt.
- Stage-Farben färben nur Akzentkante, Badge, Fortschritt, Route und Auswahlzustand. Kartenflächen bleiben neutral, damit Stufen vergleichbar bleiben.
- Sammlercards zeigen Katalognummer, Stage, Name, Zustand und Fortschrittszeichen. Unbekannte Formen erhalten bewusste Silhouetten und lesbare Mystery-Slots statt leerer Platzhalter.
- Mindestgrößen: Fließtext `0.875rem`, Metatext `0.75rem`, Controls 44 px, mobile Touch-Ziele 44 x 44 px. Großbuchstaben sind kurzen Labels vorbehalten.
- Lokal gebündelte Schriften: eine Pixel-/Display-Schrift für Marke, Überschriften, Kreaturennamen und Schlüsselwerte; eine gut lesbare technische Sans für Texte, Labels und Controls.

## Einstellbare Profile

- `Collector Tech` ist Standard: großzügige Cards, feine Chamfer, geringe Textur, Glow nur bei Fokus/Ready.
- `Pixel Arcade`: etwas kompaktere Abstände, härtere Pixelkanten, stärkere Scanline-/Rasterwirkung und lebendigere Akzente bei identischer Informationsstruktur.
- `Tactical Minimal`: luftigere Abstände, fast rechteckige Flächen, kaum Textur/Glow und zurückgenommene Rahmen bei identischer Informationsstruktur.
- Die unabhängige Typografieauswahl bietet `Dual Font` als Standard, `Pixel` für alle UI-Ebenen und `Tech Sans` für eine besonders ruhige Darstellung.
- Stil- und Typografieprofile werden in `PlayerSettings` gespeichert, beim Import bereinigt und als Root-`data-*` Attribute angewendet. Bestehende Saves fallen auf die neuen Standards zurück.

## Umsetzung

1. Zentrale Tokens für Fläche, Elevation, Card-Rand, Schatten, Radius/Chamfer, Abstände und Typografie in `styles.scss` ergänzen. Direkte Farbwerte in den Hauptflächen auf semantische Tokens umstellen.
2. Settings-Datentypen, Defaults, Save-Sanitizing, Service-Aktionen und zugängliche segmentierte Controls für Stil und Typografie ergänzen.
3. Shell, Next Goal, Evolve-Familienkarten, Monster-Detail, Squad/Reserve, Battle-Entscheidungskarten, Explore, Archive und Settings auf gemeinsame Card-Regeln vereinheitlichen.
4. Desktop behält die priorisierte Zwei-Spalten-Ansicht. Mobile zeigt zuerst Next Goal, dann eine kompakte ausgewählte Kreatur und anschließend den aktiven Pfad; lange Card-Reihen werden vertikal oder als klar erkennbare horizontale Rails dargestellt.
5. Hover, Focus, Selected, Ready, Locked, Disabled und Reward werden über dieselben Zustands-Tokens umgesetzt. Farbe wird immer durch Text, Icon oder Form ergänzt.

## Tests und Abnahme

- Unit-Tests prüfen Defaults, Setter und Save-Sanitizing für alle sechs neuen Profilwerte.
- Playwright prüft Settings-Wechsel, Root-Attribute, Persistenz nach Reload und die bestehenden Kernflüsse.
- Visuelle QA erfolgt für Collector Tech, Pixel Arcade und Tactical Minimal auf 1440 x 960 sowie Collector Tech mit 390 x 844 und 360 x 800.
- Keine horizontale Dokument-Überläufe, abgeschnittene Hauptaktionen, Texte unter 12 px, unlesbare Glows oder rein farbbasierte Statusanzeigen.
- `npm.cmd run build`, `npm.cmd run test` und `npm.cmd run test:e2e` müssen vor Übergabe bestehen.

## Festgelegte Annahmen

- Alle Profile teilen DOM-Struktur und Bedienlogik; nur Tokens, Effekte und bewusst begrenzte Dichtewerte variieren.
- Akzentpalette (`Aurora`, `Ember`, `Mono`) bleibt unabhängig von Stil und Typografie erhalten.
- Es werden keine externen Laufzeit-APIs oder extern geladenen Webfonts verwendet.
- Gameplay-Regeln, Datenmodell außerhalb der Darstellung und Kreaturenassets bleiben unverändert.
