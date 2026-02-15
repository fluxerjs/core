import { createRouter, createWebHistory } from 'vue-router';
import Home from './pages/Home.vue';
import Changelog from './pages/Changelog.vue';
import NotFound from './pages/NotFound.vue';
import VersionLayout from './pages/VersionLayout.vue';
import GuidesLayout from './pages/GuidesLayout.vue';
import GuidesIndex from './pages/GuidesIndex.vue';
import GuidePage from './pages/GuidePage.vue';
import DocsLayout from './pages/DocsLayout.vue';
import ClassPage from './pages/ClassPage.vue';
import TypedefPage from './pages/TypedefPage.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/changelog', name: 'changelog', component: Changelog },
    { path: '/guides', redirect: '/v/latest/guides' },
    { path: '/docs', redirect: '/v/latest/docs' },
    { path: '/v/:version/changelog', redirect: '/changelog' },
    {
      path: '/v/:version',
      component: VersionLayout,
      children: [
        { path: '', redirect: (to) => `/v/${to.params.version}/guides` },
        {
          path: 'guides',
          component: GuidesLayout,
          children: [
            { path: '', name: 'guides', component: GuidesIndex },
            { path: ':slug', name: 'guide', component: GuidePage },
          ],
        },
        {
          path: 'docs',
          component: DocsLayout,
          children: [
            {
              path: '',
              name: 'docs',
              redirect: (to) => ({ name: 'classes', params: { ...to.params } }),
            },
            {
              path: 'classes',
              name: 'classes',
              component: () => import('./pages/ClassesList.vue'),
            },
            { path: 'classes/:class', name: 'class', component: ClassPage },
            {
              path: 'typedefs',
              name: 'typedefs',
              component: () => import('./pages/TypedefsList.vue'),
            },
            { path: 'typedefs/:typedef', name: 'typedef', component: TypedefPage },
          ],
        },
      ],
    },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound },
  ],
});

export default router;
