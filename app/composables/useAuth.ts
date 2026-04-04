import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  type User,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import type { UserProfile } from '~/types'

const currentUser = ref<User | null>(null)
const userProfile = ref<UserProfile | null>(null)
const authLoading = ref(true)
const authInitialized = ref(false)

export function useAuth() {
  const { $auth, $firestore } = useNuxtApp()

  const initAuth = () => {
    if (authInitialized.value) return

    onAuthStateChanged($auth, async (user) => {
      currentUser.value = user
      if (user) {
        await loadUserProfile(user.uid)
      } else {
        userProfile.value = null
      }
      authLoading.value = false
    })
    authInitialized.value = true
  }

  const loadUserProfile = async (uid: string) => {
    const docRef = doc($firestore, 'users', uid)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      userProfile.value = { uid, ...docSnap.data() } as UserProfile
    }
  }

  const createUserProfile = async (user: User) => {
    const docRef = doc($firestore, 'users', user.uid)
    const profile = {
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || '',
      photoURL: user.photoURL || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    await setDoc(docRef, profile)
    userProfile.value = { uid: user.uid, ...profile } as unknown as UserProfile
  }

  const signIn = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword($auth, email, password)
    return credential.user
  }

  const signUp = async (email: string, password: string, displayName: string) => {
    const credential = await createUserWithEmailAndPassword($auth, email, password)
    await updateProfile(credential.user, { displayName })
    await createUserProfile(credential.user)
    return credential.user
  }

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    const credential = await signInWithPopup($auth, provider)
    const docRef = doc($firestore, 'users', credential.user.uid)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) {
      await createUserProfile(credential.user)
    }
    return credential.user
  }

  const signOut = async () => {
    await firebaseSignOut($auth)
    currentUser.value = null
    userProfile.value = null
  }

  return {
    currentUser: readonly(currentUser),
    userProfile: readonly(userProfile),
    authLoading: readonly(authLoading),
    initAuth,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    loadUserProfile,
  }
}
