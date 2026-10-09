"""Persian CLI for the same graph used by the Next.js application."""
import argparse
import json
import sys
from agent import TutorAgent


def show(result, as_json=False):
    if as_json:
        print(json.dumps(result, ensure_ascii=False))
        return
    answer = result.get('answer')
    if answer:
        print('\n' + answer['introduction'])
        for i, step in enumerate(answer['steps'], 1):
            print(f"{i}. {step['explanation']}\n   {step['latex']}")
        print(answer['conclusion'])
    print('\nبررسی: ' + result['verificationNote'])
    print('مسیر: ' + ' → '.join(result['trace']))


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description='LearnIT — معلم ریاضی')
    parser.add_argument('question', nargs='?')
    parser.add_argument('--once', action='store_true')
    parser.add_argument('--json', action='store_true')
    parser.add_argument('--level', choices=['beginner', 'intermediate', 'advanced'], default='beginner')
    args = parser.parse_args()
    with TutorAgent() as tutor:
        result = tutor.start(args.question or input('سؤال ریاضی: '), args.level)
        show(result, args.json)
        while not (args.once or args.json) and result['status'] in ['needs_clarification', 'awaiting_feedback']:
            if result['status'] == 'needs_clarification':
                text = input('توضیح تکمیلی: ')
                event = 'clarification'
            else:
                text = input('فهمیدم / نفهمیدم / رد کردن: ')
                event = 'confused' if 'نفهم' in text else 'understood' if 'فهمید' in text else 'skip'
            result = tutor.resume(result['runId'], event, text)
            show(result)


if __name__ == '__main__':
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        print('\nپایان نشست.')
    except (RuntimeError, OSError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
