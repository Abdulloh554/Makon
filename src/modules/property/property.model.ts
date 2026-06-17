import { createModel } from '../../database/model'
import { propertySchemaDef } from './property.schema'

export const propertyModel = createModel('Property', propertySchemaDef)
