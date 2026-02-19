import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia } from 'pinia';
import App from './App.vue';
import { routes } from './router';
import './styles/main.css';
import './styles/prism.css';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-typescript';

const app = createApp(App);
const pinia = createPinia();
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL || '/'),
  routes: routes as import('vue-router').RouteRecordRaw[],
});

app.use(pinia);
app.use(router);

router.afterEach(() => {
  queueMicrotask(() => Prism.highlightAll());
});

app.mount('#app');
