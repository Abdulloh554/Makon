import { createModel } from '../../database/model'
import { userSchemaDef } from './user.schema'

export const userModel = createModel('User', userSchemaDef)
