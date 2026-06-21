# Pixel Evolution Arena Battle Overhaul

## Ziel und Analyse

Battle soll in 35-50 Sekunden eine verständliche Mini-Dramaturgie liefern: bewusst vorbereiten, einen wichtigen Tactical Pulse entscheiden, den Ausgang lesen und sofort sehen, wie jedes Monster gewachsen ist. Die Sammlung und Evolution bleiben das Meta-Ziel; Battle gibt den Monstern dafür individuelle Geschichte und Identität.

Die aktuelle Arena besitzt bereits Stances, Kategorien, Forecast, Items, Overdrive, Status-Effekte, Moves, Pixi-Animationen, Contracts und After-Action-Karten. Der Spaß wird trotzdem gebremst, weil sich Forecast, Coach, Contracts und Battle Plan wiederholen, der Kampf nach dem Start kaum Agency bietet, der Ausgang vor der Timeline feststeht und Rewards bereits während der Animation sichtbar werden. Starter treffen zudem auf einen 0%-Forecast, und die Standby-Arena wirkt leer.

Visuelle Referenzen:

- `concept-images/generated/pixel-evolution-arena-battle-overhaul-prepare-v1.png`
- `concept-images/generated/pixel-evolution-arena-battle-overhaul-tactical-pulse-v1.png`
- `concept-images/generated/pixel-evolution-arena-battle-overhaul-growth-result-v1.png`

## Neuer Kernloop

1. **Battle Brief:** Der Spieler wählt Mission (`Training`, `Standard`, `Risk`) und Squad Plan (`Assault`, `Balance`, `Guard`). Forecast, Empfehlung, Contract und Reward-Prognose werden in einem Brief zusammengeführt. `Auto Plan` setzt eine sinnvolle Kombination; `Deploy Squad` ist die einzige dominante Aktion.
2. **Engage:** Die Arena zeigt alle Einheiten, individuelle HP, Move-Namen und Status. Die ersten Schläge etablieren Matchup und Gefahr, ohne Rewards oder Ausgang zu verraten.
3. **Tactical Pulse:** Einmal pro Kampf stoppt die Timeline für höchstens sechs Sekunden. `Break` kombiniert kleinen Angriff und Schutz, `Guard` maximiert Mitigation, `Surge` erhöht Angriff und Mastery bei zusätzlichem Risiko. Tasten `1`, `2`, `3` und Pointer sind gleichwertig; bei Timeout wird die empfohlene sichere Option gewählt.
4. **Finale:** Die Combat Engine löst den Kampf mit dem gewählten Pulse auf. Resultat, Ressourcen, XP und Logs werden erst nach der finalen Animation committed und sichtbar.
5. **Growth Result:** Ein horizontaler Ergebnisbereich zeigt Reward-Summe, XP, Battle Mastery, abgeschlossene Ziele, Move-Unlocks und Fortschritt zum relevantesten optionalen Evolutionspfad. `Continue Growth` führt zum besten Wachstumsziel, `Run Again` startet denselben Brief erneut.

## Regeln, Daten und Schnittstellen

