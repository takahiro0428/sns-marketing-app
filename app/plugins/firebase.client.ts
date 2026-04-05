import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

export default defineNuxtPlugin({
  name: 'firebase',
  enforce: 'pre',
  setup() {
    const config = useRuntimeConfig()

    const firebaseConfig = {
      apiKey: config.public.firebaseApiKey,
      authDomain: config.public.firebaseAuthDomain,
      projectId: config.public.firebaseProjectId,
      storageBucket: config.public.firebaseStorageBucket,
      messagingSenderId: config.public.firebaseMessagingSenderId,
      appId: config.public.firebaseAppId,
    }

    let app: FirebaseApp
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig)
    } else {
      app = getApps()[0]
    }

    const auth: Auth = getAuth(app)
    const databaseId = config.public.firestoreDatabaseId || '(default)'
    const firestore: Firestore = databaseId === '(default)'
      ? getFirestore(app)
      : getFirestore(app, databaseId)
    const storage: FirebaseStorage = getStorage(app)

    return {
      provide: {
        firebase: app,
        auth,
        firestore,
        storage,
      },
    }
  },
})
