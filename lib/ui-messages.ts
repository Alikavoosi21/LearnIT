import type { UIMessage } from 'ai';
import type { TutorResult } from './service';
export type TutorUIMessage=UIMessage<never,{result:TutorResult;progress:{node:string}}>;
