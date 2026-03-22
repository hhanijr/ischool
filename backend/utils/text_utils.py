import re
from typing import List, Dict

def parse_chapters(text: str) -> List[Dict[str, str]]:
    """
    Parse text into chapters using Markdown '## ' headers as boundaries.

    Returns a list of {'title': ..., 'content': ...} in order.
    Falls back to splitting by double-newlines and generates generic titles when no headers found.
    """
    if not text:
        return []

    # Normalize CRLF
    txt = text.replace('\r\n', '\n')

    # Find headers like '^## Title' using multiline mode
    header_re = re.compile(r'^##\s*(.+)$', re.MULTILINE)
    matches = list(header_re.finditer(txt))

    chapters = []
    if matches:
        for i, m in enumerate(matches):
            title = m.group(1).strip()
            start = m.end()
            end = matches[i+1].start() if i+1 < len(matches) else len(txt)
            content = txt[start:end].strip()
            chapters.append({'title': title, 'content': content})
        return chapters

    # Fallback: split by double newlines
    parts = [p.strip() for p in txt.split('\n\n') if p.strip()]
    if not parts:
        return []

    # If only a few parts, keep them; generate generic titles
    chapters = []
    for i, p in enumerate(parts):
        chapters.append({'title': f'Part {i+1}', 'content': p})

    return chapters
