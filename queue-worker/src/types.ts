export type APIWorkerEnv = {
	R2: R2Bucket;
	phitty_kv: KVNamespace;
};

export type JobStages = 'yet-to-zip' | 'zipped' | 'sent-to-train' | 'trained' | 'done';

export type Job<Stage extends JobStages = JobStages> = {
	packName: string;
	imageCount: number;
	stage: Stage;
} & (Stage extends 'zipped' | 'sent-to-train'
	? {
			zipKeyinR2: string;
	  }
	: {});
