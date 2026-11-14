/** Reuse the same car, road, crates, and gate art as the live canvas. */
export function DriveInstructionPicture({ step }: { step: number }) {
  return <g>
    <rect x="12" y="10" width="186" height="120" rx="8" fill="#29212a" />
    <image href="/lostintranslationroad.png" x="20" y="10" width="170" height="120" preserveAspectRatio="none" />
    <path d="M20 12v115M190 12v115" stroke="#FBF3B9" strokeWidth="3" />
    {step === 0 ? <>
      <rect x="25" y="18" width="65" height="21" rx="5" fill="#FBF3B9" />
      <rect x="120" y="18" width="65" height="21" rx="5" fill="#B7B1F2" />
      <text x="57" y="32" textAnchor="middle" fontSize="9">LEFT</text><text x="152" y="32" textAnchor="middle" fontSize="9">RIGHT</text>
      <path d="M55 45v35m-5-8 5 8 5-8M155 45v35m-5-8 5 8 5-8" fill="none" stroke="white" strokeWidth="3" />
    </> : <>
      {[30, 85, 140].map((x, index) => <g key={x}>
        <image href={index === 1 ? '/lostintranslationcargamecorrect.png' : '/lostintranslationcargameincorrect.png'} x={x} y="42" width="45" height="18" preserveAspectRatio="none" />
        <text x={x + 22} y="54" textAnchor="middle" fontSize="9" fontWeight="bold">{['CAT', 'SUN', 'KEY'][index]}</text>
      </g>)}
      <image href="/lostintranslationcrates.png" x="33" y="82" width="20" height="20" />
      {step === 1 ? <path d="M106 95V63m-6 8 6-8 6 8" fill="none" stroke="white" strokeWidth="3" /> : <>
        {[0, 1, 2, 3].map(i => <circle key={i} cx={76 + i * 19} cy="23" r="6" fill={i < 2 ? '#89E7E9' : '#F26A8D'} />)}
        <rect x="130" y="86" width="52" height="25" rx="5" fill="#89E7E9" /><text x="156" y="97" textAnchor="middle" fontSize="8">Release gate</text><text x="156" y="107" textAnchor="middle" fontSize="9" fontWeight="bold">GO</text>
      </>}
    </>}
    <svg x={step === 0 ? 88 : 94} y={step === 0 ? 55 : 83} width="30" height="43" viewBox="295 0 1350 1935">
      <image href="/lostintranslationcar.png" width="1935" height="1935" />
    </svg>
  </g>
}
