import { createModel } from '../../lib/model'
import { messageSchemaDef } from './message.schema'

export const messageModel = createModel('Message', messageSchemaDef)
