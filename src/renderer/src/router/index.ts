import { createRouter, createWebHashHistory } from 'vue-router'

import BusTimetable from '@renderer/views/BusTimetable.vue'
import Weather from '@renderer/views/Weather.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/', component: BusTimetable },
           { path: '/Weather', component: Weather }]
})

export default router
