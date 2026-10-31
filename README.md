# Painly v6.5 — Morning routine

## Nieuw

- Painly opent direct op **Morning routine**. Dit is ook het eerste tabblad.
- Pijncheck voor beide knieën voor je begint.
- **3 isometric-holds** met je eigen tijd per set. Na set 1 en 2 start automatisch een **rusttimer van 60 seconden**. Je start elke volgende hold zelf. Er volgt geen rusttimer na de derde set.
- Pauzeren, hervatten, huidige hold/rust resetten en voortgang bewaren blijven beschikbaar.
- Na het hele isometric-blok vul je voor beide knieën een pijnscore in.
- Daarna vul je de uitgevoerde **step-down-herhalingen per been** in en tik je op **Done**. Daarna volgt een pijncheck voor beide knieën.
- Vervolgens vul je de **deep-squat-herhalingen** in en tik je op **Done**. Daarna volgt de laatste pijncheck.
- De doelen blijven 10 step downs per been en 10 deep squats; je kunt het werkelijke aantal invullen (ook lager of hoger). Minder dan het doel of eerder stoppen wordt als gedeeltelijk opgeslagen, zonder verhogingsvoorstel.
- In de geschiedenis zie je de sets, herhalingen en alle vier meetmomenten (vooraf, na isometrics, na step downs, na deep squats).
- Je afgesproken +15 seconden-regel blijft gebaseerd op beide knieën voor en aan het einde van de volledige routine. Alle vier die scores moeten lager dan 2 zijn. De tussentijdse scores worden apart bijgehouden. De verhoging is altijd een voorstel dat je zelf bevestigt.
- Routines en alle nieuwe meetgegevens zitten in JSON-back-ups en de aparte routine-CSV.

Oudere opgeslagen routines blijven bewaard als eerdere routines met één set; niet-gemeten pijnscores worden als — getoond. Een oudere onafgeronde routine wordt zonder verzonnen sets of pijnscores voortgezet. Start een nieuwe routine voor de nieuwe reeks van drie holds.

De overige onderdelen — pijnregistratie, bestaande pijnrichtlijnen, grafiek, JournalSpeak, meditatie, kleuren en iconen — zijn behouden. De progressieregel is jouw registratieregel, geen medische beoordeling.

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

Functioneel getest: routine als startpagina; drie holds met twee rustperiodes; handmatig starten van volgende sets; pauzeren en hervatten na herladen; lange achtergrondpauzes zonder automatisch extra holds af te ronden; ingevulde aantallen met één klik op Done; alle pijncheckpoints; grenswaarde 2; oudere back-ups/routines; opslagfouten en bestaande log/thema/JournalSpeak/meditatie. Mobiele en desktopweergave getest in Chromium. Een fysieke iPhone-test blijft nodig voor geluid en scherm wakker houden.
