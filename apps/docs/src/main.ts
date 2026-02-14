import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './styles/main.css';
import './styles/prism.css';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-typescript';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');

router.afterEach(() => {
  queueMicrotask(() => Prism.highlightAll());
});
