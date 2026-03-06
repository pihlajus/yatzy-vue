import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { flushScoreQueue } from './firebase'

const app = createApp(App)

app.use(createPinia())

app.mount('#app')

flushScoreQueue()
window.addEventListener('online', () => flushScoreQueue())
