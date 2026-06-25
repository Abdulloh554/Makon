/**
 * @file media.worker.ts
 * @layer Worker
 * @responsibility BullMQ worker for image processing — resize, thumbnail generation
 */

import { Worker } from 'bullmq'
import sharp from 'sharp'
import * as path from 'node:path'
import type { MediaJob } from '../queues/media.queue'
import { parseRedisUrl } from '../database/redis'
import { config } from '../config'

async function resizeImage(
  imagePath: string,
  outputDir: string,
  sizes: Array<{ width: number; height: number; suffix: string }>,
): Promise<void> {
  for (const size of sizes) {
    const outputPath = path.join(
      outputDir,
      `${path.basename(imagePath, path.extname(imagePath))}_${size.suffix}${path.extname(imagePath)}`,
    )

    await sharp(imagePath)
      .resize(size.width, size.height, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath)
  }
}

async function processMediaJob(job: MediaJob): Promise<void> {
  switch (job.type) {
    case 'resize_property_image': {
      const inputDir = path.dirname(job.imagePath)
      await resizeImage(job.imagePath, inputDir, job.sizes)
      break
    }

    case 'generate_thumbnail': {
      const inputDir = path.dirname(job.imagePath)
      const thumbnailPath = path.join(
        inputDir,
        `thumb_${path.basename(job.imagePath)}`,
      )

      await sharp(job.imagePath)
        .resize(300, 200, { fit: 'cover' })
        .jpeg({ quality: 70 })
        .toFile(thumbnailPath)
      break
    }
  }
}

export function createMediaWorker(): Worker<MediaJob> {
  const connection = parseRedisUrl(config.redis.url)

  const worker = new Worker<MediaJob>(
    'media-queue',
    async (job) => {
      console.log(`Processing media job: ${job.data.type} [${job.id}]`)
      await processMediaJob(job.data)
      console.log(`Media job completed: ${job.data.type} [${job.id}]`)
    },
    {
      connection,
      concurrency: 3,
    },
  )

  worker.on('failed', (job, err) => {
    console.error(`Media job failed [${job?.id}]:`, err.message)
  })

  return worker
}
