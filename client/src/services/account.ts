import { authApi } from '@/configs/axiosApi'
import type { UserInfo } from '@/store/auth.store'

export type AccountProfile = UserInfo & { created_at: string; updated_at: string | null }
export type ProfileDetails = { firstName: string; lastName: string }

const headers = (token: string) => ({ Authorization: `Bearer ${token}` })

export const accountApi = {
  async get(token: string, signal?: AbortSignal) {
    const { data } = await authApi.get<AccountProfile>('/account', { headers: headers(token), signal })
    return data
  },
  async update(token: string, details: ProfileDetails) {
    const { data } = await authApi.patch<AccountProfile>('/account', details, { headers: headers(token) })
    return data
  },
  async delete(token: string, password: string, confirmationEmail: string) {
    await authApi.delete('/account', { headers: headers(token), data: { password, confirmationEmail } })
  },
}
