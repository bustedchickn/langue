import {
  collection, deleteDoc, doc, getDoc, onSnapshot, query, runTransaction, setDoc, updateDoc, where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../backend'
import { starterVocabulary, type VocabularySet, type VocabularyWord } from '../../shared/vocabulary'

const sets = collection(db, 'vocabularySets')
const setRef = (id: string) => doc(sets, id)

export async function initializeVocabulary(uid: string) {
  const hub = doc(db, 'vocabularyHubs', uid)
  await runTransaction(db, async transaction => {
    if ((await transaction.get(hub)).exists()) return
    const now = Date.now()
    for (const starter of starterVocabulary(uid, now)) {
      transaction.set(setRef(uid + '-' + starter.id), { ...starter, id: uid + '-' + starter.id })
    }
    transaction.set(hub, { ownerUid: uid, initializedAt: now })
  })
}

export function watchVocabulary(uid: string, onData: (value: VocabularySet[]) => void,
  onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(query(sets, where('ownerUid', '==', uid)), snapshot => {
    onData(snapshot.docs.map(item => item.data() as VocabularySet)
      .sort((first, second) => second.updatedAt - first.updatedAt))
  }, onError)
}

export async function saveVocabularySet(value: VocabularySet) {
  await setDoc(setRef(value.id), value)
}

export async function editVocabularySet(value: VocabularySet) {
  await updateDoc(setRef(value.id), {
    name: value.name, topic: value.topic, description: value.description,
    sourceLanguage: value.sourceLanguage, targetLanguage: value.targetLanguage,
    words: value.words, updatedAt: Date.now(),
  })
}

export async function deleteVocabularySet(id: string) {
  await deleteDoc(setRef(id))
}

export async function updateVocabularyWord(setId: string, wordId: string, change: Partial<VocabularyWord>) {
  const ref = setRef(setId)
  await runTransaction(db, async transaction => {
    const record = await transaction.get(ref)
    if (!record.exists()) throw new Error('This vocabulary set is no longer available.')
    const set = record.data() as VocabularySet
    const words = set.words.map(word => word.id === wordId ? { ...word, ...change } : word)
    transaction.update(ref, { words, updatedAt: Date.now(), lastPracticedAt: Date.now() })
  })
}

export async function getVocabularySet(id: string) {
  return (await getDoc(setRef(id))).data() as VocabularySet | undefined
}
