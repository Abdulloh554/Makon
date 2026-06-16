import { Router } from 'express'
import { telegramAuth } from '../telegram/telegram.controller'

const router = Router()

router.get('/auth', telegramAuth)

export default router
