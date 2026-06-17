import { createModel } from '../../database/model'
import { reviewSchemaDef } from './review.schema'

export const reviewModel = createModel('Review', reviewSchemaDef)
