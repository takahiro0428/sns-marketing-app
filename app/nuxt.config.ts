export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  future: { compatibilityVersion: 4 },
  ssr: false,

  modules: [
    '@nuxtjs/tailwindcss',
  ],

  runtimeConfig: {
    // Server-only
    firebaseAdminProjectId: process.env.FIREBASE_ADMIN_PROJECT_ID || '',
    firebaseAdminClientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || '',
    firebaseAdminPrivateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY || '',
    firestoreDatabaseId: process.env.FIRESTORE_DATABASE_ID || '(default)',
    vertexAiProjectId: process.env.VERTEX_AI_PROJECT_ID || '',
    vertexAiLocation: process.env.VERTEX_AI_LOCATION || 'asia-northeast1',
    vertexAiModel: process.env.VERTEX_AI_MODEL || 'gemini-2.0-flash',
    noteApiEndpoint: process.env.NOTE_API_ENDPOINT || 'https://note.com/api',
    xApiKey: process.env.X_API_KEY || '',
    xApiSecret: process.env.X_API_SECRET || '',
    xAccessToken: process.env.X_ACCESS_TOKEN || '',
    xAccessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET || '',
    schedulerApiKey: process.env.SCHEDULER_API_KEY || '',

    // Public (client-accessible)
    public: {
      firebaseApiKey: process.env.FIREBASE_API_KEY || '',
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      firebaseAppId: process.env.FIREBASE_APP_ID || '',
      firestoreDatabaseId: process.env.FIRESTORE_DATABASE_ID || '(default)',
    },
  },

  nitro: {
    preset: 'firebase',
    firebase: {
      gen: 2,
      nodeVersion: '22',
      region: 'asia-northeast1',
    },
  },

  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css',
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  app: {
    head: {
      title: 'SNS Marketing Automation',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'AI-powered SNS marketing automation tool' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },
})
