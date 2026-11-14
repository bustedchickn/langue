import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { join } from 'node:path'
import { db, deletePlayerAccount } from '../server/store'

const browser = await chromium.launch({ executablePath: process.env.IDLE_CHROMIUM_PATH })
const first = await browser.newPage({ viewport: { width: 390, height: 844 } })
const second = await browser.newPage({ viewport: { width: 1200, height: 900 } })
const pageErrors: string[] = []
first.on('pageerror', error => pageErrors.push(error.message))
second.on('pageerror', error => pageErrors.push(error.message))
let firstUid: string | undefined
let secondUid: string | undefined

try {
  for (const page of [first, second]) {
    await page.goto(process.env.IDLE_BROWSER_URL ?? 'http://localhost:5173')
    await page.getByRole('button', { name: 'Quick test guest' }).click()
    await page.getByRole('button', { name: 'Open Vocabulary' }).waitFor()
  }
  firstUid = await first.evaluate(async () => (await import('/client/backend.ts')).auth.currentUser?.uid)
  secondUid = await second.evaluate(async () => (await import('/client/backend.ts')).auth.currentUser?.uid)
  assert.ok(firstUid && secondUid && firstUid !== secondUid)

  await first.getByRole('button', { name: 'Open Vocabulary' }).click()
  await first.getByRole('heading', { name: 'Your Vocabulary' }).waitFor()
  await first.getByRole('button', { name: 'Travel Basics' }).waitFor()
  assert.equal(await first.locator('.vocab-set-card').count(), 5)
  if (process.env.VOCAB_SCREENSHOT_DIR) await first.screenshot({
    path: join(process.env.VOCAB_SCREENSHOT_DIR, 'vocabulary-mobile.png'), fullPage: true,
  })
  for (const language of ['Spanish', 'English', 'French']) {
    await first.getByLabel('Language to practice').selectOption(language)
    assert.equal(await first.locator('.vocab-set-card').count(), 5)
  }
  assert.equal(await first.evaluate(() => document.documentElement.scrollWidth), 390)

  await first.getByRole('button', { name: '+ Create new set' }).click()
  await first.getByLabel('Set name').fill('My travel words')
  await first.getByLabel('Topic').fill('Travel')
  await first.getByLabel('Word or phrase').fill('Good morning')
  await first.getByLabel('Translation').fill('Bonjour')
  await first.getByLabel('Part of speech').fill('Phrase')
  await first.getByLabel('Example sentence').fill('Bonjour, mon ami !')
  await first.getByLabel('Notes').fill('Use before noon')
  await first.getByLabel('Paste word pairs').fill('thank you — merci\nplease — s’il vous plaît')
  await first.getByRole('button', { name: 'Import word pairs' }).click()
  await first.getByRole('button', { name: 'Preview', exact: true }).click()
  await first.getByRole('region', { name: 'Set preview' }).getByText('thank you — merci').waitFor()
  await first.getByRole('button', { name: 'Save set' }).click()
  await first.getByRole('heading', { name: 'My travel words' }).waitFor()
  const custom = await db.collection('vocabularySets').where('ownerUid', '==', firstUid).where('name', '==', 'My travel words').get()
  assert.equal(custom.size, 1)
  const customId = custom.docs[0].id
  assert.equal(custom.docs[0].data().words.length, 3)

  await first.getByRole('navigation', { name: 'Study modes' }).getByRole('button', { name: 'Flashcards' }).click()
  await first.getByRole('button', { name: '☆ Star' }).click()
  await first.getByRole('button', { name: 'I know this' }).click()
  await first.keyboard.press('ArrowRight')
  await first.getByText('3 of 3').waitFor()
  await first.getByRole('button', { name: /Flashcard 3:/ }).click()
  await first.getByRole('button', { name: /Flashcard 3: s’il vous plaît/ }).waitFor()
  await first.getByRole('navigation', { name: 'Study modes' }).getByRole('button', { name: 'Write' }).click()
  await first.getByLabel('Your translation').fill('incorrect')
  await first.getByRole('button', { name: 'Check answer' }).click()
  await first.getByText(/Correct answer:/).waitFor()
  for (let index = 1; index < 3; index++) {
    await first.getByRole('button', { name: 'Next word' }).click()
    await first.getByLabel('Your translation').fill('incorrect')
    await first.getByRole('button', { name: 'Check answer' }).click()
  }
  await first.getByRole('button', { name: 'Next word' }).click()
  await first.getByRole('heading', { name: 'Writing complete!' }).waitFor()
  await first.getByRole('navigation', { name: 'Study modes' }).getByRole('button', { name: 'Learn' }).click()
  const firstIntroduction = await first.getByRole('heading', { name: /Meet “/ }).innerText()
  const firstTranslation = firstIntroduction.match(/“(.+)”/)?.[1]
  assert.ok(firstTranslation)
  await first.getByRole('button', { name: 'Try this word' }).click()
  await first.getByRole('heading', { name: 'Learn Mode' }).waitFor()
  const wrong = first.locator('.vocab-choices button').filter({ hasNotText: firstTranslation }).first()
  await wrong.click()
  await first.getByText('Still learning', { exact: true }).waitFor()
  await first.getByText('1 of 5').waitFor()
  await first.getByRole('navigation', { name: 'Study modes' }).getByRole('button', { name: 'Test' }).click()
  await first.getByRole('heading', { name: 'Test Mode' }).waitFor()
  for (let index = 0; index < 4; index++) {
    if (await first.locator('.vocab-answer-form').count()) {
      await first.getByLabel('Your answer').fill('incorrect')
      await first.getByRole('button', { name: 'Check answer' }).click()
    } else await first.locator('.vocab-choices button').first().click()
    await first.getByRole('button', { name: index === 3 ? 'See results' : 'Next question' }).click()
  }
  await first.getByRole('heading', { name: 'Test complete!' }).waitFor()
  await first.getByText(/accuracy/).waitFor()
  await first.getByRole('navigation', { name: 'Study modes' }).getByRole('button', { name: 'Match' }).click()
  await first.getByRole('heading', { name: 'Match Mode' }).waitFor()
  for (const [term, translation] of [['Good morning', 'Bonjour'], ['thank you', 'merci'], ['please', 's’il vous plaît']]) {
    await first.locator('.vocab-match-grid button').filter({ hasText: term }).click()
    await first.locator('.vocab-match-grid button').filter({ hasText: translation }).click()
  }
  await first.getByText('Nice matching!').waitFor()
  await first.getByText(/100% accuracy/).first().waitFor()

  await first.reload()
  await first.getByRole('button', { name: 'Open Vocabulary' }).click()
  await first.getByRole('button', { name: 'My travel words', exact: true }).waitFor()
  await first.getByLabel('Search words and sets').fill('merci')
  assert.ok(await first.locator('.vocab-set-card').count() >= 1)
  await first.getByRole('button', { name: 'My travel words', exact: true }).click()
  await first.getByRole('button', { name: 'Edit set' }).click()
  await first.getByLabel('Set name').fill('My travel phrases')
  await first.getByRole('button', { name: 'Save set' }).click()
  await first.getByRole('heading', { name: 'My travel phrases' }).waitFor()
  await first.getByRole('button', { name: 'Duplicate set' }).click()
  await first.getByText('Set duplicated.').waitFor()
  await first.getByRole('button', { name: '← All vocabulary sets' }).click()
  await first.getByRole('button', { name: 'My travel phrases copy', exact: true }).waitFor()
  await first.getByRole('button', { name: 'My travel phrases copy', exact: true }).click()
  await first.getByRole('button', { name: 'Delete set' }).click()
  await first.getByRole('button', { name: 'Confirm delete' }).click()
  await first.getByText('Set deleted.').waitFor()

  await second.getByRole('button', { name: 'Open Vocabulary' }).click()
  await second.getByRole('heading', { name: 'Your Vocabulary' }).waitFor()
  await second.getByRole('button', { name: 'Travel Basics' }).waitFor()
  if (process.env.VOCAB_SCREENSHOT_DIR) await second.screenshot({
    path: join(process.env.VOCAB_SCREENSHOT_DIR, 'vocabulary-desktop.png'), fullPage: true,
  })
  const forbidden = await second.evaluate(async id => {
    try { await (await import('/client/vocabulary/store.ts')).getVocabularySet(id); return false }
    catch { return true }
  }, customId)
  assert.equal(forbidden, true, 'another account cannot read this set')
  const forbiddenDelete = await second.evaluate(async id => {
    try { await (await import('/client/vocabulary/store.ts')).deleteVocabularySet(id); return false }
    catch { return true }
  }, customId)
  assert.equal(forbiddenDelete, true, 'another account cannot delete this set')
  assert.equal(await second.evaluate(() => document.documentElement.scrollWidth), 1200)
  assert.deepEqual(pageErrors, [])
  console.log('Vocabulary hub, editing, study modes, persistence, and ownership emulator check passed.')
} finally {
  await browser.close()
  if (firstUid) await deletePlayerAccount(firstUid).catch(() => {})
  if (secondUid) await deletePlayerAccount(secondUid).catch(() => {})
}
