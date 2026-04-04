import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

let adminApp: App

export function getAdminApp(): App {
  if (getApps().length === 0) {
    const config = useRuntimeConfig()

    if (config.firebaseAdminPrivateKey && config.firebaseAdminClientEmail) {
      adminApp = initializeApp({
        credential: cert({
          projectId: config.firebaseAdminProjectId || config.public.firebaseProjectId,
          clientEmail: config.firebaseAdminClientEmail,
          privateKey: config.firebaseAdminPrivateKey.replace(/\\n/g, '\n'),
        }),
      })
    } else {
      // Default credentials (for Cloud Run / Firebase Hosting)
      adminApp = initializeApp()
    }
  } else {
    adminApp = getApps()[0]
  }
  return adminApp
}

export function getAdminFirestore(): Firestore {
  return getFirestore(getAdminApp())
}
