import bcrypt from 'bcrypt'

import { env } from '../config/env.js'

export const passwordService = {
  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, env.BCRYPT_ROUNDS)
  },

  async verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash)
  },
}