- Neue Typen: `TacticalPulseChoice`, `TacticalPulseOption`, `MonsterMasteryProgress`, `BattleMasteryAward` und `BattleGrowthResult`.
- `PlayerState.monsterMastery` speichert pro Monster `battleXp`, `signatureProgress`, `completedGoals` und `unlockedMoves`; fehlende Felder alter Saves werden beim Laden auf sichere Defaults migriert.
- Mastery wird pro eingesetztem Monster vergeben: Basispunkte für Teilnahme, Bonus für Sieg, erfüllte rollenspezifische Ziele und `Surge`; Niederlagen geben reduzierte Mastery. Signature-Fortschritt ist auf ein Ziel pro Kampf gedeckelt.
- Ziele werden aus Typ und Rolle abgeleitet, nicht für 71 Monster manuell dupliziert: Treffer eines eigenen Typs, Status anwenden, Schaden abschirmen, Finisher, Overdrive oder flawless überstehen. Pro Kampf werden maximal drei verständliche Ziele angezeigt.
- Mastery schaltet zunächst einen zusätzlichen Move beziehungsweise eine passive Variantenbezeichnung frei. Optionale spätere Evolutionszweige dürfen `signatureProgress` oder ein abgeschlossenes Mastery-Ziel verlangen; der zentrale Familienpfad bleibt ausschließlich über Level und Ressourcen erreichbar.
- `simulateBattle` erhält den Tactical-Pulse-Modifikator vor dem finalen Roll. `Break` gibt moderaten Angriff und Schutz, `Guard` hohe Mitigation, `Surge` hohen Angriff bei negativer Mitigation. Forecast und Auto-Plan verwenden dieselben Modifikatoren.
- `BattleAnimationService.play()` liefert ein Completion-Promise. `GameStateService` berechnet die Timeline, wartet auf das Finale und committed danach atomar Rewards, XP, Mastery, Logs, Inventar und Save-State. Navigation oder Reset lösen offene Timer sauber auf.
- Pixi bleibt Renderer: individuelle HP-Werte, Actor/Target, Move, Status, Trefferstärke und Pulse-Effekt kommen als strukturierte Events aus den Regeln. DOM besitzt Brief, Pulse-Steuerung, Ergebnistext und Accessibility.

## UI, Animation und Audio

- Die Standby-Arena rendert Squad und Gegner sofort; ein dezenter Light Sweep und Idle-Bob zeigen Bereitschaft. Die bisherige leere Canvas-Fläche entfällt.
- Active Battle priorisiert das Spielfeld. Individuelle HP-/Statusleisten sitzen bei den Einheiten; Move-Name, `SUPER`, `RESIST`, Crit und Damage erscheinen nur am betroffenen Actor/Target.
- Tactical Pulse ist eine niedrige Bottom-Rail statt Modal: drei gleich große Entscheidungen, klarer Trade-off, sechs Sekunden Bar, empfohlene Option, Keyboard-Hints. Die Szene verlangsamt sich visuell, bleibt aber sichtbar.
- Effektbudget: kleine Lunge/Recoil-Bewegung für normale Treffer, Elementpartikel und kurzer Hit-Flash für starke Treffer, Camera Micro-Push und Shake nur für Crit/Overdrive, finale Bannerbewegung und anschließend Idle-Rückkehr. Kein permanentes Screen-Shake oder Glow.
- Rewards werden gestaffelt enthüllt: Outcome, Währungen, Monsterportraits, XP, Mastery, Unlock. Count-up und Balken dauern zusammen höchstens 1.8 Sekunden und sind überspringbar.
- `prefers-reduced-motion` sowie Effect Intensity ersetzen Bewegung durch sofortige Zustandswechsel, statische Impact-Ringe und Farb-/Kontrastwechsel. Kein Inhalt hängt von Animation ab.
- Bestehende Audio-Cues werden um `pulse-open`, `pulse-select`, `move-unlock` und `mastery-complete` ergänzt; Audio bleibt optional und lokal erzeugt.

## Balance und Fehlermodi

- Starter erhalten in `Training` einen Gegner-Snapshot, der einen Forecast von ungefähr 55-70% erzeugt. `Standard` bleibt anspruchsvoll, `Risk` ist klar als freiwillige hohe Varianz markiert.
- Ein leerer oder unvollständiger Squad erhält eine direkte Formation-Aktion statt einen sinnlosen 0%-Deploy. Unter 15% Forecast verlangt `Deploy Squad` eine einmalige klare Bestätigung oder empfiehlt Training.
- Ein verpasstes Pulse-Fenster wählt `Guard`; Browser-Hintergrundtabs und Reduced Motion dürfen den Timer nicht unfair verkürzen.
- Bei Pixi-Fehler bleibt der komplette Kampf als DOM-Timeline bedienbar. Ein abgebrochener Renderer darf Rewards weder doppelt noch gar nicht committen.
- Save/Reload während eines laufenden Kampfes stellt keinen halben Run wieder her; erst der atomare Ergebnis-Commit wird gespeichert.

## Umsetzungsschritte

