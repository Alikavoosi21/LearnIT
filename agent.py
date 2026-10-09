"""Python adapter to the shared TypeScript LangGraph runtime, not a second graph.

Graph, nodes and authoritative state live in lib/agent.ts. This adapter keeps a
persistent Node process, so Python CLI feedback resumes the same server state.
"""
import json
import subprocess
import uuid
from pathlib import Path


class TutorAgent:
    def __init__(self):
        root = Path(__file__).resolve().parent
        self.process = subprocess.Popen(
            ['node', '--env-file-if-exists=.env.local', str(root / 'node_modules/tsx/dist/cli.mjs'), 'worker.ts'],
            cwd=root, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            text=True, encoding='utf-8', bufsize=1,
        )

    def _request(self, payload):
        self.process.stdin.write(json.dumps(payload, ensure_ascii=False) + '\n')
        self.process.stdin.flush()
        line = self.process.stdout.readline()
        if not line:
            raise RuntimeError('پردازش Graph متوقف شد؛ نصب Node و وابستگی‌ها را بررسی کنید.')
        response = json.loads(line)
        if not response['ok']:
            raise RuntimeError(response['error'])
        return response['result']

    def start(self, question, level='beginner'):
        return self._request({'action': 'start', 'question': question, 'level': level})

    def resume(self, run_id, event, text=''):
        return self._request({'action': 'resume', 'runId': run_id, 'eventId': str(uuid.uuid4()), 'event': event, 'text': text})

    def close(self):
        if self.process.poll() is None:
            self.process.stdin.close()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.terminate()
                self.process.wait(timeout=5)

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()
