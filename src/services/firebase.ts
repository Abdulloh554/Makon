import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth'
import type { App } from 'firebase-admin/app'
import { config } from '../config'

let firebaseApp: App | null = null

function initFirebase(): App {
  if (firebaseApp) return firebaseApp

  const existing = getApps()
  if (existing.length > 0) {
    firebaseApp = existing[0]
    return firebaseApp
  }

  const { projectId, clientEmail, privateKey } = config.firebase

  if (projectId && clientEmail && privateKey) {
    firebaseApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    })
  } else {
    firebaseApp = initializeApp({ projectId: projectId || undefined })
  }

  return firebaseApp
}

export function getFirebaseAdmin(): App {
  return initFirebase()
}

export async function verifyFirebaseToken(idToken: string): Promise<DecodedIdToken> {
  try {
    const app = getFirebaseAdmin()
    const decoded = await getAuth(app).verifyIdToken(idToken)
    return decoded
  } catch (err: any) {
    throw new Error(`Firebase token verification failed: ${err.message}`)
  }
}
