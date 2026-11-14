export function Avatar({ name, photo }: { name: string; photo?: string | null }) {
  return <span className="avatar player-avatar" aria-hidden="true">
    {name.trim().slice(0, 1).toUpperCase() || '?'}
    {photo && <img src={photo} alt="" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true }} />}
  </span>
}
