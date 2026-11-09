import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { astryxTokens } from './astryx/motion'

for (const [property, value] of Object.entries(astryxTokens)) {
  document.documentElement.style.setProperty(property, value)
}

createApp(App).mount('#app')
