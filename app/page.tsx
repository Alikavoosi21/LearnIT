import { TutorWorkspace } from '@/components/tutor-workspace';
export default function Page() {
  return <TutorWorkspace mode={process.env.TUTOR_MODE==='openai'?'openai':'local'}/>;
}