1. Konzepte und Plan sichern, bestehende Battle-Tests als Baseline festhalten.
2. Tactical-Pulse-Regeln, Mastery-Modell, Save-Migration und pure Unit-Tests ergänzen.
3. Kampfstart in `prepare -> pulse -> resolve -> reveal` aufteilen und Ergebnis-Commit an das Animation-Completion-Promise binden.
4. Arena auf Battle Brief, fokussiertes Spielfeld, Tactical-Pulse-Rail und Growth Result umbauen; redundante Coach/Contract/Plan-Flächen entfernen oder in den Brief integrieren.
5. Pixi um individuelle HP, Move-Callouts, Pulse-Effekte, Standby-Frame und gezielte Finale-Effekte erweitern.
6. Evolution Tree und Monster Detail um Mastery-/Signature-Fortschritt sowie optionale Pfadbedingungen ergänzen.
7. Balance, Desktop/Mobile, Keyboard, Timeout, Reduced Motion, Renderer-Fallback und alle Kernflüsse verifizieren.

## Abnahmekriterien

- Ein neuer Spieler kann Mission, Plan und prognostizierten Ausgang in unter zehn Sekunden erklären.
- Jeder Kampf enthält genau ein verständliches Tactical-Pulse-Fenster; Auswahl und Timeout beeinflussen den finalen Modifikator messbar.
- Kein Reward, XP, Mastery, Log-Ausgang oder Ressourcenanstieg erscheint vor dem Finale.
- Nach jedem Kampf ist für jedes eingesetzte Monster sichtbar, was es gelernt hat und welches Wachstumsziel näher kam.
- Kernpfad-Evolution bleibt ohne Mastery-Grind erreichbar; mindestens ein optionaler Zweig demonstriert ein Mastery-Ziel.
- Desktop 1440x960 und Mobile 390x844 haben kein horizontales Dokument-Overflow, keine verdeckten Kreaturen und keine abgeschnittene Primäraktion.
- `npm.cmd run build`, `npm.cmd run test` und `npm.cmd run test:e2e` bestehen ohne Build-Warnungen.

## Festgelegte Annahmen

- Angular DOM + Pixi bleiben der vorhandene Stack; kein Engine-Wechsel und kein Backend.
- Tactical Pulse ist die einzige verpflichtende Entscheidung während des Kampfes; Overdrive bleibt optional.
- Standarddauer ist 35-50 Sekunden bei 1x; 2x und 4x bleiben erhalten.
- Collector Tech bleibt Default-Design; Pixel Arcade und Tactical Minimal erben dieselbe Informationsarchitektur.

## Implementierungsstand 2026-06-21

- Battle Brief ersetzt die redundanten Forecast-, Coach-, Contract- und Plan-Flaechen durch Mission, Squad Plan, Support, eine Prognose und eine Hauptaktion.
- Tactical Pulse ist mit `Break`, `Guard` und `Surge`, sechs Sekunden Timeout, Empfehlung und Tastatursteuerung `1` bis `3` umgesetzt.
- Rewards, XP, Logs und Mastery werden erst nach Abschluss der Battle-Animation atomar uebernommen.
- Monster Mastery wird gespeichert, migriert und im Growth Result sowie im Monster Detail angezeigt. Bei 25 MP wird ein typbasierter Move freigeschaltet.
- Der optionale TidalWolf-Pfad demonstriert eine Mastery-Anforderung; der zentrale Evolutionspfad bleibt frei von Mastery-Zwang.
- Pixi zeigt individuelle HP-Zustaende, Actor/Target-basierte Treffer, Move-Namen, Status, Effektivitaet und ein Pulse-Signal.
- Training skaliert bei einem unvollstaendigen Starter-Squad adaptiv auf eine knappe, spielbare Begegnung. Standard und Risk bleiben unveraendert.
- Standby, Desktop 1440x960 und Mobile 390x844 wurden ohne horizontales Overflow oder Browserfehler geprueft.
- Bewusste Abweichung: Die Timeline bleibt kurz und direkt, statt den Spieler bei 1x fuer 35 bis 50 Sekunden zu binden. Das folgt der technischen Vorgabe, lokale Interaktionen nicht durch cineastische Wartezeit auszubremsen.
