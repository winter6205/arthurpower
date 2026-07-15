#!/usr/bin/env python3
"""run_skill_eval.py - Arthurpower skill eval driver.

CRUDE PROXY (not real Claude loader): matches query against skill
description substring (case-insensitive, word-boundary regex). The real Claude
Code loader also considers When-to-use body, tags, related_skills, and
semantic similarity; this driver does not.

Usage:
  python run_skill_eval.py <evals.json>

Outputs:
  - Per-query PASS/FAIL on stdout
  - Writes grading.json (replaces any stub) with real pass rate
"""
import json
import re
import sys
from pathlib import Path

PLUGIN_DIR = Path('C:/Users/dev/.claude/plugins/arthurpower/skills')

def normalize(s):
    return re.sub(r'\s+', ' ', s.lower().strip())

def description_substring_match(query, description):
    """Single-field match (kept for legacy callers). Prefer match_any_field."""
    if not description or not query:
        return False
    return _bilingual_match(query, description)

def _bilingual_match(query, text):
    """Bilingual token pool against one text field."""
    if not text or not query:
        return False
    q = normalize(query)
    text_n = normalize(text)
    for t in re.findall(r'[a-z0-9_-]{3,}', text_n):
        if re.search(r'\b' + re.escape(t) + r'\b', q):
            return True
    for t in re.findall(r'[一-鿿]{2,}', text):
        if t in query:
            return True
    return False

def query_matches_skill(query, skill_data):
    """3-layer match: description + When-to-use bullets + tags."""
    if _bilingual_match(query, skill_data.get('description', '')):
        return True
    for bullet in skill_data.get('whentouse', []):
        if _bilingual_match(query, bullet):
            return True
    q_lower = query.lower()
    for tag in skill_data.get('tags', []):
        if re.search(r'\b' + re.escape(tag.lower()) + r'\b', q_lower):
            return True
    return False

def load_skill_descriptions():
    """Load description + When-to-use bullets + tags per skill (3-layer proxy).

    Real Claude Code loader reads frontmatter description, body When-to-use
    section, and tags. This proxy mirrors all 3 to approximate routing.
    """
    skills = {}
    for skill_dir in PLUGIN_DIR.iterdir():
        if not skill_dir.is_dir():
            continue
        skill_md = skill_dir / 'SKILL.md'
        if not skill_md.exists():
            continue
        text = skill_md.read_text(encoding='utf-8')
        m = re.match(r'^---\s*\n(.*?)\n---', text, re.DOTALL)
        if not m:
            continue
        fm = m.group(1)
        name_m = re.search(r'^name:\s*(.+?)$', fm, re.MULTILINE)
        desc_m = re.search(r'^description:\s*["\']?(.*?)["\']?\s*$', fm, re.MULTILINE)
        tags_m = re.search(r'^tags:\s*\[(.*?)\]\s*$', fm, re.MULTILINE | re.DOTALL)
        if not (name_m and desc_m):
            continue
        name = name_m.group(1).strip()
        # Extract When-to-use bullets
        whentouse = extract_whentouse_bullets(text)
        # Extract tags as list
        tags = []
        if tags_m:
            tags = [t.strip().strip('"').strip("'") for t in tags_m.group(1).split(',') if t.strip()]
        skills[name] = {
            'description': desc_m.group(1).strip(),
            'whentouse': whentouse,
            'tags': tags,
        }
    return skills

def extract_whentouse_bullets(skill_text):
    """Pull bullet lines from ## When to use section until next ## header."""
    # Find When to use section
    m = re.search(r'^## When to use\s*\n(.*?)(?=^## |\Z)',
                  skill_text, re.MULTILINE | re.DOTALL)
    if not m:
        return []
    body = m.group(1)
    # Bullets start with - or  - (en/em dash)
    bullets = re.findall(r'^\s*[-—]\s*(.+?)$', body, re.MULTILINE)
    return [b.strip() for b in bullets if b.strip()]

def query_matches_skill(query, skill_data):
    """3-layer match: description substring OR When-to-use substring OR tag."""
    if description_substring_match(query, skill_data['description']):
        return True
    for bullet in skill_data['whentouse']:
        if description_substring_match(query, bullet):
            return True
    for tag in skill_data['tags']:
        if re.search(r'\b' + re.escape(tag.lower()) + r'\b', query.lower()):
            return True
    return False

def run_query(query, target_skill, skills):
    matched = [n for n, sd in skills.items()
               if query_matches_skill(query, sd)]
    return matched, (target_skill in matched)

def run_eval(evals_path, descriptions, target_skill):
    evals = json.loads(evals_path.read_text(encoding='utf-8'))
    queries = evals['queries']
    min_rate = evals.get('pass_criteria', {}).get('min_pass_rate', 0.90)
    results = []
    for q_obj in queries:
        q = q_obj['q']
        expected = q_obj.get('expected_skill_loaded')
        matched, fired = run_query(q, target_skill, descriptions)
        if expected is True:
            passed = fired
        elif expected is False:
            passed = not fired
        else:
            passed = (len(matched) == 0)
        results.append({
            'q': q, 'expected': expected,
            'matched': matched, 'fired_on_target': fired,
            'passed': passed,
        })
    pass_count = sum(1 for r in results if r['passed'])
    rate = pass_count / len(results) if results else 0.0
    return results, rate, min_rate

def write_grading(evals_path, results, rate):
    grading = {
        'run_id': '2026-07-13-iter-1',
        'proxy_note': 'CRUDE PROXY: description-substring match, not real Claude loader',
        'queries': [
            {'q': r['q'], 'expected': r['expected'],
             'matched': r['matched'], 'fired': r['fired_on_target'],
             'pass': r['passed']}
            for r in results
        ],
        'summary': {
            'pass_rate': rate,
            'pass_count': sum(1 for r in results if r['passed']),
            'total': len(results),
            'by_query': {r['q']: ('pass' if r['passed'] else 'fail') for r in results}
        }
    }
    grading_path = evals_path.parent / 'grading.json'
    grading_path.write_text(
        json.dumps(grading, indent=2, ensure_ascii=False), encoding='utf-8')
    return grading_path

def main():
    if len(sys.argv) < 2:
        print('Usage: python run_skill_eval.py <evals.json>', file=sys.stderr)
        sys.exit(1)
    evals_path = Path(sys.argv[1])
    if not evals_path.exists():
        print(f'ERROR: {evals_path} not found', file=sys.stderr)
        sys.exit(1)
    target_skill = evals_path.parent.parent.parent.name
    descriptions = load_skill_descriptions()  # legacy name retained
    skills = descriptions  # alias for clarity in run_eval
    results, rate, min_rate = run_eval(evals_path, skills, target_skill)
    grading_path = write_grading(evals_path, results, rate)
    pass_n = sum(1 for r in results if r['passed'])
    status = 'PASS' if rate >= min_rate else 'FAIL'
    print(f'=== {target_skill} ===')
    print(f'Pass rate: {rate:.2%} ({pass_n}/{len(results)})')
    print(f'Min required: {min_rate:.2%}')
    print(f'Status: {status}')
    print(f'Grading: {grading_path}')
    if rate < min_rate:
        print('\nFailed queries:')
        for r in results:
            if not r['passed']:
                print(f'  - {r["q"][:60]}: matched={r["matched"]}')

if __name__ == '__main__':
    main()
