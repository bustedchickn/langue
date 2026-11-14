import type { ReactNode } from 'react'
import './instruction-illustration.css'
import { DriveInstructionPicture } from './DriveInstructionPicture'

const ink = '#51445f'
const purple = '#b7a0e7'
const blue = '#89d9dc'
const pink = '#f28dad'
const paper = '#fffdf8'

function Person({ x = 0, y = 0, color = purple }: { x?: number; y?: number; color?: string }) {
  return <g transform={`translate(${x} ${y})`} stroke={ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 66Q12 43 31 43Q50 43 51 66Z" fill={color} />
    <circle cx="31" cy="26" r="18" fill="#ffdcc8" />
    <path d="M14 24Q10 3 32 5Q51 6 49 23L39 14Q27 24 14 24" fill={ink} />
    <path d="M23 29h1m14 0h1m-13 7q6 5 11-1M12 51L1 42m49 9 12-13" fill="none" />
  </g>
}

function Bubble({ children }: { children: ReactNode }) {
  return <g><path d="M77 18h111q8 0 8 8v47q0 8-8 8h-75L96 94l1-13H77q-8 0-8-8V26q0-8 8-8Z" fill={paper} stroke={ink} strokeWidth="2" />{children}</g>
}

function Shapes({ x = 20, y = 50, ordered = true }: { x?: number; y?: number; ordered?: boolean }) {
  return <g transform={`translate(${x} ${y})`} stroke={ink} strokeWidth="2" strokeLinejoin="round">
    <path d="M0 0h160v50H0Z" fill={paper} />
    {[0, 1, 2].map(i => <rect x={5 + i * 51} y="5" width="47" height="40" rx="6" fill="#f6eefb" stroke="#ded0ee" key={i} />)}
    <circle cx={ordered ? 29 : 80} cy="25" r="13" fill={pink} />
    <rect x={ordered ? 67 : 118} y="12" width="26" height="26" rx="2" fill={blue} />
    <path d={ordered ? 'M131 10l15 29h-30Z' : 'M29 10l15 29H14Z'} fill="#f8d76c" />
  </g>
}

function Check({ x = 150, y = 83, size = 26 }: { x?: number; y?: number; size?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${size / 26})`}><circle r="24" fill="#d6f3df" stroke="#559c72" strokeWidth="2.5" /><path d="m-12 0 8 9L13-10" fill="none" stroke="#377350" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></g>
}

function Hand({ x = 135, y = 74 }: { x?: number; y?: number }) {
  return <g className="instruction-tap-hand" transform={`translate(${x} ${y}) scale(.7)`} stroke={ink} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="14" cy="-22" r="13" fill="#f2a6bc" opacity=".3" stroke="none" />
    <path d="M-2-10a21 21 0 1 1 32 0M-9-5a30 30 0 1 1 46 0" stroke="#a08abb" strokeWidth="3" fill="none" />
    <rect x="9" y="61" width="40" height="16" rx="5" fill="#9daeea" />
    <path d="M6 32V-16C6-27 22-27 22-16V7C22-3 35-3 35 9v9c0-10 13-9 13 2v8c0-10 12-9 12 3v10c0 12-8 26-17 29H18C9 70 3 65 1 57L-17 29c-7-12 6-17 13-7Z" fill="#ffdcc8" />
    <path d="M22 8v18m13-8v14m13-4v13" fill="none" />
    <path d="M43 64q10-11 12-23" fill="none" stroke="#efb9a2" strokeWidth="4" />
  </g>
}

function MapPicture() {
  return <g stroke={ink} strokeWidth="2"><rect x="25" y="17" width="150" height="105" rx="9" fill={paper} />
    {Array.from({ length: 15 }, (_, i) => <rect key={i} x={33 + i % 5 * 27} y={25 + Math.floor(i / 5) * 29} width="24" height="25" rx="4" fill="#fff1d3" stroke="#d8c9ad" />)}
    <path d="M45 96V67h54V38h54" stroke={purple} strokeWidth="7" fill="none" strokeLinejoin="round" />
    <circle cx="45" cy="96" r="8" fill={blue} /><path d="m153 25 4 9 10 1-8 7 2 10-8-5-9 5 2-10-7-7 10-1Z" fill="#f6cf65" />
  </g>
}

function Car({ x = 63, y = 18 }: { x?: number; y?: number }) {
  return <g transform={`translate(${x} ${y})`} stroke={ink} strokeWidth="2.5" strokeLinejoin="round"><rect x="-10" y="15" width="15" height="22" rx="4" fill={ink} /><rect x="65" y="15" width="15" height="22" rx="4" fill={ink} /><rect x="0" y="0" width="70" height="69" rx="18" fill={purple} /><rect x="10" y="10" width="50" height="23" rx="7" fill={paper} /><path d="m9 68 5 16 10-16m25 0 5 16 10-16" fill="#f6cf65" /></g>
}

function Cards({ revealed = false }: { revealed?: boolean }) {
  return <g stroke={ink} strokeWidth="2">{Array.from({ length: 9 }, (_, i) => <g key={i}><rect x={28 + i % 3 * 50} y={18 + Math.floor(i / 3) * 33} width="44" height="28" rx="5" fill={i === 8 ? ink : i % 3 === 1 || revealed ? purple : '#fff0c6'} />{revealed && i !== 8 && <path d={`m${39 + i % 3 * 50} ${31 + Math.floor(i / 3) * 33} 5 5 11-12`} stroke="white" strokeWidth="3" fill="none" />}</g>)}</g>
}

function IconCards() {
  return <g>{['apple', 'bell', 'book', 'cat', 'cloud', 'fish', 'house', 'sun', 'key'].map((icon, index) => <g key={icon}>
    <rect x={28 + index % 3 * 50} y={17 + Math.floor(index / 3) * 36} width="43" height="31" rx="6" fill={paper} stroke={ink} strokeWidth="2" />
    <image href={'/icons/' + icon + '.svg'} x={39 + index % 3 * 50} y={21 + Math.floor(index / 3) * 36} width="22" height="23" />
  </g>)}</g>
}

function Plant({ x = 0, cactus = false }: { x?: number; cactus?: boolean }) {
  return <g transform={`translate(${x} 0)`} stroke={ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M40 84h34l-5 25H45Z" fill="#f5bd9b" />
    {cactus ? <path d="M56 83V40q0-10 8-10t8 10v18h8V47q0-7 6-7t6 7v19q0 9-20 9v8m-16-16H44q-10 0-10-10V47" fill="#83bd96" />
      : <g fill="#83bd96"><path d="M57 84V47m0 14Q27 57 36 35q24 0 21 26m1 8Q91 67 82 43q-23 2-24 26" /></g>}
  </g>
}

function Graphic({ gameId, step }: { gameId: string; step: number }) {
  if (gameId === 'tandem-drive') return <DriveInstructionPicture step={step} />
  if (gameId === 'lost-instructions') return step === 0 ? <><Person x={9} y={56} /><Bubble><g transform="translate(79 32) scale(.63)"><Shapes x={0} y={0} /></g></Bubble></>
    : step === 1 ? <><Shapes ordered={false} y={18} /><path d="M38 88q57 33 113 0m-14-4 15 3-4 13" fill="none" stroke={ink} strokeWidth="3" /><Hand x={77} y={45} /></>
      : <><Shapes y={41} /><Check x={173} y={108} /></>
  if (gameId === 'map-navigator') return <><MapPicture />{step === 0 ? <Person x={0} y={65} /> : step === 1 ? <><path d="M60 75h75m-13-11 13 11-13 11" fill="none" stroke={ink} strokeWidth="4" /><Hand x={103} y={72} /></> : <Check x={163} y={101} />}</>
  if (gameId === 'tandem-drive') return <>{step === 0 ? <><Car x={90} y={8} /><rect x="13" y="89" width="92" height="31" rx="7" fill={paper} stroke={ink} strokeWidth="2" /><text x="59" y="110" textAnchor="middle" fontSize="15" fill={ink}>SPACE</text><Hand x={42} y={42} /></>
    : step === 1 ? <><path d="M28 113V35h155v78M80 35v78m52-78v78" stroke={ink} strokeWidth="4" fill="none" /><Car x={69} y={51} />{[0, 1, 2, 3].map(i => <circle key={i} cx={46 + i * 38} cy="20" r="8" fill={i < 2 ? '#83bd96' : '#f4b4c7'} stroke={ink} strokeWidth="2" />)}</> : <><Car /><Check x={159} y={101} /></>}</>
  if (gameId === 'codenames') return step === 0 ? <><Person x={7} y={64} /><Bubble><text x="130" y="57" fontSize="22" textAnchor="middle" fill={ink}>1 word + 2</text></Bubble></>
    : step === 1 ? <><Cards /><Hand x={84} y={65} /></> : <><Cards revealed /><Check x={174} y={111} size={21} /></>
  if (gameId === 'spot-difference') return step === 0 ? <><rect x="10" y="17" width="88" height="104" rx="9" fill={paper} stroke={ink} strokeWidth="2" /><rect x="111" y="17" width="88" height="104" rx="9" fill={paper} stroke={ink} strokeWidth="2" /><Plant x={-6} /><Plant x={96} cactus /></>
    : step === 1 ? <><Plant x={17} cactus /><circle cx="132" cy="55" r="28" fill="#fff8" stroke={ink} strokeWidth="4" /><path d="m151 78 28 29" stroke={ink} strokeWidth="10" strokeLinecap="round" /><circle cx="133" cy="54" r="13" fill={paper} stroke={purple} strokeWidth="2" /><text x="133" y="60" textAnchor="middle" fontSize="18" fill={ink}>i</text></>
      : <>{[0, 1, 2].map(i => <Check x={42 + i * 64} y={67} key={i} size={24} />)}</>
  return step === 0 ? <><Person x={8} y={58} /><Bubble><path d="M123 39q-19-13-23 10t17 24q10-7 20 0 24-10 16-29-9-15-22-4Z" fill={pink} stroke={ink} strokeWidth="2" /><path d="M128 38v-11m0 4q13-12 18-3" fill="none" stroke={ink} strokeWidth="3" /></Bubble></>
    : step === 1 ? <><IconCards /><Hand x={80} y={63} /></> : <><circle cx="97" cy="64" r="40" fill={pink} stroke={ink} strokeWidth="3" /><path d="M95 26v-12m0 4 18-6" stroke={ink} strokeWidth="4" /><Check x={153} y={100} /></>
}

const recipes: Record<string, { name: string; steps: [string, string][] }> = {
  'lost-instructions': { name: 'In Good Shape', steps: [['Describe', 'Name the color, shape, and position.'], ['Arrange', 'Your partner swaps the pieces.'], ['Check', 'Match the clue and celebrate together.']] },
  'icon-communication': { name: 'Icon Communication', steps: [['Describe', 'Explain the mystery icon.'], ['Choose', 'Your partner picks a match.'], ['Match', 'Find the right icon before time runs out.']] },
  'map-navigator': { name: 'Map Navigator', steps: [['Guide', 'Only the navigator sees the route.'], ['Move', 'Swipe one tile at a time.'], ['Arrive', 'Pass both checkpoints, then the star.']] },
  'tandem-drive': { name: 'Tandem Drive', steps: [['Drive together', 'Each player holds Space or their thruster. Both held drives straight; one held turns; both released stops.'], ['Find the safe lane', 'Navigation sees a green word gate. Say its word, then steer together toward that word on both boards.'], ['Time the gate', 'Cadence calls GO on green beats and taps Release gate near a locked gate. Cycling shutters open automatically on green. Clear four gates.']] },
  'spot-difference': { name: 'Spot the Difference', steps: [['Compare', 'Describe your two private scenes.'], ['Look closer', 'Use i to learn an object’s word.'], ['Find three', 'Choose differences together.']] },
  codenames: { name: 'Nicknames', steps: [['Send a clue', 'Type one clue word, enter the number of matching words, then press Give clue to send both to your partner.'], ['Choose words', 'Tap a square to open its pop-out. Request a definition for 10 points or confirm your selection.'], ['Use your bonus', 'The clue number gives that many guesses plus one extra. Use it or press Pass turn.']] },
}

export function InstructionIllustration({ gameId }: { gameId: string }) {
  const recipe = recipes[gameId]
  if (!recipe) return null
  return <figure className="instruction-recipe" aria-label={'Illustrated steps for ' + recipe.name}>
    <figcaption>At a glance <span>Play together</span></figcaption>
    <div className="instruction-recipe-steps">{recipe.steps.map(([title, description], step) => <div className="instruction-recipe-step" key={title}>
      <svg viewBox="0 0 210 140" role="img" aria-label={`${step + 1}. ${title}: ${description}`}>
        <rect x="3" y="3" width="204" height="134" rx="16" fill={step % 2 ? '#fff1db' : '#f2eafd'} stroke="#d4c0e7" strokeWidth="2" />
        <Graphic gameId={gameId} step={step} />
      </svg>
      <div className="instruction-recipe-caption"><strong><b>{step + 1}</b> {title}</strong><span>{description}</span></div>
      {step < 2 && <svg className="instruction-recipe-arrow" viewBox="0 0 30 24" aria-hidden="true"><path d="M2 15Q13 22 25 9m-9-3 11 2-1 11" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </div>)}</div>
  </figure>
}
