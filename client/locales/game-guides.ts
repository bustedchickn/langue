import type { Language } from '../../shared/types'
import { germanGuides, type LocalizedGuide, type GuideValues } from './game-guides-de'

type GuideId = keyof typeof germanGuides
type Guide = Omit<LocalizedGuide, 'guest'> & { guest: LocalizedGuide['guest'] | ((values: GuideValues) => LocalizedGuide['guest']) }
export const localizedGuides = {
  French: {
    'lost-instructions': {
      goal: "Disposez trois pièces selon l’indice et résolvez les trois puzzles ensemble.",
      host: ["Donner les consignes","Lisez ou écoutez votre indice privé dans la langue que vous apprenez.","Indiquez la forme et la couleur des pièces à gauche, au milieu et à droite.","Décrivez une position à la fois. Les formes et les couleurs peuvent se répéter."],
      guest: ["Placer les pièces","Demandez la couleur et la forme pour chaque position.","Faites glisser une pièce sur une autre ou sélectionnez-les l’une après l’autre pour les échanger.","Vérifiez la disposition. Vous pouvez réessayer si elle est incorrecte."],
      rules: ({ time, points }) => [`Après le compte à rebours, vous avez ${time}. Chaque puzzle résolu rapporte ${points} points.`, "Chaque combinaison de forme et de couleur est unique. Les pièces et l’indice changent à chaque puzzle."],
    },
    'icon-communication': {
      goal: "Trouvez ensemble l’icône mystère dans chacune des dix manches.",
      host: ["Choisir","Vous voyez neuf icônes, mais vous ignorez laquelle est la cible.","Attendez la description de votre partenaire, à l’oral ou dans le chat.","Sélectionnez l’icône décrite. Une bonne réponse rapporte un point et lance la manche suivante."],
      guest: ["Décrire","Après une courte attente, vous seul voyez l’icône mystère.","Décrivez son apparence ou son usage dans la langue indiquée, à l’oral ou par écrit.","Après une erreur, donnez un indice plus précis en surveillant le temps."],
      rules: ({ time, later, penalty }) => [`Après l’apparition de l’icône, vous avez ${time} à la première manche et ${later} à chaque manche suivante. L’attente ne compte pas.`, `Chaque erreur retire ${penalty} secondes. Réessayez tant qu’il reste du temps.`],
    },
    'map-navigator': {
      goal: "Passez par les points de contrôle 1 et 2, dans cet ordre, puis rejoignez l’étoile.",
      host: ["Guider","Vous seul voyez le trajet, les deux points de contrôle et l’étoile.","Donnez une direction à la fois dans la langue que vous apprenez. Citez des repères ou les numéros de ligne et de colonne.","Suivez la position de votre partenaire et ramenez-le sur le trajet en cas d’erreur."],
      guest: ["Se déplacer","Vous voyez votre position et les repères. Demandez à votre partenaire où aller.","Glissez sur la carte ou utilisez les flèches ou les boutons de direction. Le nord est en haut.","Passez par les deux points dans l’ordre. Le compteur confirme chacun d’eux."],
      rules: ({ time, points, penalty }) => [`Après le compte à rebours, vous avez ${time}. Atteignez l’étoile après les deux points pour gagner.`, `Le parcours terminé rapporte ${points} points. Une erreur, un pas en arrière ou une tentative de sortir de la carte coûte ${penalty} points.`],
    },
    'tandem-drive': {
      goal: "Pilotez ensemble, contournez les obstacles et franchissez quatre portes avant de manquer de temps ou d’endommager complètement la voiture.",
      host: ["Optique · Navigation","Annoncez la voie sûre : ALPHA, BRAVO, DELTA ou OMEGA.","Décrivez les obstacles visibles et écoutez les avertissements de votre partenaire.","Maintenez votre propulseur. Les deux font avancer tout droit, un seul fait pivoter. Relâchez pour arrêter votre côté."],
      guest: ["Radar · Rythme","Suivez le rythme et dites à votre partenaire quand partir et quand attendre.","Près d’une porte verrouillée, ouvrez-la au vert et donnez le signal. La porte cyclique s’ouvre toute seule au vert.","Actionnez votre propulseur et signalez les obstacles que vous seul voyez."],
      rules: ({ time }) => ["Maintenez Espace si aucun bouton n’a le focus, ou maintenez la zone de conduite ou le propulseur. Si le propulseur a le focus, vous pouvez aussi maintenir Entrée. Écrire dans le chat ne déclenche rien.", `Vous avez ${time}. Les collisions endommagent la voiture et le passage d’une porte la répare en partie. Après un échange de côté, vérifiez votre rôle et votre propulseur.`],
    },
    'spot-difference': {
      goal: "Trouvez les trois différences parmi les cinq objets des deux images.",
      host: ["Joueur 1","Vous ne voyez que la première image. Celle de votre partenaire est légèrement différente.","Décrivez un objet et sa position, puis demandez ce qui se trouve au même endroit sur l’autre image.","Si vous êtes d’accord, sélectionnez l’objet. Votre progression est commune."],
      guest: ["Joueur 2","Vous ne voyez que la deuxième image. Comparez-la à la description de votre partenaire.","Comparez le type, la couleur et les détails des objets. Précisez la position, par exemple en haut à gauche.","Sélectionnez l’objet quand vous êtes d’accord. Chaque différence ne compte qu’une fois."],
      rules: ({ time, points, penalty }) => [`Vous avez ${time}. Une bonne réponse rapporte ${points} points et une erreur en coûte ${penalty}. Le bouton i affiche le mot sans valider de réponse.`, "Un arrêt anticipé affiche le résultat actuel. La réinitialisation efface les réponses, mais le temps continue."],
    },
    'codenames': {
      goal: "Trouvez les neuf mots violets parmi 25 cartes et évitez la carte noire de l’assassin.",
      host: ["Donner les indices","Vous seul voyez quelles cartes sont à l’équipe, neutres ou à l’assassin. Gardez cette information secrète.","Saisissez un indice d’un seul mot dans la langue que vous apprenez et indiquez le nombre de cartes liées. N’utilisez pas un mot du plateau.","Envoyez l’indice, puis attendez que votre partenaire termine, passe ou choisisse une carte neutre."],
      guest: ({ points, hint }) => ["Deviner", "Lisez ou écoutez l’indice et son nombre. Choisissez les cartes liées une à une.", `Une carte violette vaut ${points} points. Une carte neutre termine le tour, l’assassin termine la partie.`, `Consultez une définition dans votre langue courante pour ${hint} points ou passez en cas de doute.`],
      rules: ({ points, penalty, hint }) => [`Vous avez neuf tours, sans limite de temps. Une bonne réponse rapporte ${points} points, une erreur en coûte ${penalty}. Une définition coûte ${hint} points une fois par carte et se partage.`, "Après neuf tours, il n’y a plus d’indices. Choisissez uniquement les mots restants de l’équipe. Une erreur met fin à la partie."],
    },
  },
  Spanish: {
    'lost-instructions': {
      goal: "Coloquen tres piezas según la pista y resuelvan juntos los tres rompecabezas.",
      host: ["Dar instrucciones","Lee o escucha tu pista privada en el idioma que estás aprendiendo.","Indica por chat o voz qué forma y color van a la izquierda, en el centro y a la derecha.","Describe una posición a la vez. Algunas formas y colores se repiten."],
      guest: ["Colocar piezas","Pregunta qué forma y color hacen falta en cada posición.","Arrastra una pieza sobre otra o selecciona las dos una tras otra para intercambiarlas.","Comprueba la disposición. Si no es correcta, puedes volver a intentarlo."],
      rules: ({ time, points }) => [`Tras la cuenta atrás tienen ${time}. Cada solución vale ${points} puntos.`, "Cada combinación de forma y color es única. Las piezas y la pista cambian en cada rompecabezas."],
    },
    'icon-communication': {
      goal: "Encuentren el icono misterioso en cada una de las diez rondas.",
      host: ["Elegir","Ves nueve iconos, pero no sabes cuál es el objetivo.","Espera a que tu pareja lo describa por voz o por chat.","Selecciona el icono descrito. Un acierto vale un punto y empieza la siguiente ronda."],
      guest: ["Describir","Tras una breve espera, solo tú ves el icono misterioso.","Describe su aspecto o para qué sirve en el idioma indicado.","Tras un fallo, da una pista más concreta sin perder de vista el tiempo."],
      rules: ({ time, later, penalty }) => [`Cuando aparece el icono tienen ${time} en la primera ronda y ${later} por ronda a partir de entonces. La espera no cuenta.`, `Un error resta ${penalty} segundos. Pueden intentarlo de nuevo mientras quede tiempo.`],
    },
    'map-navigator': {
      goal: "Pasen por los puntos de control 1 y 2 en orden y lleguen a la estrella.",
      host: ["Navegar","Solo tú ves la ruta, los puntos de control y la estrella.","Da una indicación a la vez en el idioma que estás aprendiendo. Usa referencias o números de fila y columna.","Sigue la posición de tu pareja y ayúdala a volver a la ruta si se equivoca."],
      guest: ["Desplazarse","Ves tu posición y los puntos de referencia. Pregunta hacia dónde debes ir.","Desliza el dedo o usa las teclas de flecha o los botones de dirección. El norte está arriba.","Visita los dos puntos de control en orden y comprueba el contador."],
      rules: ({ time, points, penalty }) => [`Tras la cuenta atrás tienen ${time}. Para ganar, pasen por los dos puntos y alcancen el destino.`, `Completar la ruta vale ${points} puntos. Girar mal, retroceder o intentar salir del mapa cuesta ${penalty} puntos.`],
    },
    'tandem-drive': {
      goal: "Conduzcan juntos, esquiven obstáculos y crucen cuatro puertas antes de agotar el tiempo o la resistencia.",
      host: ["Óptica · Navegación","Di cuál es el carril seguro: ALPHA, BRAVO, DELTA u OMEGA.","Describe los obstáculos que ves y escucha los avisos de tu pareja.","Mantén pulsado tu propulsor. Ambos a la vez avanzan en línea recta, solo uno hace girar. Suelta para detener ese lado."],
      guest: ["Radar · Ritmo","Mira el pulso y avisa cuándo avanzar y cuándo esperar.","Cerca de la puerta, desbloquéala en verde y da la señal. La compuerta cíclica se abre sola en verde.","Maneja tu propulsor y advierte de los obstáculos que solo tú ves."],
      rules: ({ time }) => ["Mantén pulsado Espacio sin enfocar ningún botón, o mantén pulsado el propulsor o la zona de conducción. Con el propulsor enfocado también puedes usar Intro. Escribir en el chat no activa los controles.", `Tienen ${time}. Chocar daña el vehículo y cruzar puertas lo repara en parte. Si cambian de lado, revisen su función y su propulsor.`],
    },
    'spot-difference': {
      goal: "Encuentren tres diferencias entre los cinco objetos de las dos imágenes.",
      host: ["Jugador 1","Solo ves la primera imagen. La de tu pareja tiene algunos cambios.","Describe un objeto y su posición y pregunta qué hay en ese mismo sitio en la otra imagen.","Cuando coincidan, seleccionen el objeto. Ambos ven el progreso."],
      guest: ["Jugador 2","Solo ves la segunda imagen. Compárala con la descripción de tu pareja.","Compara el tipo de objeto, su color y sus detalles. Indica dónde está, por ejemplo arriba a la izquierda.","Selecciona el objeto cuando estén de acuerdo. Cada diferencia puntúa una sola vez."],
      rules: ({ time, points, penalty }) => [`Tienen ${time}. Un acierto da ${points} puntos y un error cuesta ${penalty}. El icono i muestra la palabra sin registrar una respuesta.`, "Si terminan antes de tiempo, verán el resultado actual. Reiniciar borra las respuestas, pero el reloj sigue."],
    },
    'codenames': {
      goal: "Encuentren las nueve palabras violetas entre 25 cartas y eviten la carta negra del asesino.",
      host: ["Dar pistas","Solo tú puedes distinguir las cartas del equipo, las neutras y la del asesino. Mantén esa información en secreto.","Escribe una pista de una palabra en el idioma que practicas e indica cuántas cartas relaciona. No uses palabras del tablero.","Envía la pista y espera a que tu pareja termine, pase o elija una carta neutra."],
      guest: ({ points, hint }) => ["Adivinar", "Lee o escucha la pista y su número. Elige las cartas relacionadas de una en una.", `Una carta violeta vale ${points} puntos. Una neutra acaba el turno y la del asesino acaba la partida.`, `Consulta una definición en tu idioma fluido por ${hint} puntos o pasa si tienes dudas.`],
      rules: ({ points, penalty, hint }) => [`No hay límite de tiempo. Tienen nueve turnos. Acertar da ${points} puntos y fallar cuesta ${penalty}. Cada definición cuesta ${hint} puntos una vez por carta y se comparte.`, "Después de nueve turnos no hay pistas nuevas. Elijan solo palabras del equipo. Cualquier error termina la partida."],
    },
  },
  German: germanGuides,
  Italian: {
    'lost-instructions': {
      goal: "Disponete i tre pezzi seguendo l’indizio e risolvete tre rompicapi.",
      host: ["Istruzioni","Leggi l’indizio privato nella lingua che impari oppure ascoltalo.","Indica forma e colore a sinistra, al centro e a destra.","Spiega una posizione alla volta, anche se un colore o una forma si ripetono."],
      guest: ["Disposizione","Chiedi la forma e il colore per ogni posizione.","Trascina un pezzo sull’altro o selezionali in successione per scambiarli.","Verifica la disposizione; se è sbagliata, riprova."],
      rules: ({ time, points }) => [`Dopo il conto alla rovescia avete ${time}. Ogni soluzione vale ${points} punti.`, "Ogni coppia forma e colore è unica. I pezzi e l’indizio cambiano a ogni rompicapo."],
    },
    'icon-communication': {
      goal: "Trovate l’icona misteriosa in ciascuno dei dieci turni.",
      host: ["Selezione","Vedi nove icone, ma non sai quale cercare.","Aspetta la descrizione della persona che gioca con te.","Tocca l’icona descritta. Un successo vale un punto e avvia un nuovo turno."],
      guest: ["Descrizione","Dopo una breve attesa, solo tu vedi l’icona misteriosa.","Descrivine l’aspetto o l’uso nella lingua indicata, a voce o in chat.","Continua a spiegare e, dopo un errore, dai un indizio più preciso."],
      rules: ({ time, later, penalty }) => [`Dal momento in cui appare l’icona avete ${time} al primo turno e ${later} nei successivi.`, `Un errore costa ${penalty} secondi. Potete riprovare fino allo scadere del tempo.`],
    },
    'map-navigator': {
      goal: "Guidate chi viaggia al punto 1, poi al 2 e infine alla stella.",
      host: ["Navigazione","Solo tu vedi il percorso, i due punti e la destinazione.","Dai un’indicazione alla volta nella lingua che impari, usando riferimenti o coordinate.","Se l’altra persona sbaglia, guidala verso il percorso e il prossimo punto."],
      guest: ["Viaggio","Vedi dove ti trovi e i punti di riferimento. Chiedi dove andare.","Scorri, usa le frecce o premi i pulsanti. Il nord è in alto.","Passa per i due punti in ordine. Il contatore li conferma."],
      rules: ({ time, points, penalty }) => [`Dopo il conto alla rovescia avete ${time}. Raggiungete il traguardo passando per entrambi i punti.`, `Completare il percorso vale ${points} punti. Una svolta errata, un passo indietro o fuori mappa costa ${penalty} punti.`],
    },
    'tandem-drive': {
      goal: "Guidate insieme, evitate gli ostacoli e passate quattro cancelli prima di esaurire tempo o resistenza.",
      host: ["Ottica · Navigazione","Indica la corsia sicura: ALPHA, BRAVO, DELTA o OMEGA.","Descrivi gli ostacoli che vedi e ascolta gli avvisi dell’altra persona.","Tieni premuto il tuo propulsore. Due fanno andare dritto, uno fa ruotare. Rilascia per fermarti."],
      guest: ["Radar · Ritmo","Di’ quando partire e quando aspettare guardando il ritmo.","Vicino al cancello, apri sul verde. La serranda ciclica si apre da sola sul verde.","Usa il tuo propulsore e segnala gli ostacoli che vedi solo tu."],
      rules: ({ time }) => ["Tieni premuta la barra spaziatrice senza selezionare un pulsante, oppure tieni premuto il propulsore o l’area di guida. Sul propulsore funziona anche Invio. La chat non aziona i comandi.", `Avete ${time}. Gli urti danneggiano il veicolo, i cancelli superati lo riparano in parte. Dopo uno scambio, controllate ruolo e propulsore.`],
    },
    'spot-difference': {
      goal: "Trovate tre differenze tra i cinque oggetti nelle due immagini.",
      host: ["Giocatore 1","Vedi solo la prima immagine, simile a quella dell’altra persona.","Descrivi un oggetto e la sua posizione, poi chiedi cosa vede lì l’altra persona.","Se siete d’accordo, tocca o fai clic sull’oggetto. Entrambi vedete il progresso."],
      guest: ["Giocatore 2","Vedi solo la seconda immagine. Confrontala con la descrizione ricevuta.","Controlla tipo, colore e dettagli; specifica la posizione.","Se siete d’accordo, seleziona l’oggetto. Ogni differenza si conta una volta."],
      rules: ({ time, points, penalty }) => [`Avete ${time}. Ogni differenza vale ${points} punti e ogni errore ne costa ${penalty}. Usa l’icona i per vedere le parole senza indovinare.`, "Terminare in anticipo mostra il risultato attuale. Azzerare elimina i tentativi, ma il tempo continua."],
    },
    'codenames': {
      goal: "Trovate le nove parole viola tra 25 carte senza scegliere l’assassino.",
      host: ["Indizi","Solo tu vedi quali carte sono della squadra, neutre o dell’assassino. Tienilo segreto.","Inserisci un indizio di una sola parola nella lingua che impari e il numero di carte collegate. Non usare parole sul tavolo.","Invia l’indizio e aspetta che l’altra persona finisca, passi o scelga una carta neutra."],
      guest: ({ points, hint }) => ["Risposte", "Leggi o ascolta l’indizio e scegli il numero indicato di parole, una alla volta.", `Una carta viola vale ${points} punti, una neutra chiude il turno e l’assassino chiude la partita.`, `Apri una definizione nella tua lingua fluente per ${hint} punti oppure passa.`],
      rules: ({ points, hint, penalty }) => [`Nessun limite di tempo. Avete nove turni. Una parola corretta vale ${points} punti, un errore ne costa ${penalty}. L’aiuto costa ${hint} punti una volta per carta ed è condiviso.`, "Dopo nove turni, niente più indizi: ogni risposta deve essere una parola della squadra. Un errore chiude la partita."],
    },
  },
  Portuguese: {
    'lost-instructions': {
      goal: "Organizem três peças seguindo a pista e resolvam os três desafios.",
      host: ["Instruções","Leia ou ouça a pista privada no idioma que está aprendendo.","Diga qual cor e forma vão à esquerda, no meio e à direita.","Descreva uma posição de cada vez, mesmo se a cor ou a forma se repetir."],
      guest: ["Organização","Pergunte a cor e o formato de cada posição.","Arraste uma peça sobre a outra ou selecione as duas em sequência para trocá-las.","Confira a disposição. Se errar, tente de novo."],
      rules: ({ time, points }) => [`Depois da contagem regressiva, vocês têm ${time}. Cada solução vale ${points} pontos.`, "Cada combinação de cor e forma é única. As peças e a pista mudam a cada desafio."],
    },
    'icon-communication': {
      goal: "Encontrem o ícone misterioso em cada uma das dez rodadas.",
      host: ["Seleção","Você vê nove ícones, sem saber qual é o alvo.","Espere sua dupla descrever o ícone por voz ou texto.","Toque ou clique no ícone. Um acerto vale um ponto e começa outra rodada."],
      guest: ["Descrição","Após uma breve espera, só você vê o ícone misterioso.","Descreva a aparência ou a função no idioma indicado, por voz ou chat.","Continue explicando. Se sua dupla errar, dê uma pista mais precisa."],
      rules: ({ time, later, penalty }) => [`Após o ícone aparecer, vocês têm ${time} na primeira rodada e ${later} em cada rodada seguinte.`, `Um erro custa ${penalty} segundos. Vocês podem tentar de novo até o tempo acabar.`],
    },
    'map-navigator': {
      goal: "Guiem quem viaja até os pontos 1 e 2, nessa ordem, e depois até a estrela.",
      host: ["Navegação","Só seu mapa mostra o caminho, os pontos de controle e a estrela.","Dê uma instrução por vez no idioma que está aprendendo. Use referências ou coordenadas.","Acompanhe a posição da sua dupla e guie-a de volta ao caminho se errar."],
      guest: ["Viagem","Você vê sua posição e os pontos de referência. Pergunte para onde ir.","Deslize, use as setas ou selecione um botão de direção. O norte fica para cima.","Passe pelos dois pontos na ordem certa. O contador confirma cada um."],
      rules: ({ time, points, penalty }) => [`Após a contagem regressiva, vocês têm ${time}. Passem pelos dois pontos antes de chegar ao destino.`, `Completar a rota vale ${points} pontos. Virar errado, voltar ou tentar sair do mapa custa ${penalty} pontos.`],
    },
    'tandem-drive': {
      goal: "Dirijam juntos, desviem das barreiras e atravessem quatro portões antes que o tempo ou a resistência acabem.",
      host: ["Visão · Navegação","Informe a faixa segura: ALPHA, BRAVO, DELTA ou OMEGA.","Descreva os obstáculos que vê e escute os avisos da sua dupla.","Segure seu propulsor. Os dois juntos vão reto, um só faz girar. Solte para parar seu lado."],
      guest: ["Radar · Ritmo","Observe o ritmo e avise quando avançar ou esperar.","Perto do portão, libere a trava no verde. O portão cíclico abre sozinho no verde.","Use seu propulsor e avise sobre obstáculos que só você vê."],
      rules: ({ time }) => ["Segure Espaço sem focar um botão, ou pressione o propulsor ou a área de direção. Com o propulsor em foco, também pode usar Enter. Digitar no chat não aciona os controles.", `Vocês têm ${time}. Colisões causam danos e atravessar um portão recupera parte da resistência. Se trocarem de lado, confiram a função e o propulsor.`],
    },
    'spot-difference': {
      goal: "Encontrem três diferenças entre cinco objetos nas duas imagens.",
      host: ["Jogador 1","Você só vê a primeira imagem. A da sua dupla é parecida.","Descreva um objeto e sua posição. Pergunte o que há no mesmo lugar na outra imagem.","Quando concordarem, toquem ou cliquem no objeto. O progresso aparece para os dois."],
      guest: ["Jogador 2","Você só vê a segunda imagem. Compare com a descrição da sua dupla.","Confira o tipo, a cor e os detalhes. Diga onde o objeto fica.","Marque o objeto quando concordarem. Cada diferença só conta uma vez."],
      rules: ({ time, points, penalty }) => [`Vocês têm ${time}. Um acerto vale ${points} pontos e um erro custa ${penalty}. O ícone i mostra palavras sem registrar tentativa.`, "Encerrar antes da hora mostra o resultado atual. Reiniciar limpa os acertos e erros, mas o relógio continua."],
    },
    'codenames': {
      goal: "Encontrem as nove palavras roxas entre 25 cartas sem escolher o assassino.",
      host: ["Pistas","Só você vê as cartas da equipe, neutras e do assassino. Guarde essa informação.","Dê uma pista de uma palavra no idioma que está aprendendo e selecione o número de cartas. Não use palavras do tabuleiro.","Envie a pista. Espere sua dupla concluir, passar ou escolher uma carta neutra."],
      guest: ({ points, hint }) => ["Palpites", "Leia ou ouça a pista. Selecione o número indicado de cartas, uma por vez.", `Uma carta roxa vale ${points} pontos. Uma neutra encerra o turno; o assassino encerra o jogo.`, `Veja a definição no seu idioma fluente por ${hint} pontos ou passe a vez.`],
      rules: ({ points, hint, penalty }) => [`Não há limite de tempo. Vocês têm nove turnos. Um acerto vale ${points} e um erro custa ${penalty}. A ajuda custa ${hint} pontos uma vez por carta e vale para os dois.`, "Após nove turnos, não há mais pistas. Cada palpite deve acertar uma palavra da equipe. Um erro encerra o jogo."],
    },
  },
  Japanese: {
    'lost-instructions': {
      goal: "ヒントどおりに3つのピースを並べ、3問すべてを協力して解きましょう。",
      host: ["指示役","学習中の言語で表示される自分だけのヒントを読むか、読み上げを聞きましょう。","左・中央・右に置くピースの色と形を、音声かチャットで伝えましょう。","同じ色や形があるので、一か所ずつ色と形を両方伝えてください。"],
      guest: ["操作役","各位置に置く色と形を相手に聞いてください。","ドラッグするか、2つのピースを順に選ぶと入れ替えられます。","並べ終えたら確認しましょう。間違っていてもやり直せます。"],
      rules: ({ time, points }) => [`カウントダウン後の制限時間は合計${time}です。1問正解するごとに${points}点入ります。`, "色と形の組み合わせはすべて異なります。問題ごとにピースとヒントが変わります。"],
    },
    'icon-communication': {
      goal: "全10ラウンドで、協力してお題のアイコンを見つけましょう。",
      host: ["選ぶ役","9個のアイコンが見えます。どれがお題かは分かりません。","相手にお題が表示されたら、音声やチャットで説明を聞きましょう。","説明に合うアイコンを選んでください。正解すると1点入り、次へ進みます。"],
      guest: ["説明役","少し待つと、あなただけにお題が表示されます。","表示された練習言語で、見た目や使い道を説明しましょう。","相手が正解するまで説明し、間違ったときはより具体的に伝えましょう。"],
      rules: ({ time, later, penalty }) => [`アイコン表示後、最初は${time}、以降は各ラウンド${later}です。表示を待つ時間は含まれません。`, `間違えると残り時間が${penalty}秒減ります。時間がある限り再挑戦できます。`],
    },
    'map-navigator': {
      goal: "チェックポイント1、2の順に通って、星印のゴールへ向かいましょう。",
      host: ["ナビ役","ルート、チェックポイント、ゴールが見えるのはあなただけです。","練習する言語で、目印や行・列番号を使って一手ずつ案内しましょう。","相手の位置を確認し、道を間違えたらルートに戻るよう案内しましょう。"],
      guest: ["移動役","現在地と目印が見えます。進む向きはナビ役に聞きましょう。","スワイプ、矢印キー、方向ボタンで1マスずつ移動します。上が北です。","2つのチェックポイントを順に通り、カウンターを確認しましょう。"],
      rules: ({ time, points, penalty }) => [`カウントダウン後は${time}です。両方を通ってゴールすれば勝利です。`, `ルートを完走すると${points}点。道を間違える、戻る、地図の外へ進もうとするたびに${penalty}点減ります。`],
    },
    'tandem-drive': {
      goal: "協力して車を操縦し、時間と耐久度が尽きる前に4つのゲートを通過しましょう。",
      host: ["光学・ナビ","安全なレーンのコード（ALPHA、BRAVO、DELTA、OMEGA）を相手に伝えましょう。","見える障害物を伝え、相手からの注意も聞きましょう。","担当のペダルを長押しします。両方で直進、片方で旋回し、離すと止まります。"],
      guest: ["レーダー・リズム","拍の表示を見て、進むか待つかを相手に伝えましょう。","ゲートに近づき、緑の拍で開けて合図します。周期式ゲートは緑で自動的に開きます。","担当のペダルを押して、相手に見えない障害物を知らせましょう。"],
      rules: ({ time }) => ["スペースキー、運転エリア、ペダルを長押しします。ペダルにフォーカスしているときはEnterも使えます。チャット入力では作動しません。", `制限時間は${time}です。衝突で耐久度が下がり、ゲート通過で一部回復します。左右交代の後は新しい役割とペダルを確認してください。`],
    },
    'spot-difference': {
      goal: "2枚の絵の5つの物から、3つの違いを見つけましょう。",
      host: ["プレイヤー1","見えるのは1枚目だけです。相手の絵とは少し違います。","物とその位置を説明し、相手にも同じ場所を説明してもらいましょう。","違いが分かったらその物を選びます。結果は二人に表示されます。"],
      guest: ["プレイヤー2","見えるのは2枚目だけです。相手が説明する絵と比べましょう。","物の種類、色、細部を比べ、左上などの位置も伝えてください。","二人で確認した違いを選びます。同じ違いは一度だけ得点になります。"],
      rules: ({ time, points, penalty }) => [`制限時間は${time}です。正解は${points}点、間違いは${penalty}点減点です。iボタンで回答せずに単語を確認できます。`, "途中終了すると現在の結果が表示されます。リセットで正誤の記録は消えますが、時間は止まりません。"],
    },
    'codenames': {
      goal: "25枚のカードから紫のチームの言葉を9つ見つけ、黒い暗殺者カードは避けましょう。",
      host: ["ヒント役","チーム、中立、暗殺者の区別が見えるのはあなただけです。","学習中の言語で一語のヒントと枚数を入力します。盤面の言葉は使えません。","ヒントを出し、相手が回答を終えるか、パスするか、中立を選ぶまで待ちましょう。"],
      guest: ({ points, hint }) => ["回答役", "ヒントと数を確認し、関連するカードを一枚ずつ選びましょう。", `紫は${points}点、中立はターン終了、暗殺者はゲーム終了です。`, `得意な言語で意味を見ると${hint}点かかります。迷ったらパスできます。`],
      rules: ({ points, hint, penalty }) => [`時間制限なしで9ターンです。正解は${points}点、誤答は${penalty}点減点です。意味の表示は1枚につき一度だけ${hint}点かかり、二人で共有されます。`, "9ターン後は新しいヒントがありません。残りのチームの言葉だけを選び、一度でも間違えると終了です。"],
    },
  },
  Korean: {
    'lost-instructions': {
      goal: "힌트대로 조각 세 개를 놓아 퍼즐 세 개를 함께 푸세요.",
      host: ["설명 담당","나만 볼 수 있는 힌트를 연습 언어로 읽거나 음성으로 들어 보세요.","왼쪽, 가운데, 오른쪽에 놓을 색과 모양을 음성이나 채팅으로 알려 주세요.","색이나 모양이 반복될 수 있으니 위치마다 두 가지를 모두 알려 주세요."],
      guest: ["배치 담당","각 위치에 필요한 색과 모양을 물어보세요.","조각을 끌어다 놓거나 두 조각을 차례로 선택해서 바꾸세요.","배치가 끝나면 확인하세요. 틀리면 다시 시도할 수 있어요."],
      rules: ({ time, points }) => [`카운트다운 뒤 총 ${time}이 주어져요. 퍼즐 하나를 풀면 ${points}점을 얻어요.`, "한 판에는 같은 색과 모양의 조합이 없어요. 퍼즐마다 조각과 힌트가 바뀌어요."],
    },
    'icon-communication': {
      goal: "열 라운드 동안 수수께끼 아이콘을 함께 찾으세요.",
      host: ["선택 담당","아이콘 아홉 개가 보이지만 정답은 표시되지 않아요.","파트너가 보는 아이콘을 음성이나 채팅으로 설명할 때까지 기다리세요.","설명에 맞는 아이콘을 고르세요. 맞히면 1점을 얻고 다음 라운드가 시작돼요."],
      guest: ["설명 담당","잠시 후 나에게만 정답 아이콘이 보여요.","표시된 연습 언어로 생김새나 쓰임을 설명하세요.","파트너가 틀리면 시간을 보면서 더 구체적인 힌트를 주세요."],
      rules: ({ time, later, penalty }) => [`아이콘이 나타난 뒤 첫 라운드는 ${time}, 이후에는 라운드마다 ${later}이 주어져요. 대기 시간은 제외돼요.`, `틀리면 ${penalty}초가 줄어요. 시간이 남아 있으면 다시 시도할 수 있어요.`],
    },
    'map-navigator': {
      goal: "1번과 2번 체크포인트를 차례로 거쳐 별 표시 목적지에 도착하세요.",
      host: ["길 안내 담당","경로와 두 체크포인트, 목적지는 내 지도에만 보여요.","연습 언어로 한 번에 한 방향씩 알려 주세요. 지형지물이나 행·열 번호를 활용하세요.","파트너가 길을 벗어나면 경로와 다음 체크포인트로 돌아가도록 안내하세요."],
      guest: ["이동 담당","현재 위치와 지형지물이 보여요. 어느 쪽으로 갈지 물어보세요.","스와이프, 방향 키 또는 버튼으로 한 칸씩 움직이세요. 위쪽이 북쪽이에요.","두 체크포인트를 순서대로 방문하고 숫자가 올라가는지 확인하세요."],
      rules: ({ time, points, penalty }) => [`카운트다운 후 ${time} 안에 두 지점을 거쳐 도착하면 이겨요.`, `경로를 완주하면 ${points}점이에요. 잘못 돌거나 뒤로 가거나 지도 밖으로 나가려 하면 ${penalty}점씩 줄어요.`],
    },
    'tandem-drive': {
      goal: "함께 운전해 장애물을 피하고, 시간이나 내구도가 다하기 전에 문 네 개를 통과하세요.",
      host: ["광학 · 길 안내","안전한 차선 코드 ALPHA, BRAVO, DELTA, OMEGA 중 하나를 알려 주세요.","보이는 장애물을 설명하고 파트너의 경고도 들으세요.","담당 추진기를 누르세요. 둘 다 누르면 직진하고 하나만 누르면 회전해요. 떼면 멈춰요."],
      guest: ["레이더 · 박자","박자를 보고 출발할 때와 기다릴 때를 알려 주세요.","문 가까이에서 초록 박자에 잠금을 푸세요. 주기식 문은 초록 박자에 자동으로 열려요.","추진기를 조작하며 나만 볼 수 있는 장애물을 알려 주세요."],
      rules: ({ time }) => ["스페이스바나 주행 영역, 추진기 버튼을 길게 누르세요. 버튼에 포커스가 있으면 Enter도 쓸 수 있어요. 채팅 입력 중에는 작동하지 않아요.", `제한 시간은 ${time}이에요. 충돌하면 내구도가 줄고 문을 통과하면 일부 회복돼요. 자리가 바뀌면 새 역할과 추진기를 확인하세요.`],
    },
    'spot-difference': {
      goal: "두 그림의 물건 다섯 개에서 차이 세 가지를 찾으세요.",
      host: ["플레이어 1","첫 번째 그림만 볼 수 있어요. 파트너의 그림은 조금 달라요.","물건과 위치를 설명하고 파트너에게 같은 위치를 물어보세요.","둘 다 차이가 있다고 생각하면 물건을 선택하세요. 진행 상황은 공유돼요."],
      guest: ["플레이어 2","두 번째 그림만 볼 수 있어요. 파트너의 설명과 비교하세요.","종류, 색, 세부 특징을 비교하고 왼쪽 위처럼 위치를 말하세요.","차이를 확인한 물건을 선택하세요. 같은 차이로 두 번 점수를 얻을 수 없어요."],
      rules: ({ time, points, penalty }) => [`제한 시간은 ${time}이에요. 정답은 ${points}점, 오답은 ${penalty}점 차감이에요. i 버튼을 누르면 추측하지 않고 단어를 볼 수 있어요.`, "일찍 끝내면 현재 결과를 볼 수 있어요. 초기화하면 정답과 오답 기록이 지워지지만 시간은 계속 흘러요."],
    },
    'codenames': {
      goal: "카드 25장 중 보라색 팀 단어 아홉 개를 찾고 검은 암살자 카드를 피하세요.",
      host: ["힌트 담당","팀 카드, 중립 카드, 암살자 카드는 나만 구분할 수 있어요.","연습 언어로 한 단어 힌트와 관련 카드 수를 입력하세요. 보드의 단어는 쓸 수 없어요.","힌트를 주고 파트너가 추측을 마치거나, 넘기거나, 중립 카드를 고를 때까지 기다리세요."],
      guest: ({ points, hint }) => ["정답 추측 담당", "힌트와 숫자를 보고 관련 카드를 한 장씩 선택하세요.", `보라색은 ${points}점, 중립은 차례 종료, 암살자는 게임 종료예요.`, `유창하게 쓰는 언어로 뜻을 보면 ${hint}점이 들어요. 확신이 없으면 넘기세요.`],
      rules: ({ points, hint, penalty }) => [`시간 제한 없이 아홉 차례가 주어져요. 정답은 ${points}점, 오답은 ${penalty}점 차감이에요. 뜻은 카드마다 한 번 ${hint}점을 내면 둘 다 볼 수 있어요.`, "아홉 차례 뒤에는 새 힌트가 없어요. 남은 팀 단어만 골라야 하며 한 번이라도 틀리면 끝나요."],
    },
  },
  Chinese: {
    'lost-instructions': {
      goal: "按提示摆好三块拼片，一起解开三道题。",
      host: ["提示员","用练习语言阅读只有你能看到的提示，也可以听朗读。","通过语音或聊天说明左边、中间和右边各放什么颜色和形状。","一次说一个位置。颜色或形状可能重复，请把两项都说清楚。"],
      guest: ["摆放员","询问每个位置需要什么颜色和形状。","把一块拼片拖到另一块上，或依次点击两块来交换位置。","摆好后检查答案。答错可以继续尝试。"],
      rules: ({ time, points }) => [`倒计时结束后，总共有${time}。每解开一道题得${points}分。`, "每块拼片的颜色和形状组合都不同。每道题都会更换拼片和提示。"],
    },
    'icon-communication': {
      goal: "十轮游戏中，每轮都要一起找到神秘图标。",
      host: ["选择员","你能看到九个图标，但不知道哪一个是目标。","等搭档看到目标，然后听语音或读聊天里的描述。","选择搭档描述的图标。选对得一分，并进入下一轮。"],
      guest: ["描述员","短暂等待后，只有你会看到目标图标。","用显示的练习语言描述图标的样子或用途，可以说也可以打字。","搭档选错时，留意剩余时间，并给出更具体的提示。"],
      rules: ({ time, later, penalty }) => [`图标出现后，首轮有${time}，之后每轮有${later}。等待显示的时间不计入。`, `选错扣${penalty}秒。时间未到可以重试。`],
    },
    'map-navigator': {
      goal: "依次经过第1和第2个检查点，最后到达星标终点。",
      host: ["导航员","只有你的地图显示路线、两个检查点和终点。","用练习语言每次给一个方向，可借助地标或行列编号。","观察搭档的位置。走错时，指引对方回到路线，前往下一个检查点。"],
      guest: ["旅人","你能看到自己和地标，看不到路线和终点。向搭档询问方向。","滑动地图、按方向键或点方向按钮，每次走一格。上方是北。","按顺序经过两个检查点，留意计数是否更新。"],
      rules: ({ time, points, penalty }) => [`倒计时后限时${time}。经过两个检查点再到终点即可获胜。`, `完成路线得${points}分。走错、后退或尝试走出地图，每次扣${penalty}分。`],
    },
    'tandem-drive': {
      goal: "合作驾驶，避开障碍，在时间或车身耐久度耗尽前通过四道闸门。",
      host: ["光学 · 导航","把安全车道的代号告诉搭档：ALPHA、BRAVO、DELTA 或 OMEGA。","描述你看到的障碍，也听搭档的提醒。有些障碍只有一人能看到。","按住你的推进器。两边同时工作就直行，一边工作就转向。松开即停。"],
      guest: ["雷达 · 节拍","看节拍指示，告诉搭档何时走、何时等。","靠近闸门，在绿拍解锁并发信号。周期闸门在绿拍自动打开。","操控你的推进器，并提醒搭档那些只有你能看到的障碍。"],
      rules: ({ time }) => ["未聚焦按钮时可按住空格键，也可按住驾驶区或推进器按钮。推进器按钮聚焦时可按住 Enter。聊天输入不会误触推进器。", `限时${time}。碰撞会损坏车身，通过闸门会恢复部分耐久。换边后请确认新角色和推进器。`],
    },
    'spot-difference': {
      goal: "比较两幅图中的五个物品，找出三处不同。",
      host: ["玩家 1","你只能看到第一幅图。搭档看到的图略有不同。","说出物品及其位置，再问搭档同一位置有什么。","确认有差异后点选物品。两人都能看到进度。"],
      guest: ["玩家 2","你只能看到第二幅图。用搭档的描述来比较。","对比类型、颜色和细节。用“左上”等说法确认位置。","意见一致后点选物品。同一处差异只能得分一次。"],
      rules: ({ time, points, penalty }) => [`限时${time}。找对得${points}分，选错扣${penalty}分。点 i 图标可查看练习语言的词汇，不算作猜测。`, "提前结束会显示当前结果。重置会清空对错记录，计时继续。"],
    },
    'codenames': {
      goal: "从25张卡中找出九个紫色队伍词，避开黑色刺客卡。",
      host: ["提示者","只有你能分辨队伍卡、中立卡和刺客卡，请保密。","用练习语言输入一个提示词，并选择它关联的卡片数。不能用牌面上的词。","发出提示，等搭档猜完、跳过，或选到中立卡后再继续。"],
      guest: ({ points, hint }) => ["猜词者", "听或读提示和数字，每次选一张相关的卡。", `紫色卡得${points}分，中立卡结束本回合，刺客卡立即结束游戏。`, `用熟练语言查看词义需${hint}分。不确定时可以跳过剩余次数。`],
      rules: ({ points, hint, penalty }) => [`没有时间限制，共九回合。猜对得${points}分，猜错扣${penalty}分。每张卡首次查看词义扣${hint}分，两人共享。`, "九回合后不再提供提示。剩下每次都必须选中队伍词，猜错即结束。"],
    },
  },
  Russian: {
    'lost-instructions': {
      goal: "Разложите три детали по подсказке и вместе решите все три задачи.",
      host: ["Объясняющий","Прочитай свою подсказку на изучаемом языке или включи озвучку.","Скажи в голосовом или текстовом чате, какие цвет и форма нужны слева, в центре и справа.","Обсуждай по одной позиции. Цвета и формы могут повторяться, поэтому называй оба признака."],
      guest: ["Оператор","Спроси, какие цвет и форма нужны для каждой позиции.","Перетащи одну деталь на другую или выбери две детали по очереди, чтобы поменять их местами.","Проверь порядок. Если он неверный, можно попробовать ещё раз."],
      rules: ({ time, points }) => [`После отсчёта у вас ${time} на все задачи. Каждая решённая задача даёт ${points} очков.`, "Каждая пара формы и цвета уникальна. В новой задаче меняются детали и подсказка."],
    },
    'icon-communication': {
      goal: "Вместе найдите загадочный значок в каждом из десяти раундов.",
      host: ["Выбирающий","Ты видишь девять значков, но не знаешь, какой нужен.","Дождись, пока напарник увидит цель и опишет её голосом или в чате.","Выбери описанный значок. За верный ответ вы получаете очко и переходите к следующему раунду."],
      guest: ["Описывающий","После небольшой паузы только ты увидишь нужный значок.","Опиши его вид или назначение на указанном языке голосом или в чате.","Пока есть время, уточняй описание, особенно после неверного выбора."],
      rules: ({ time, later, penalty }) => [`После появления значка даётся ${time} в первом раунде и по ${later} в следующих. Пауза перед показом не учитывается.`, `За неверный выбор снимается ${penalty} сек. Пока не вышло время, можно пробовать снова.`],
    },
    'map-navigator': {
      goal: "Проведите путешественника через точки 1 и 2 по порядку, а затем к звезде.",
      host: ["Навигатор","Только на твоей карте видны маршрут, обе контрольные точки и цель.","Давай по одной команде на изучаемом языке. Используй ориентиры или номера строк и столбцов.","Следи за положением напарника и помоги ему вернуться на маршрут после ошибки."],
      guest: ["Путешественник","Ты видишь своё положение и ориентиры. Спрашивай у навигатора, куда идти.","Смахни по карте, нажми клавишу со стрелкой или кнопку направления. Север сверху.","Пройди обе точки по порядку. Счётчик покажет, что точка засчитана."],
      rules: ({ time, points, penalty }) => [`После отсчёта у вас ${time}. Для победы пройдите обе точки и доберитесь до цели.`, `За пройденный маршрут дают ${points} очков. Ошибка, шаг назад или попытка выйти за карту отнимает ${penalty} очков.`],
    },
    'tandem-drive': {
      goal: "Управляйте машиной вместе, объезжайте препятствия и пройдите четыре ворот, пока есть время и запас прочности.",
      host: ["Оптика · Навигация","Назови код безопасной полосы: ALPHA, BRAVO, DELTA или OMEGA.","Описывай видимые препятствия и слушай предупреждения напарника. Некоторые препятствия видит только один из вас.","Удерживай свой двигатель. Два двигателя ведут прямо, один поворачивает машину. Отпусти, чтобы остановить свою сторону."],
      guest: ["Радар · Ритм","Следи за тактом и говори, когда ехать, а когда ждать.","Подъедь к воротам, открой их на зелёном такте и дай сигнал. Циклические ворота открываются на зелёном сами.","Управляй своим двигателем и предупреждай о препятствиях, которые видишь только ты."],
      rules: ({ time }) => ["Удерживай пробел вне кнопок, область управления или кнопку двигателя. На кнопке двигателя можно удерживать Enter. Ввод в чате не включает двигатель.", `У вас ${time}. Столкновения повреждают машину, а проход через ворота частично её чинит. После смены сторон проверь новую роль и двигатель.`],
    },
    'spot-difference': {
      goal: "Найдите три отличия среди пяти предметов на двух картинках.",
      host: ["Игрок 1","Ты видишь только первую картинку. У напарника похожая, но с отличиями.","Опиши предмет и его место. Спроси, что у напарника на том же месте.","Если вы согласны, выберите предмет. Прогресс виден обоим."],
      guest: ["Игрок 2","Ты видишь только вторую картинку. Сравни её с описанием напарника.","Сверяй вид, цвет и детали предметов. Называй место, например «вверху слева».","Выбери предмет, когда вы оба заметили отличие. Каждое отличие засчитывается один раз."],
      rules: ({ time, points, penalty }) => [`У вас ${time}. За верный выбор дают ${points} очков, за ошибку снимают ${penalty}. Кнопка i показывает слово без попытки ответа.`, "При досрочном выходе виден текущий результат. Сброс очищает ответы, но таймер продолжает идти."],
    },
    'codenames': {
      goal: "Найдите девять фиолетовых слов среди 25 карточек и не выбирайте чёрную карточку убийцы.",
      host: ["Даёт подсказки","Только ты видишь карточки команды, нейтральные карточки и убийцу. Не раскрывай их.","Введи одно слово на изучаемом языке и число карточек, к которым оно относится. Слова с поля использовать нельзя.","Дай подсказку и жди, пока напарник закончит, пропустит ход или выберет нейтральную карточку."],
      guest: ({ points, hint }) => ["Угадывает", "Прочитай или послушай подсказку и число. Угадывай связанные слова по одному.", `Фиолетовая карточка даёт ${points} очков, нейтральная завершает ход, а убийца завершает игру.`, `Определение на языке, которым ты свободно владеешь, стоит ${hint} очков. Если сомневаешься, пропусти ход.`],
      rules: ({ points, hint, penalty }) => [`Ограничения по времени нет. У вас девять ходов. Верный ответ даёт ${points} очков, ошибка отнимает ${penalty}. За определение платят ${hint} очков один раз на карточку, и его видят оба.`, "После девяти ходов новых подсказок нет. Выбирайте только оставшиеся слова команды. Любая ошибка завершит игру."],
    },
  },
} satisfies Record<Exclude<Language, 'English'>, Record<GuideId, Guide>>
