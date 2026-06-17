import { createModel } from '../../database/model'
import { sellerSchemaDef } from './seller.schema'

export const sellerModel = createModel('Seller', sellerSchemaDef)
