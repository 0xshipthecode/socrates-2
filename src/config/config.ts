import { z } from 'zod';
import rawData from './socrates.json';


const assistantConfigSchema = z.object({
	assistants: z.array(
		z.object({
			name: z.string(),
			prompt: z.string(),
			backend: z.string()
		})),
	principals: z.array(
		z.object({
			name: z.string(),
			prompt: z.string()
		}))
});


export function loadSystemConfig() {
	const parsed = assistantConfigSchema.safeParse(rawData);

	if (!parsed.success) {
		throw new Error(`failed to parse config schema with error ${parsed.error}`);
	}
	return parsed.data;
}


