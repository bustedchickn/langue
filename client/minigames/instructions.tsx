import type { Seat } from '../../shared/minigames/contracts'
import { iconCommunicationConfig } from '../../shared/minigames/icon-communication'
import { codenamesConfig } from '../../shared/minigames/codenames'
import './instructions.css'
import { InstructionIllustration } from './InstructionIllustration'
import { durationLabel, practiceDuration } from '../../shared/minigames/timing'
import { lostInstructions } from '../../shared/minigames/lost-instructions'
import { mapNavigatorConfig } from '../../shared/minigames/map-navigator'
import { spotDifferenceConfig } from '../../shared/minigames/spot-difference'
import { tandemDrive } from '../../shared/minigames/tandem-drive'
import { languageTags, type Language } from '../../shared/types'
import { germanGuides } from '../locales/game-guides-de'
import { localizedGuides } from '../locales/game-guides'
import { useInterface } from '../locales/interface'

type RoleGuide = { id: string; name: string; steps: readonly string[] }
type GameGuide = { goal: string; roles: Record<Seat, RoleGuide>; rules: readonly string[] | ((multiplier: number) => readonly string[]) }

const guides = {
  'lost-instructions': {
    goal: 'Arrange three pieces to match your partner’s clue. Solve three puzzles.',
    roles: {
      host: { id: 'instructor', name: 'Instructor', steps: [
        'Read or play the private clue.',
        'Tell your partner each piece’s color, shape, and position.',
        'Clarify one position at a time; colors and shapes can repeat.',
      ] },
      guest: { id: 'operator', name: 'Operator', steps: [
        'Ask which color and shape belongs in each position.',
        'Drag or tap two pieces to swap them.',
        'Select Check arrangement when the order matches the clue.',
      ] },
    },
    rules: scale => [`You have ${durationLabel(practiceDuration(90000, scale))} for three puzzles. Each solved puzzle earns 100 points.`,
      'Each puzzle has new pieces and a new clue.'],
  },
  'icon-communication': {
    goal: 'Identify the mystery icon together in each of ten rounds.',
    roles: {
      host: { id: 'selector', name: 'Selector', steps: [
        'You see nine icons; your partner sees the target.',
        'Listen to their description.',
        'Choose the matching icon to start the next round.',
      ] },
      guest: { id: 'describer', name: 'Describer', steps: [
        'After a short wait, only you see the mystery icon.',
        'Describe its shape or use in the practice language.',
        'Give more detail if your partner chooses the wrong icon.',
      ] },
    },
    rules: scale => [`Round 1 lasts ${durationLabel(practiceDuration(iconCommunicationConfig.firstRoundDurationMs, scale))}; later rounds last ${durationLabel(practiceDuration(iconCommunicationConfig.roundDurationMs, scale))}.`,
      'Wrong choices cost 2 seconds. Complete ten rounds to win.'],
  },
  'map-navigator': {
    goal: 'Guide the traveler through checkpoint 1, then checkpoint 2, and finally to the destination star.',
    roles: {
      host: { id: 'navigator', name: 'Navigator', steps: [
        'Only you see the route, checkpoints, and destination.',
        'Give one direction at a time using landmarks or grid positions.',
        'Guide the traveler back if they take a wrong turn.',
      ] },
      guest: { id: 'traveler', name: 'Traveler', steps: [
        'You see your position, but the route is hidden.',
        'Swipe, use arrow keys, or tap a direction to move one tile.',
        'Visit checkpoints 1 and 2 before the destination.',
      ] },
    },
    rules: scale => [`You have ${durationLabel(practiceDuration(120000, scale))} to finish the route.`,
      'A completed route starts at 100 points. Wrong turns cost 5 points.'],
  },
  'tandem-drive': {
    goal: 'Steer one vehicle together, avoid barriers, and clear four gates before time or hull integrity runs out.',
    roles: {
      host: { id: 'navigation', name: 'Optic · Navigation', steps: [
        'Find the green barrier and tell your partner its word in your learning language.',
        'Call out obstacles you see.',
        'Hold your thruster to steer; release to stop your side.',
      ] },
      guest: { id: 'cadence', name: 'Radar · Cadence', steps: [
        'Follow the word your partner names; your barriers do not show the safe lane.',
        'Tell your partner when the beat says GO or WAIT.',
        'Release locked gates on a green beat; shutters open on green.',
        'Hold your thruster to steer and call out obstacles.',
      ] },
    },
    rules: scale => ['Hold Space, the driving area, or your thruster to drive. Release to stop.',
      `You have ${durationLabel(practiceDuration(150000, scale))} to clear four gates. Collisions damage the hull; gates repair it.`],
  },
  'spot-difference': {
    goal: 'Find all three differences among the five objects in your two scenes.',
    roles: {
      host: { id: 'player-one', name: 'Player 1', steps: [
        'Only you see your scene; your partner sees a different version.',
        'Describe each object and its position.',
        'Tap an agreed difference. Either player can mark it.',
      ] },
      guest: { id: 'player-two', name: 'Player 2', steps: [
        'Only you see your scene; compare it with your partner’s description.',
        'Check each object’s type, color, and position.',
        'Tap an agreed difference. Shared finds score once.',
      ] },
    },
    rules: scale => [`Find three differences within ${durationLabel(practiceDuration(120000, scale))}. Correct finds earn 20 points; mistakes cost 2.`,
      'Use i for an object’s word. Reset finds clears progress but keeps the timer running.'],
  },
  codenames: {
    goal: 'Find all nine purple team words on a 5 × 5 board while avoiding the black assassin card.',
    roles: {
      host: { id: 'clue-giver', name: 'Clue giver', steps: [
        'Only you see which cards are team words or the assassin.',
        'Type one clue word in the clue box, enter how many team words it connects in Number of words, then press Give clue to send both to your partner.',
        'Wait for your partner to guess or pass before the next clue.',
      ] },
      guest: { id: 'guesser', name: 'Guesser', steps: [
        'Use the clue to select a square. Its pop-out lets you request a definition for 10 points or confirm your guess.',
        'Confirm in the square’s pop-out to guess; close it to keep looking. You get the clue number plus one extra guess.',
        'Find purple team cards. Avoid the black assassin; pass if unsure.',
      ] },
    },
    rules: [`No time limit. Nine clue turns to find nine team words. Correct guesses earn ${codenamesConfig.scoring.pointsPerWord}; wrong guesses cost ${codenamesConfig.scoring.incorrectPenalty}.`,
      'Each clue allows the stated number of guesses plus one bonus guess. Pass turn to skip it. After nine turns, any wrong guess ends the game.'],
  },
} satisfies Record<keyof typeof germanGuides, GameGuide>

