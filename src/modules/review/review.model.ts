import { createModel } from '../../lib/model'
import { reviewSchemaDef } from './review.schema'

export const reviewModel = createModel('Review', reviewSchemaDef)
