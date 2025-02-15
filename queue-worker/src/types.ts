export type APIWorkerEnv = {
	R2: R2Bucket;
	phitty_kv: KVNamespace;
};

export type JobStages = 'yet-to-zip' | 'zipping' | 'zipped' | 'sent-to-train' | 'trained' | 'done';
