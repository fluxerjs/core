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
import ApiReferenceLayout from './pages/ApiReferenceLayout.vue';
import ApiReferencePage from './pages/ApiReferencePage.vue';

export const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/changelog', name: 'changelog', component: Changelog },
  { path: '/guides', redirect: '/v/latest/guides' },
  { path: '/docs', redirect: '/v/latest/docs' },
  { path: '/api', redirect: '/v/latest/api' },
  { path: '/v/:version/changelog', redirect: '/changelog' },
  {
    path: '/v/:version',
    component: VersionLayout,
    children: [
      {
        path: '',
        redirect: ((to: { params: { version?: string } }) =>
          `/v/${to.params.version}/guides`) as import('vue-router').RouteRecordRedirectOption,
      },
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
            redirect: ((to: { params: Record<string, string | string[] | undefined> }) => ({
              name: 'classes',
              params: { ...to.params },
            })) as import('vue-router').RouteRecordRedirectOption,
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
      {
        path: 'api',
        component: ApiReferenceLayout,
        children: [{ path: '', name: 'api', component: ApiReferencePage }],
      },
    ],
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound },
];