const guideValues = {
  'lost-instructions': { time: lostInstructions.durationMs, points: lostInstructions.scoring.pointsPerPuzzle },
  'icon-communication': {
    time: iconCommunicationConfig.firstRoundDurationMs, later: iconCommunicationConfig.roundDurationMs,
    penalty: iconCommunicationConfig.incorrectGuessPenaltyMs / 1000,
  },
  'map-navigator': { time: mapNavigatorConfig.durationMs, points: mapNavigatorConfig.scoring.pointsPerRoute, penalty: mapNavigatorConfig.scoring.wrongTurnPenalty },
  'tandem-drive': { time: tandemDrive.durationMs },
  'spot-difference': { time: spotDifferenceConfig.durationMs, points: spotDifferenceConfig.scoring.pointsPerDifference, penalty: spotDifferenceConfig.scoring.wrongGuessPenalty },
  codenames: { points: codenamesConfig.scoring.pointsPerWord, penalty: codenamesConfig.scoring.incorrectPenalty, hint: codenamesConfig.scoring.hintPenalty },
} satisfies Record<keyof typeof guides, { time?: number; later?: number; points?: number; penalty?: number; hint?: number }>

function localizedDuration(ms: number, scale: number, locale: string) {
  const seconds = Math.ceil(practiceDuration(ms, scale) / 1000)
  const format = (value: number, unit: 'minute' | 'second') =>
    new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'short' }).format(value)
  if (seconds < 60) return format(seconds, 'second')
  const minutes = format(Math.floor(seconds / 60), 'minute')
  return seconds % 60 ? minutes + ' ' + format(seconds % 60, 'second') : minutes
}

export function getGameGuide(gameId: string, language: Language, scale: number): GameGuide | undefined {
  if (!Object.hasOwn(guides, gameId)) return
  const id = gameId as keyof typeof guides
  const english = guides[id]
  if (language === 'English') return english
  const translated = localizedGuides[language][id]
  const [host, ...hostSteps] = translated.host
  const values: { time?: number; later?: number; points?: number; penalty?: number; hint?: number } = guideValues[id]
  const locale = languageTags[language]
  const ruleValues = {
    time: values.time === undefined ? '' : localizedDuration(values.time, scale, locale),
    later: values.later === undefined ? '' : localizedDuration(values.later, scale, locale),
    points: values.points ?? 0,
    penalty: values.penalty ?? 0,
    hint: values.hint ?? 0,
  }
  const [guest, ...guestSteps] = typeof translated.guest === 'function' ? translated.guest(ruleValues) : translated.guest
  return {
    goal: translated.goal,
    roles: {
      host: { id: english.roles.host.id, name: host, steps: hostSteps },
      guest: { id: english.roles.guest.id, name: guest, steps: guestSteps },
    },
    rules: translated.rules(ruleValues),
  }
}

const englishGuideLabels = {
  help: 'How to play', goal: 'Goal:', role: 'Your role:', rules: 'Timing and rules',
  extra: (n: number) => `Your team gets ${n}% extra practice time. When levels differ, both players share the longer allowance.`,
  ready: 'Use room voice or text chat to work together. Both players must be ready before play starts.',
}

