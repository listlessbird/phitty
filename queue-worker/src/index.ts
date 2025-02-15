import { Hono } from 'hono';
import { z } from 'zod';
import { APIWorkerEnv, Job } from './types';
import JSZip from 'jszip';

const app = new Hono<{ Bindings: APIWorkerEnv }>();

const jobSchema = z.discriminatedUnion('stage', [
	z.object({
		stage: z.literal('yet-to-zip'),
		packName: z.string(),
		imageCount: z.number(),
	}),
	z.object({
		stage: z.literal('zipped'),
		packName: z.string(),
		imageCount: z.number(),
		zipKeyinR2: z.string(),
	}),
	z.object({
		stage: z.literal('sent-to-train'),
		packName: z.string(),
		imageCount: z.number(),
		zipKeyinR2: z.string(),
	}),
	z.object({
		stage: z.literal('trained'),
		packName: z.string(),
		imageCount: z.number(),
	}),
	z.object({
		stage: z.literal('done'),
		packName: z.string(),
		imageCount: z.number(),
	}),
]);

async function createZipFromImages(env: APIWorkerEnv, job: Job<'yet-to-zip'>): Promise<ArrayBuffer | null> {
	try {
		const zip = new JSZip();

		// key in r2 for images is like train/packName/{01,02,03,...imgCount}.png
		for (let i = 1; i <= job.imageCount; i++) {
			const key = `train/${job.packName}/${i.toString().padStart(2, '0')}.png`;
			const image = await env.R2.get(key);
			if (!image) {
				console.error(`Image not found in R2: ${key}`);
				continue;
			}

			const imageArrayBuffer = await image.arrayBuffer();
			zip.file(`${i.toString().padStart(2, '0')}.png`, imageArrayBuffer);
		}

		return await zip.generateAsync({ type: 'arraybuffer' });
	} catch (error) {
		console.error('Error creating zip:', error);
		return null;
	}
}

async function processUnzippedJobs(env: APIWorkerEnv) {
	try {
		const { keys } = await env.phitty_kv.list();

		for (const key of keys) {
			const jobData = await env.phitty_kv.get(key.name, 'json');
			if (!jobData) continue;

			const jobResult = jobSchema.safeParse(jobData);
			if (!jobResult.success) continue;

			const job = jobResult.data;
			if (job.stage !== 'yet-to-zip') continue;

			console.log(`Processing job: ${job.packName}`);

			const zipContent = await createZipFromImages(env, job);
			if (!zipContent) {
				console.error(`Failed to create zip for job: ${job.packName}`);
				continue;
			}

			const zipKey = `train_packs/${job.packName}.zip`;
			await env.R2.put(zipKey, zipContent, {
				customMetadata: {
					packName: job.packName,
					createdAt: new Date().toISOString(),
				},
			});

			const updatedJob = {
				...job,
				stage: 'zipped',
				zipKeyinR2: zipKey,
			} satisfies Job<'zipped'>;

			await env.phitty_kv.put(key.name, JSON.stringify(updatedJob));
			console.log(`Successfully processed job: ${job.packName}`);
		}
	} catch (error) {
		console.error('Error processing unzipped jobs:', error);
	}
}

app.get('/', (c) => {
	return c.json({
		message: 'Hello, world!',
	});
});

export default {
	fetch: app.fetch,
	async scheduled(event, env, ctx) {
		ctx.waitUntil(processUnzippedJobs(env));
	},
} as ExportedHandler<APIWorkerEnv>;
