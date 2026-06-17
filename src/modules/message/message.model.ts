import { createModel } from '../../database/model'
import { messageSchemaDef } from './message.schema'

export const messageModel = createModel('Message', messageSchemaDef)
