import { createModel } from '../../lib/model'
import { propertySchemaDef } from './property.schema'

export const propertyModel = createModel('Property', propertySchemaDef)
