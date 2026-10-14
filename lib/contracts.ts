import { z } from 'zod';
export const Level = z.enum(['beginner', 'intermediate', 'advanced']);
export const Analysis = z.object({ kind: z.enum(['concept','problem','ambiguous','out_of_scope']), topic: z.enum(['quadratic','derivative','vector','general']), clarification: z.string() });
export const Draft = z.object({ introduction: z.string(), steps: z.array(z.object({ explanation: z.string(), latex: z.string() })).max(12), conclusion: z.string() });
export const ToolResult = z.object({ operation: z.enum(['polynomial_roots','derivative','vector_add']), coefficients: z.array(z.number().finite()), values: z.array(z.number().finite()), realRoots: z.boolean() });
export const Visual = z.object({ kind: z.enum(['plot2d','vector2d']), coefficients: z.array(z.number().finite()).max(3), vectors: z.array(z.tuple([z.number().finite(),z.number().finite()])).max(3), domain: z.tuple([z.number().finite(),z.number().finite()]) });
export type VisualSpec = z.infer<typeof Visual>;
export type Teaching = z.infer<typeof Draft>;
export const MAX_IMAGE_BYTES=3*1024*1024;
export const ImageAttachment=z.object({name:z.string().trim().min(1).max(180),dataUrl:z.string().max(4*1024*1024+100).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/)});
export type TutorImage=z.infer<typeof ImageAttachment>;
export const ChatHistory=z.array(z.object({role:z.enum(['user','assistant']),content:z.string().max(1800)})).max(6);
export const RequestBody = z.discriminatedUnion('action',[
  z.object({action:z.literal('start'),question:z.string().trim().max(2000).default(''),image:ImageAttachment.optional(),level:Level.default('beginner'),useSources:z.boolean().optional(),history:ChatHistory.optional()}).refine(v=>Boolean(v.question||v.image)),
  z.object({action:z.literal('resume'),runId:z.string().uuid(),eventId:z.string().uuid(),event:z.enum(['clarification','understood','confused','skip']),text:z.string().trim().max(2000).default('')})
]);
export type TutorRequest = z.infer<typeof RequestBody>;
