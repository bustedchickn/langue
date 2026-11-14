import type { Seat } from '../../shared/minigames/contracts'
import { iconCommunicationConfig } from '../../shared/minigames/icon-communication'
import './instructions.css'

type RoleGuide = { id: string; name: string; steps: readonly string[] }
type GameGuide = { goal: string; roles: Record<Seat, RoleGuide>; rules: readonly string[] }

const guides: Record<string, GameGuide> = {
  'lost-instructions': {
    goal: 'Arrange three pieces in the order described by your partner. Solve all three puzzles together.',
    roles: {
      host: { id: 'instructor', name: 'Instructor', steps: [
        'Only you see the correct order. Read the private clue in your learning language, or use its pronunciation button to hear it.',
        'Tell your partner which color AND shape belongs on the left, in the middle, and on the right. Use voice or text chat.',
        'Clarify one position at a time. The same shape or color can appear more than once, so always name both.',
      ] },
      guest: { id: 'operator', name: 'Operator', steps: [
        'Only you see and move the pieces. Ask your partner for the color and shape needed in each position.',
        'Drag one piece onto another to swap them. You can also click or tap one piece and then the piece you want to swap with it.',
        'When all three positions match the clue, select Check arrangement. A correct answer starts the next puzzle; a mistake lets you keep trying.',
      ] },
    },
    rules: ['You have 90 seconds total for all three puzzles, after the starting countdown. Each solved puzzle earns 100 points.',
      'Every piece on a board has a different shape-and-color pair. New pieces and a new clue are generated for each puzzle.'],
  },
  'icon-communication': {
    goal: 'Identify the mystery icon together in each of ten rounds.',
    roles: {
      host: { id: 'selector', name: 'Selector', steps: [
        'You see a grid of nine icons, but you do not know which icon is the target.',
        'Wait for your partner’s icon to appear, then listen to their description or read it in chat.',
        'Click or tap the icon they describe. A correct choice earns one point and starts a fresh grid.',
      ] },
      guest: { id: 'describer', name: 'Describer', steps: [
        'After a short wait, only you see the mystery icon. Your partner sees nine possible icons.',
        'Describe the object, what it looks like, or what it is used for in the displayed practice language. Use voice or chat.',
        'Keep explaining until your partner chooses correctly. Watch the timer and give a more specific clue if they choose the wrong icon.',
      ] },
    },
    rules: [`Round 1 gives you ${iconCommunicationConfig.firstRoundDurationMs / 1000} seconds after the icon appears. Every later round gives you ${iconCommunicationConfig.roundDurationMs / 1000} seconds. The short wait before each reveal does not use that round’s time.`,
      'Each wrong choice removes 2 seconds from the current round. You can try again, but the game ends if the timer reaches zero. Complete ten rounds to win.'],
  },
  'map-navigator': {
    goal: 'Guide the traveler through checkpoint 1, then checkpoint 2, and finally to the destination star.',
    roles: {
      host: { id: 'navigator', name: 'Navigator', steps: [
        'Only your map shows the outlined route, the two numbered checkpoints, and the destination star.',
        'Give one direction at a time in your learning language. Use landmarks and row or column numbers to describe where to go.',
        'Follow the traveler’s position on your map. If they take a wrong turn, guide them back toward the route and the next checkpoint.',
      ] },
      guest: { id: 'traveler', name: 'Traveler', steps: [
        'You see your position and landmarks, but the route and destination are hidden. Ask your navigator which way to move.',
        'Swipe across the map to move one tile, use the arrow keys, or select a direction button. North is up, South is down, West is left, and East is right.',
        'Visit both checkpoints in order before reaching the destination. The checkpoint counter confirms each one; ask for help if a move is marked as a wrong turn.',
      ] },
    },
    rules: ['You have 2 minutes after the countdown. Reaching the destination after both checkpoints wins the game.',
      'A completed route starts at 100 points. Each wrong turn, backward step, or attempt to move off the map removes 5 points.'],
  },
  'tandem-drive': {
    goal: 'Steer one vehicle together, avoid barriers, and clear four gates before time or hull integrity runs out.',
    roles: {
      host: { id: 'navigation', name: 'Optic · Navigation', steps: [
        'Your display identifies the safe lane at lane gates. Tell your partner its name: ALPHA, BRAVO, DELTA, or OMEGA.',
        'Describe the obstacles you can see. Some obstacles are visible only to your partner, so listen to their warnings too.',
        'Hold your thruster button to drive your side of the vehicle. Both thrusters together move straight; one thruster pivots the vehicle. Release to stop your side.',
      ] },
      guest: { id: 'cadence', name: 'Radar · Cadence', steps: [
        'Your display shows the beat timing. Tell your partner when the beat indicator says GO and when it says WAIT.',
        'At a locked lane gate, get close, select Release gate on a green beat, and tell your partner to go. A cycling shutter opens automatically on green beats.',
        'Hold your thruster to move your side of the vehicle. Work with your partner to steer and share any obstacles only you can see.',
      ] },
    },
    rules: ['Hold a thruster with a mouse or touch, or focus its button and hold Space or Enter. Releasing the button releases that thruster.',
      'You have 2 minutes 30 seconds. Collisions damage the hull; clearing a gate repairs some damage. If a side switch occurs, read your new role and thruster label before continuing.'],
  },
  'spot-difference': {
    goal: 'Find all three differences among the five objects in your two scenes.',
    roles: {
      host: { id: 'player-one', name: 'Player 1', steps: [
        'You see only Player 1’s scene. Your partner sees a similar scene with some different objects, colors, or details.',
        'Describe an object and where it is in your picture, then ask your partner to describe the same position in theirs.',
        'When you agree that an object is different, click or tap it. Either player can mark a difference, and both players see the shared progress.',
      ] },
      guest: { id: 'player-two', name: 'Player 2', steps: [
        'You see only Player 2’s scene. Compare it with your partner’s spoken or written description of Player 1’s scene.',
        'Check each object’s type, color, and details. Describe positions such as top left or bottom right so you discuss the same object.',
        'Click or tap an object when you agree it is different. Found differences are marked for both players and cannot score twice.',
      ] },
    },
    rules: ['Find all three differences within 2 minutes. Each correct find earns 20 points; each incorrect choice removes 2 points.',
      'Finish Round ends the round immediately, even if differences remain. Reset finds clears the shared finds and mistakes while the current timer keeps running.'],
  },
  codenames: {
    goal: 'Find all nine purple team words on a board of 25 cards while avoiding the black assassin card.',
    roles: {
      host: { id: 'clue-giver', name: 'Clue giver', steps: [
        'Only you can see which cards are purple team words, neutral words, or the black assassin. Keep that information private.',
        'Enter one clue word in your learning language and choose how many team words it connects. Your clue cannot be a word already on the board.',
        'Select Give clue. Wait while your partner uses the allowed guesses, passes, or selects a neutral card; then give the next clue.',
      ] },
      guest: { id: 'guesser', name: 'Guesser', steps: [
        'Read or listen to the one-word clue and its number. Choose that many related words, one card at a time.',
        'A purple team card scores one point. A neutral card ends the turn. The black assassin ends the game immediately.',
        'Use the i button for a definition in your fluent language. If unsure, select Pass remaining guesses to end the current turn.',
      ] },
    },
    rules: ['There is no time limit. You have nine clue turns to find all nine team words.',
      'After nine turns, sudden death begins: no new clues are given, and every remaining guess must be a team word. Any wrong choice ends the game.'],
  },
}

export function GameInstructions({ gameId, seat, role, compact = false }: {
  gameId: string; seat: Seat; role?: string; compact?: boolean
}) {
  const guide = guides[gameId]
  if (!guide) return null
  const assigned = Object.values(guide.roles).find(value => value.id === role) ?? guide.roles[seat]
  return <details className="game-instructions" open={!compact}>
    <summary>How to play</summary>
    <div className="game-instructions-content">
      <p><strong>Goal:</strong> {guide.goal}</p>
      <p className="game-instructions-role">Your role: <strong>{assigned.name}</strong></p>
      <ol>{assigned.steps.map(step => <li key={step}>{step}</li>)}</ol>
      <p className="game-instructions-rules-title"><strong>Timing and rules</strong></p>
      <ul>{guide.rules.map(rule => <li key={rule}>{rule}</li>)}</ul>
      <p className="muted">Use room voice or text chat to work together. Both players must be ready before play starts.</p>
    </div>
  </details>
}
