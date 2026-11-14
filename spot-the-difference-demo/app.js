const differences = {
  a: { lamp: 'The lamp is yellow.', plant: 'There is a plant beside the desk.', clock: 'The clock shows three o’clock.', mug: 'The mug is on the desk.', picture: 'The picture has a blue frame.' },
  b: { lamp: 'The lamp is pink.', plant: 'There is no plant beside the desk.', clock: 'The clock shows nine o’clock.', mug: 'The mug is on the shelf.', picture: 'The picture has a lilac frame.' },
}

const scenes = {
  a: { lamp: '💡', plant: '🪴', clock: '🕒', mug: '☕', picture: '🖼️', book: '📚' },
  b: { lamp: '💗', plant: '·', clock: '🕘', mug: '☕', picture: '🖼️', book: '📚' },
}

let view = 'a'
let found = new Set()
let seconds = 120

const scene = document.querySelector('#scene')
const foundList = document.querySelector('#foundList')
const foundCount = document.querySelector('#foundCount')
const progress = document.querySelector('#progress')
const timer = document.querySelector('#timer')
const viewLabel = document.querySelector('#viewLabel')

function renderScene() {
  scene.innerHTML = Object.entries(scenes[view]).map(([key, icon]) => `
    <button class="spot ${found.has(key) ? 'selected' : ''}" data-key="${key}" aria-label="Inspect ${key}">
      <span>${icon}</span><small>${key}</small>
    </button>`).join('')
  scene.querySelectorAll('.spot').forEach(button => button.addEventListener('click', () => selectSpot(button.dataset.key)))
}

function selectSpot(key) {
  if (!differences.a[key] || found.has(key)) return
  found.add(key)
  renderScene()
  foundCount.textContent = found.size
  progress.textContent = `${found.size} / 5 found`
  foundList.innerHTML = [...found].map(item => `<li>${differences[view][item]}</li>`).join('')
}

document.querySelectorAll('.switch').forEach(button => button.addEventListener('click', () => {
  view = button.dataset.view
  document.querySelectorAll('.switch').forEach(item => item.classList.toggle('active', item === button))
  viewLabel.textContent = `Player ${view.toUpperCase()}`
  found = new Set()
  foundCount.textContent = '0'
  progress.textContent = '0 / 5 found'
  foundList.innerHTML = '<li class="empty">Your discoveries will appear here.</li>'
  renderScene()
}))

document.querySelector('#newRound').addEventListener('click', () => {
  found = new Set()
  seconds = 120
  document.querySelector('#roundNumber').textContent = String(Math.floor(Math.random() * 9) + 1).padStart(2, '0')
  foundCount.textContent = '0'
  progress.textContent = '0 / 5 found'
  foundList.innerHTML = '<li class="empty">Your discoveries will appear here.</li>'
  renderScene()
})

document.querySelector('#finishButton').addEventListener('click', () => {
  document.querySelector('#helper').textContent = found.size === 5 ? 'Excellent communication! You found every difference.' : `You found ${found.size} of 5. Keep asking questions to find the rest.`
})

setInterval(() => {
  if (seconds > 0) seconds -= 1
  const minutes = Math.floor(seconds / 60)
  timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}, 1000)

renderScene()
