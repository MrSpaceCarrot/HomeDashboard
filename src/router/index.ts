import { createRouter, createWebHashHistory } from 'vue-router'

import BusTimetable from '@/views/BusTimetable.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: BusTimetable },
  ]
})

export default router
