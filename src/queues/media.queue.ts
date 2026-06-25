/**
 * @file media.queue.ts
 * @layer Queue
 * @responsibility BullMQ media queue — image resizing, thumbnail generation
 */

import { Queue } from 'bullmq'
import { config } from '../config'
import { parseRedisUrl } from '../database/redis'

export interface ResizeImageJob {
  type: 'resize_property_image'
  imagePath: string
  imageId: string
  propertyId: string
  sizes: Array<{ width: number; height: number; suffix: string }>
}

export interface GenerateThumbnailJob {
  type: 'generate_thumbnail'
  imagePath: string
  imageId: string
}

export type MediaJob = ResizeImageJob | GenerateThumbnailJob

let mediaQueue: Queue<MediaJob> | null = null

export function getMediaQueue(): Queue<MediaJob> {
  if (mediaQueue) {
    return mediaQueue
  }

  const connection = parseRedisUrl(config.redis.url)

  mediaQueue = new Queue<MediaJob>('media-queue', {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  })

  return mediaQueue
}

export async function addMediaJob(job: MediaJob): Promise<void> {
  const queue = getMediaQueue()
  const priority = job.type === 'resize_property_image' ? 2 : 3
  await queue.add(job.type, job, { priority })
}

export async function closeMediaQueue(): Promise<void> {
  if (mediaQueue) {
    await mediaQueue.close()
    mediaQueue = null
  }
}
