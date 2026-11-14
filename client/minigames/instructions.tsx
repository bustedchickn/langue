import type { Seat } from '../../shared/minigames/contracts'
import { iconCommunicationConfig } from '../../shared/minigames/icon-communication'
import { codenamesConfig } from '../../shared/minigames/codenames'
import './instructions.css'
import { InstructionIllustration } from './InstructionIllustration'
import { durationLabel, practiceDuration } from '../../shared/minigames/timing'

type RoleGuide = { id: string; name: string; steps: readonly string[] }
type GameGuide = { goal: string; roles: Record<Seat, RoleGuide>; rules: readonly string[] | ((multiplier: number) => readonly string[]) }

const guides: Record<string, GameGuide> = {
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
    goal: 'Find all six purple team words on a 4 × 4 board while avoiding the black assassin card.',
    roles: {
      host: { id: 'clue-giver', name: 'Clue giver', steps: [
        'Only you see which cards are team words or the assassin.',
        'Give one clue word and the number of team words it connects.',
        'Wait for your partner to guess or pass before the next clue.',
      ] },
      guest: { id: 'guesser', name: 'Guesser', steps: [
        'Use the clue to select a square and read its description.',
        'Confirm to guess; close it to keep looking.',
        'Find purple team cards. Avoid the black assassin; pass if unsure.',
      ] },
    },
    rules: [`No time limit. Six clue turns to find six team words. Correct guesses earn ${codenamesConfig.scoring.pointsPerWord}; wrong guesses cost ${codenamesConfig.scoring.incorrectPenalty}.`,
      'After six turns, any wrong guess ends the game.'],
  },
}

export function GameInstructions({ gameId, seat, role, compact = false, timeMultiplier = 1 }: {
  gameId: string; seat: Seat; role?: string; compact?: boolean; timeMultiplier?: number
}) {
  const guide = guides[gameId]
  if (!guide) return null
  const assigned = Object.values(guide.roles).find(value => value.id === role) ?? guide.roles[seat]
  const rules = typeof guide.rules === 'function' ? guide.rules(timeMultiplier) : guide.rules
  return <details className="game-instructions" open={!compact}>
    <summary>How to play</summary>
    <div className="game-instructions-content">
      <InstructionIllustration gameId={gameId} />
      <p><strong>Goal:</strong> {guide.goal}</p>
      <p className="game-instructions-role">Your role: <strong>{assigned.name}</strong></p>
      <ol>{assigned.steps.map(step => <li key={step}>{step}</li>)}</ol>
      <p className="game-instructions-rules-title"><strong>Timing and rules</strong></p>
      <ul>{rules.map(rule => <li key={rule}>{rule}</li>)}</ul>
      {gameId !== 'codenames' && timeMultiplier > 1 && <p className="practice-time">Your team gets {Math.round((timeMultiplier - 1) * 100)}% extra practice time. When levels differ, both players share the longer allowance.</p>}
      <p className="muted">Use voice or chat to work together.</p>
    </div>
  </details>
}
