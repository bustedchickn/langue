export type GuideValues = { time: string; later: string; points: number; penalty: number; hint: number }

export type LocalizedGuide = {
  goal: string
  host: readonly [name: string, first: string, second: string, third: string]
  guest: readonly [name: string, first: string, second: string, third: string]
  rules: (values: GuideValues) => readonly [string, string]
}

export const germanGuides = {
  'lost-instructions': {
    goal: 'Ordnet drei Teile so an, wie dein Partner es beschreibt. Löst alle drei Rätsel gemeinsam.',
    host: ['Anleitung', 'Nur du siehst die richtige Reihenfolge. Lies den privaten Hinweis in deiner Lernsprache oder lass ihn dir vorlesen.',
      'Sag deinem Partner im Sprach- oder Textchat, welche Farbe und Form links, in der Mitte und rechts liegen sollen.',
      'Besprecht jeweils eine Position. Formen und Farben können sich wiederholen, also nenne immer beides.'],
    guest: ['Anordnen', 'Nur du kannst die Teile auf deinem Brett verschieben. Frag nach der Farbe und Form für jede Position.',
      'Zieh ein Teil auf ein anderes, um sie zu tauschen. Du kannst auch beide Teile nacheinander anklicken oder antippen.',
      'Wenn alle drei Positionen stimmen, prüfe die Anordnung. Bei einer richtigen Lösung geht es weiter. Bei einem Fehler kannst du es erneut versuchen.'],
    rules: ({ time, points }) => [`Nach dem Countdown habt ihr insgesamt ${time} für alle drei Rätsel. Jede Lösung bringt ${points} Punkte.`,
      'Jedes Teil hat eine andere Kombination aus Form und Farbe. In jeder Runde gibt es neue Teile und einen neuen Hinweis.'],
  },
  'icon-communication': {
    goal: 'Findet in jeder der zehn Runden gemeinsam das gesuchte Symbol.',
    host: ['Auswählen', 'Du siehst neun Symbole, weißt aber nicht, welches gesucht ist.',
      'Warte, bis dein Partner das gesuchte Symbol sieht. Hör zu oder lies die Beschreibung im Chat.',
      'Klicke oder tippe auf das beschriebene Symbol. Ein Treffer bringt einen Punkt und startet eine neue Runde.'],
    guest: ['Beschreiben', 'Nach einer kurzen Wartezeit siehst nur du das gesuchte Symbol. Dein Partner sieht neun Möglichkeiten.',
      'Beschreibe den Gegenstand, sein Aussehen oder seinen Zweck in der angezeigten Lernsprache. Nutze Sprache oder Textchat.',
      'Beschreibe weiter, bis dein Partner richtig liegt. Behalte die Zeit im Blick und gib nach einem Fehler einen genaueren Hinweis.'],
    rules: ({ time, later, penalty }) => [`Nach dem Einblenden habt ihr in Runde 1 ${time}, danach pro Runde ${later}. Die Wartezeit zählt nicht mit.`,
      `Eine falsche Wahl kostet ${penalty} Sekunden. Ihr könnt es erneut versuchen, bis die Zeit abläuft. Schließt zehn Runden ab, um zu gewinnen.`],
  },
  'map-navigator': {
    goal: 'Führt die Spielfigur erst zu Kontrollpunkt 1, dann zu Kontrollpunkt 2 und schließlich zum Zielstern.',
    host: ['Weg erklären', 'Nur deine Karte zeigt die markierte Route, die beiden Kontrollpunkte und den Zielstern.',
      'Gib jeweils eine Anweisung in deiner Lernsprache. Nutze Gebäude, Orientierungspunkte oder Zeilen- und Spaltennummern.',
      'Verfolge die Position deines Partners. Wenn er falsch abbiegt, führe ihn zurück zur Route und zum nächsten Kontrollpunkt.'],
    guest: ['Weg folgen', 'Du siehst deine Position und Orientierungspunkte. Frag deinen Partner nach dem Weg, denn Route und Ziel sind verborgen.',
      'Wische über die Karte, nutze die Pfeiltasten oder wähle eine Richtungstaste. Norden ist oben, Süden unten, Westen links und Osten rechts.',
      'Besuche beide Kontrollpunkte der Reihe nach. Der Zähler bestätigt jeden Punkt. Frage nach, wenn ein Zug als falsch markiert wird.'],
    rules: ({ time, points, penalty }) => [`Nach dem Countdown habt ihr ${time}. Erreicht das Ziel nach beiden Kontrollpunkten, um zu gewinnen.`,
      `Eine abgeschlossene Route bringt ${points} Punkte. Falsch abbiegen, zurückgehen oder ein Zug über den Kartenrand kostet jeweils ${penalty} Punkte.`],
  },
  'tandem-drive': {
    goal: 'Steuert das Fahrzeug gemeinsam, weicht Hindernissen aus und passiert vier Tore, bevor Zeit oder Fahrzeugzustand auf null fallen.',
    host: ['Optik · Navigation', 'Deine Anzeige zeigt die sichere Spur. Nenne deinem Partner den Spurcode: ALPHA, BRAVO, DELTA oder OMEGA.',
      'Beschreibe sichtbare Hindernisse und achte auf Warnungen deines Partners. Manche Hindernisse sieht nur einer von euch.',
      'Halte deine Antriebstaste gedrückt. Beide Antriebe zusammen fahren geradeaus, ein einzelner dreht das Fahrzeug. Lass los, um deine Seite anzuhalten.'],
    guest: ['Radar · Takt', 'Deine Anzeige zeigt den Takt. Sag deinem Partner, wann ihr fahren und wann ihr warten sollt.',
      'Fahrt nah an ein verriegeltes Tor. Öffne es bei Grün und gib deinem Partner das Signal. Taktgesteuerte Tore öffnen sich bei Grün von selbst.',
      'Halte deine Antriebstaste gedrückt. Stimmt beim Lenken eure Bewegungen ab und warne vor Hindernissen, die nur du siehst.'],
    rules: ({ time }) => ['Halte die Leertaste, wenn keine Schaltfläche ausgewählt ist, oder halte die Fahrfläche oder Antriebstaste gedrückt. Bei fokussierter Antriebstaste geht auch Enter. Lass los, um den Antrieb zu stoppen. Tippen im Chat löst ihn nicht aus.',
      `Ihr habt ${time}. Zusammenstöße beschädigen das Fahrzeug. Ein passiertes Tor repariert einen Teil des Schadens. Achtet nach einem Seitenwechsel auf eure neue Rolle und Antriebstaste.`],
  },
  'spot-difference': {
    goal: 'Findet alle drei Unterschiede zwischen den fünf Gegenständen in euren beiden Bildern.',
    host: ['Person 1', 'Du siehst nur Bild 1. Dein Partner sieht ein ähnliches Bild mit anderen Gegenständen, Farben oder Details.',
      'Beschreibe einen Gegenstand und seine Position. Bitte deinen Partner, dieselbe Stelle in seinem Bild zu beschreiben.',
      'Wenn ihr euch über einen Unterschied einig seid, tippt oder klickt darauf. Ihr könnt beide markieren und seht denselben Fortschritt.'],
    guest: ['Person 2', 'Du siehst nur Bild 2. Vergleiche es mit der Beschreibung von Bild 1 im Sprach- oder Textchat.',
      'Prüfe Art, Farbe und Details jedes Gegenstands. Beschreibt die Position, etwa oben links oder unten rechts, damit ihr dieselbe Stelle meint.',
      'Tippe oder klicke einen bestätigten Unterschied an. Beide sehen die Markierung. Jeder Unterschied zählt nur einmal.'],
    rules: ({ time, points, penalty }) => [`Findet alle Unterschiede in ${time}. Ein Treffer bringt ${points} Punkte, eine falsche Wahl kostet ${penalty}. Über das i-Symbol kannst du das Wort in deiner Lernsprache nachsehen, ohne zu raten.`,
      'Wenn ihr vorzeitig aufhört, seht ihr das aktuelle Ergebnis. Beim Zurücksetzen werden Funde und Fehler gelöscht, die Zeit läuft weiter.'],
  },
  codenames: {
    goal: 'Findet alle neun lila Teamwörter unter 25 Karten und meidet die schwarze Attentäterkarte.',
    host: ['Hinweise geben', 'Nur du siehst, welche Karten zum Team gehören, neutral sind oder den Attentäter zeigen. Verrate das deinem Partner nicht.',
      'Gib ein einziges Wort in deiner Lernsprache ein und wähle, zu wie vielen Teamwörtern es passt. Kein Wort auf dem Brett darf als Hinweis dienen.',
      'Gib den Hinweis ab. Warte, bis dein Partner alle Versuche genutzt hat, passt oder eine neutrale Karte wählt. Dann gib den nächsten Hinweis.'],
    guest: ['Raten', 'Lies oder hör den Hinweis und seine Zahl. Wähle so viele passende Wörter aus, eine Karte nach der anderen.',
      'Eine Teamkarte bringt Punkte. Eine neutrale Karte beendet den Zug. Die schwarze Karte beendet sofort das Spiel.',
      'Über die Hilfetaste kannst du eine Definition in deiner fließend gesprochenen Sprache ansehen. Du kannst jederzeit auf die restlichen Versuche verzichten.'],
    rules: ({ points, hint, penalty }) => [`Es gibt kein Zeitlimit. Ihr habt neun Hinweisrunden für neun Teamwörter. Ein Treffer bringt ${points} Punkte, ein Fehler kostet ${penalty}. Eine Definition kostet einmal pro Karte ${hint} Punkte und ist für beide sichtbar.`,
      'Nach neun Runden beginnt die Entscheidung ohne neue Hinweise. Jeder weitere Versuch muss ein Teamwort treffen. Ein Fehler beendet das Spiel.'],
  },
} satisfies Record<string, LocalizedGuide>
