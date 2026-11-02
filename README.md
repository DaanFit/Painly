# Painly v6.6 — Routine & Progress

## Nieuw in deze versie

Painly opent op de ochtendroutine. De navigatie bestaat uit **Routine**, **History**, **JournalSpeak** en **Settings**. Log Pain is verwijderd uit de interface. Eerdere losse pijnregistraties worden bewaard in JSON-back-ups en verschijnen niet in de routinegeschiedenis.

### Routine

1. Registreer de pijn voor je linker- en rechterknie **vóór** de routine.
2. Doe **3 isometric-sets**, met een zelf gekozen tijd per set en **60 seconden rust** na set 1 en 2. De standaard is 45 seconden; een eerder zelf gekozen tijd blijft behouden. Elke volgende hold start je zelf.
3. Vul na het blok in hoeveel pijn je **tijdens de isometrics** voelde, links en rechts apart.
4. Vul je werkelijk uitgevoerde step-down-herhalingen per been en het toegevoegde gewicht in kg in. Het gewicht geldt voor beide benen. Tik op Done en registreer de pijn **tijdens de step downs**.
5. Vul je uitgevoerde squat-herhalingen en het toegevoegde gewicht in kg in. Tik op Done en registreer de pijn **tijdens de squats**.
6. Voeg eventueel één workout-opmerking toe en sla de routine op.

0 kg betekent alleen lichaamsgewicht. De herhalingsdoelen blijven 10 per been voor step downs en 10 deep squats. Lagere aantallen kunnen worden opgeslagen als een gedeeltelijke routine. Nieuwe metingen gaan over de pijn tijdens de oefenblokken; er worden geen aparte nametingen gevraagd.

### Totale trainingstimer

- Start bij de eerste isometric-hold, na de pijncheck vooraf.
- Telt rust, wachttijd en registraties tussen de oefeningen mee.
- Stopt bij Done na de squats. Het invullen van de laatste pijnscores en opmerking voegt geen tijd toe.
- **Pause workout** pauzeert zowel de totale tijd als een lopende hold/rusttimer. Resume workout hervat beide waar van toepassing.
- De gewone **Pause** bij de hold/rust pauzeert alleen die aftelklok; de totale workouttijd blijft lopen.
- De timer en velden blijven bewaard na herladen of sluiten. Waar ondersteund blijft het scherm tijdens een lopende hold/rust wakker.

Houd Painly geopend tijdens de oefeningen. De webversie biedt geen Live Activities of gegarandeerd geluid op een vergrendelde iPhone. Na een lange achtergrondpauze rekent de app de resterende tijd bij; hij start geen volgende hold zonder jouw tik.

### Vierdaagse progressieregel

- Alleen de geregistreerde pijn **tijdens isometrics** telt mee.
- Het volledige isometric-blok bestaat uit drie afgeronde holds.
- Beide knieën moeten op **vier opeenvolgende kalenderdagen lager dan 3** scoren, dus 0, 1 of 2.
- Een ontbrekende dag of score van 3 of hoger onderbreekt de reeks. Bij meerdere routines op één dag telt de hoogste geregistreerde isometric-score per knie; vier sessies op één dag zijn geen vier dagen.
- Pijn vooraf, tijdens step downs of tijdens squats beïnvloedt deze registratieregel niet.
- Het voorstel is **+15 seconden per set** boven op je gekozen tijd. Je bevestigt dit zelf; er verandert niets automatisch.
- Dagen die al gebruikt zijn voor een geaccepteerd voorstel worden niet opnieuw gebruikt voor het volgende voorstel. De eerstvolgende nieuwe kwalificerende dag start een nieuwe reeks.

Dit is jouw persoonlijke registratieregel, geen medische beoordeling.

### History

History toont uitsluitend routines. Bovenaan staan een grafiek van de dagelijkse hoogste isometric-pijnscore voor beide knieën en de voortgang naar vier opeenvolgende dagen. Kies 7 dagen, 30 dagen, 3 maanden, 1 jaar of alles. Ontbrekende scores worden niet als nul getoond; ontbrekende dagen blijven een onderbreking in de lijn.

Per routine zie je datum/tijd, sets en seconden, herhalingen, gewichten, totale duur, alle pijnmetingen en de eventuele opmerking. De CSV-export bevat routinegegevens, inclusief gewichten, meettype, tijd en notities. De JSON-back-up bevat ook timerinstellingen, onafgeronde voortgang en gearchiveerde losse pijnregistraties.

## Bestaande gegevens blijven bewaard

Oudere routines blijven leesbaar. Eerdere **na-de-oefening**-scores worden niet hernoemd naar tijdens-scores en tellen niet mee voor de nieuwe grafiek of de vierdaagse regel. Niet eerder gemeten tijden en gewichten blijven onbekend; de app verzint geen waarden. Een oudere onafgeronde routine kan nog met haar oorspronkelijke meetvragen worden afgerond. Start een nieuwe routine voor de nieuwe registratievorm.

JournalSpeak, het versnipperen, meditatie, kleuren en iconen blijven beschikbaar. JournalSpeak-tekst komt nooit in je geschiedenis of back-ups.

## Je bestaande GitHub Pages-app bijwerken

1. Open je huidige Painly op je iPhone. Kies **Settings → Download backup (JSON)**. Bewaar dit bestand privé; upload je back-up nooit naar je openbare GitHub-repository.
2. Pak het ZIP-bestand uit op je computer.
3. Upload deze **vijf bestanden samen** naar de bestaande map in je Painly-repository waar de huidige index.html staat:
   - `index.html`
   - `app.js`
   - `routine.js`
   - `styles.css`
   - `sw.js`
4. Vervang de bestaande bestanden en klik op **Commit changes**. Maak geen extra bovenliggende map. Icons, manifest en share-preview kunnen blijven staan.
5. Wacht tot GitHub Pages is bijgewerkt. Sluit Painly volledig af en open hem opnieuw. Herlaad zo nodig de bestaande Painly-website in Safari en open daarna de app opnieuw.
6. Controleer of je eerdere routines in History staan. Wis geen Safari-websitegegevens om een update af te dwingen.

Het complete ZIP bevat ook de ongewijzigde iconen en manifest. Blijf dezelfde website en hetzelfde beginscherm-icoon gebruiken.

## Opslag en herstel

Alle gegevens worden lokaal bewaard onder de bestaande sleutel `mijn-knie-journal-v1`; er is geen automatische cloudopslag. Settings → Routine CSV exporteert uitsluitend routines. Een JSON-back-up met routines vervangt na bevestiging ook de routines en timerinstellingen. Een oudere pijn-only-back-up laat bestaande routines ongewijzigd. Bewaar regelmatig een JSON-back-up.

## Controle

Functioneel getest: volledige routine; drie holds met twee rustperiodes; totale tijd met pauze, herladen en exclusie van eindnotities; gewichten en notities; pijn tijdens alle oefenblokken; vier kalenderdagen met grenswaarde 3; ontbrekende/dubbele/toekomstige dagen; zomertijdgrens; oudere routines en back-ups; foutieve import; opslagfouten; archivering van oude losse pijnregistraties; CSV- en HTML-escaping; JournalSpeak, meditatie en thema. De interface is in Chromium gecontroleerd op mobiele en desktopbreedtes (320–1040 px) en in lichte en donkere modus. Geluid en schermgedrag moeten nog op een fysieke iPhone worden gecontroleerd.
