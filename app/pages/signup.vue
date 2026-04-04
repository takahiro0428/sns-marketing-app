<template>
  <div class="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
    <div class="max-w-md w-full">
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <svg class="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">アカウント作成</h1>
        <p class="mt-2 text-sm text-gray-600">SNS Marketing Automationを始めましょう</p>
      </div>

      <div class="card">
        <form @submit.prevent="handleSignUp" class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">表示名</label>
            <input
              v-model="displayName"
              type="text"
              required
              class="input-field"
              placeholder="あなたの名前"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
            <input
              v-model="email"
              type="email"
              required
              autocomplete="email"
              class="input-field"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
            <input
              v-model="password"
              type="password"
              required
              minlength="8"
              autocomplete="new-password"
              class="input-field"
              placeholder="8文字以上"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">パスワード（確認）</label>
            <input
              v-model="confirmPassword"
              type="password"
              required
              autocomplete="new-password"
              class="input-field"
              placeholder="パスワードを再入力"
            />
          </div>

          <div v-if="error" class="p-3 rounded-lg bg-red-50 text-sm text-red-700">
            {{ error }}
          </div>

          <button type="submit" class="btn-primary w-full" :disabled="loading">
            <CommonLoadingSpinner v-if="loading" size="sm" />
            <span v-else>アカウントを作成</span>
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-gray-600">
          既にアカウントをお持ちの方は
          <NuxtLink to="/login" class="font-semibold text-indigo-600 hover:text-indigo-500">
            ログイン
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

const { signUp } = useAuth()
const router = useRouter()

const displayName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)

const handleSignUp = async () => {
  error.value = ''

  if (password.value !== confirmPassword.value) {
    error.value = 'パスワードが一致しません'
    return
  }

  if (password.value.length < 8) {
    error.value = 'パスワードは8文字以上にしてください'
    return
  }

  loading.value = true
  try {
    await signUp(email.value, password.value, displayName.value)
    router.push('/projects')
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err.code === 'auth/email-already-in-use') {
      error.value = 'このメールアドレスは既に使用されています'
    } else {
      error.value = 'アカウントの作成に失敗しました'
    }
  } finally {
    loading.value = false
  }
}
</script>
