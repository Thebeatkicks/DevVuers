import { defineStore } from 'pinia'
//import { fetchUser } from '@/api/user'     denna ska bytas
import type { User } from '../../../shared/src/types'

export const useUserStore = defineStore('user', {
  state: () => ({ user: null as User | null }),
  actions: {
    async load(id: number) {
      //this.user = await fetchUser(id)
    },
  },
})