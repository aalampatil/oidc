import { authApi } from '@/configs/axiosApi'

export type VerificationResponse = { ok: boolean; message: string; retryAfter?: number }

export const emailVerification = {
  async send(email: string) {
    const { data } = await authApi.post<VerificationResponse>('/authenticate/email-verification/send', { email })
    return data
  },
  async verify(email: string, code: string) {
    const { data } = await authApi.post<VerificationResponse>('/authenticate/email-verification/verify', { email, code })
    return data
  },
}
