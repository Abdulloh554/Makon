import { createModel } from '../../lib/model'
import { sellerSchemaDef } from './seller.schema'

export const sellerModel = createModel('Seller', sellerSchemaDef)
