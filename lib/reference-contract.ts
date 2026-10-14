import { z } from 'zod';
export const Reference=z.object({id:z.string(),sourceId:z.string(),title:z.string(),book:z.string(),url:z.string().url(),text:z.string(),license:z.string(),licenseUrl:z.string().url(),publisher:z.string(),score:z.number()});
export type RetrievedReference=z.infer<typeof Reference>;