const guideLabels: Partial<Record<Language, typeof englishGuideLabels>> = {
  German: {
    help: 'So wird gespielt', goal: 'Ziel:', role: 'Deine Rolle:', rules: 'Zeit und Regeln',
    extra: n => `Ihr habt ${n} % mehr Übungszeit. Bei unterschiedlichen Sprachniveaus gilt für beide die längere Zeit.`,
    ready: 'Sprecht euch im Sprach- oder Textchat ab. Das Spiel beginnt, sobald ihr beide bereit seid.',
  },
  French: {
    help: 'Comment jouer', goal: 'Objectif :', role: 'Votre rôle :', rules: 'Temps et règles',
    extra: n => `Votre équipe bénéficie de ${n} % de temps supplémentaire. Si vos niveaux diffèrent, vous partagez le temps le plus long.`,
    ready: 'Communiquez par écrit ou à l’oral. La partie commence lorsque vous êtes tous les deux prêts.',
  },
  Spanish: {
    help: 'Cómo jugar', goal: 'Objetivo:', role: 'Tu papel:', rules: 'Tiempo y reglas',
    extra: n => `El equipo tiene un ${n} % más de tiempo. Si los niveles son distintos, ambos disponen del plazo más largo.`,
    ready: 'Colaboren por voz o por chat. La partida empieza cuando ambos estén listos.',
  },
  Italian: {
    help: 'Come si gioca', goal: 'Obiettivo:', role: 'Il tuo ruolo:', rules: 'Tempi e regole',
    extra: n => `Avete il ${n}% di tempo in più. Se i livelli sono diversi, entrambi avete a disposizione il tempo maggiore.`,
    ready: 'Collaborate a voce o in chat. La partita comincia quando entrambi sono pronti.',
  },
  Portuguese: {
    help: 'Como jogar', goal: 'Objetivo:', role: 'Sua função:', rules: 'Tempo e regras',
    extra: n => `Sua dupla tem ${n}% a mais de tempo. Se os níveis forem diferentes, vale o prazo mais longo para os dois.`,
    ready: 'Colaborem por voz ou pelo chat de texto. A partida começa quando os dois estiverem prontos.',
  },
  Japanese: {
    help: '遊び方', goal: '目標：', role: 'あなたの役割：', rules: '制限時間とルール',
    extra: n => `練習時間が${n}%増えます。レベルが違う場合、二人とも長い方の制限時間で遊びます。`,
    ready: '音声やチャットで協力しましょう。二人の準備ができたらゲームが始まります。',
  },
  Korean: {
    help: '게임 방법', goal: '목표:', role: '내 역할:', rules: '시간과 규칙',
    extra: n => `팀의 연습 시간이 ${n}% 늘어나요. 수준이 다르면 두 사람 모두 더 긴 시간을 이용해요.`,
    ready: '음성이나 채팅으로 협력하세요. 두 사람이 모두 준비되면 게임이 시작돼요.',
  },
  Chinese: {
    help: '玩法说明', goal: '目标：', role: '你的角色：', rules: '时间与规则',
    extra: n => `队伍多出 ${n}% 的练习时间。水平不同时，两人都按较长的时间计算。`,
    ready: '通过语音或文字聊天合作。两人都准备好后，游戏才会开始。',
  },
  Russian: {
    help: 'Как играть', goal: 'Цель:', role: 'Твоя роль:', rules: 'Время и правила',
    extra: n => `У вашей команды на ${n}% больше времени. При разных уровнях оба игрока получают большее из двух времён.`,
    ready: 'Общайтесь голосом или в текстовом чате. Игра начнётся, когда вы оба будете готовы.',
  },
}

export function GameInstructions({ gameId, seat, role, compact = false, timeMultiplier = 1 }: {
  gameId: string; seat: Seat; role?: string; compact?: boolean; timeMultiplier?: number
}) {
  const { language } = useInterface()
  const guide = getGameGuide(gameId, language, timeMultiplier)
  if (!guide) return null
  const labels = guideLabels[language] ?? englishGuideLabels
  const assigned = Object.values(guide.roles).find(value => value.id === role) ?? guide.roles[seat]
  const rules = typeof guide.rules === 'function' ? guide.rules(timeMultiplier) : guide.rules
  return <details className="game-instructions" open={!compact}>
    <summary>{labels.help}</summary>
    <div className="game-instructions-content">
      <InstructionIllustration gameId={gameId} />
      <p><strong>{labels.goal}</strong> {guide.goal}</p>
      <p className="game-instructions-role">{labels.role} <strong>{assigned.name}</strong></p>
      <ol>{assigned.steps.map(step => <li key={step}>{step}</li>)}</ol>
      <p className="game-instructions-rules-title"><strong>{labels.rules}</strong></p>
      <ul>{rules.map(rule => <li key={rule}>{rule}</li>)}</ul>
      {gameId !== 'codenames' && timeMultiplier > 1 && <p className="practice-time">{labels.extra(Math.round((timeMultiplier - 1) * 100))}</p>}
      <p className="muted">{labels.ready}</p>
    </div>
  </details>
}
