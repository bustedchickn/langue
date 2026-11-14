import selectUrl from '../sfx/select Edit 1 Export 1.mp3'
import popUrl from '../sfx/pop-2.mp3'
import openUrl from '../sfx/open1.mp3'
import hitUrl from '../sfx/hit.mp3'
import gongUrl from '../sfx/Gong Sound Effect.mp3'
import connectingUrl from '../sfx/connecting1.mp3'
import connectedUrl from '../sfx/connected2.mp3'
import back1Url from '../sfx/back1.mp3'
import back2Url from '../sfx/back2.mp3'
import back3Url from '../sfx/back3.mp3'

const urls = {
  select: selectUrl, pop: popUrl, open: openUrl, hit: hitUrl, gong: gongUrl,
  connected: connectedUrl, back: back1Url, cancel: back2Url, close: back3Url,
} as const
export type Effect = keyof typeof urls

const preferenceKey = 'langue:sounds-enabled'
let enabled = localStorage.getItem(preferenceKey) !== 'false'
let searching = false
let searchAudio: HTMLAudioElement | undefined
const playing = new Set<HTMLAudioElement>()

function play(audio: HTMLAudioElement) {
  void audio.play().catch(() => {})
}

export function soundsEnabled() { return enabled }

export function setSoundsEnabled(value: boolean) {
  enabled = value
  localStorage.setItem(preferenceKey, String(value))
  if (!value) {
    searchAudio?.pause()
    for (const audio of playing) {
      audio.pause()
      audio.currentTime = 0
    }
    playing.clear()
  } else if (searching && searchAudio) {
    play(searchAudio)
  }
}

export function playEffect(effect: Effect) {
  if (!enabled) return
  const audio = new Audio(urls[effect])
  audio.volume = effect === 'gong' ? 0.3 : 0.45
  playing.add(audio)
  audio.addEventListener('ended', () => playing.delete(audio), { once: true })
  audio.addEventListener('error', () => playing.delete(audio), { once: true })
  void audio.play().catch(() => { playing.delete(audio) })
}

export function startSearchMusic() {
  searching = true
  if (!searchAudio) {
    searchAudio = new Audio(connectingUrl)
    searchAudio.loop = true
    searchAudio.volume = 0.22
  }
  searchAudio.currentTime = 0
  if (enabled) play(searchAudio)
}

export function stopSearchMusic() {
  searching = false
  if (searchAudio) {
    searchAudio.pause()
    searchAudio.currentTime = 0
  }
}
