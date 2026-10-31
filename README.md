# Painly v6.4 — Daily knee routine

## Nieuw

Een apart Engelstalig tabblad **Daily routine / Routine** met:
- Vrij instelbare isometric-timer in seconden (standaard 45; snelkeuzes 45/60/90/120).
- Start, pauze, hervatten en resetten; iedere volgende oefening start je zelf.
- 10 step downs per been en 10 deep squats, met tellers en afvinkknoppen.
- Verplichte pijnscores (0–10) voor beide knieën, voor en na de hele routine.
- Een voorstel van +15 seconden voor een volgende routine, uitsluitend wanneer de laatste routine volledig is afgerond en alle vier de scores lager zijn dan 2. Jij bevestigt de wijziging; er is geen automatische verhoging.
- Routinegeschiedenis en het aantal afgeronde dagen in de afgelopen 7 dagen.
- Gedeeltelijke routines opslaan; die geven geen verhogingsvoorstel.
- De gekozen tijd en een onafgeronde routine blijven lokaal bewaard.
- Routines, timerinstellingen en voortgang zitten in de bestaande JSON-back-up.
- Een aparte CSV-export voor routines in het nieuwe tabblad.

De voortgangsregel is jouw ingestelde registratieregel, geen medische beoordeling of automatische trainingsinstructie. De bestaande pijnregistratie, pijnrichtlijnen, grafiek, JournalSpeak, meditatie, kleuren en iconen zijn behouden.

## Je bestaande GitHub Pages-app bijwerken

1. Open je huidige Painly op je iPhone. Ga naar **Settings → Download backup (JSON)**. Bewaar de back-up privé; upload hem nooit naar je openbare GitHub-repository.
2. Pak het ZIP-bestand uit op je computer.
3. Upload deze **vijf bestanden samen**, rechtstreeks naar dezelfde map in je bestaande Painly-repository waar de huidige `index.html` staat:
   - `index.html`
   - `app.js`
   - `routine.js` (nieuw)
   - `styles.css`
   - `sw.js`
4. Vervang de bestaande bestanden en sla de wijzigingen op met **Commit changes**. Maak geen extra bovenliggende map. De bestaande icons-map, manifest en share-preview hoeven niet vervangen te worden.
5. Wacht tot GitHub Pages is bijgewerkt. Sluit Painly helemaal af en open hem opnieuw. Herlaad eventueel ook de bestaande Painly-website in Safari en open de app daarna opnieuw.
6. Controleer of je bestaande pijnregistraties aanwezig zijn en of je onderaan **Routine** ziet. Wis geen Safari-websitegegevens om een update af te dwingen.

Het complete ZIP-bestand bevat ook de ongewijzigde iconen en manifest. Voor een bestaande installatie volstaan de vijf bestanden hierboven. Blijf dezelfde website en hetzelfde beginscherm-icoon gebruiken.

## Timer op je iPhone

Houd Painly geopend tijdens de oefening. Waar ondersteund vraagt de timer om het scherm wakker te houden; dit is afhankelijk van de browser en het toestel. Als de app naar de achtergrond gaat, berekent de timer bij terugkomst de resterende tijd op basis van de klok. Geluid terwijl de iPhone vergrendeld is wordt niet gegarandeerd. Deze webversie biedt geen Live Activities. Een optioneel eindsignaal speelt wanneer de pagina zichtbaar is en je toestel geluid toestaat.

## Opslag en back-ups

Painly bewaart gegevens op dit toestel onder de bestaande sleutel `mijn-knie-journal-v1`. Routines staan in een eigen onderdeel van datzelfde back-upbestand; ze veranderen bestaande pijnregistraties niet. Er is geen automatische cloudopslag. Een back-up zonder dailyRoutine-onderdeel vervangt alleen pijnregistraties en laat bestaande routines staan. Een nieuwe back-up met dailyRoutine vervangt ook de routines en timerinstellingen, na bevestiging. De bestaande CSV-knop in Settings exporteert pijnregistraties; routine-CSV staat in Routine. JournalSpeak-tekst wordt nooit opgeslagen of opgenomen in back-ups.

## Validatie

Getest in Chromium op mobiele en desktopformaten (320–1040 px), zonder horizontale overloop; lichte en donkere weergave visueel gecontroleerd. Functioneel gecontroleerd: volledige routine, losse telling per been, timer pauzeren/hervatten en herladen, alle vier de grenswaarden van 2, onvolledige routines, eenmalig bevestigen van progressie, JSON-export/herstel, oude back-ups, afwijzen van ongeldige back-ups, terugdraaien bij opslagfouten en behoud van bestaande geschiedenis/thema/JournalSpeak/meditatie. Controle op een fysieke iPhone blijft nodig voor geluid en schermvergrendeling.
