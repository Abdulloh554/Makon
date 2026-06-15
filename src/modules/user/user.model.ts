import { createModel } from '../../lib/model'
import { userSchemaDef } from './user.schema'

export const userModel = createModel('User', userSchemaDef)
