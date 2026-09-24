import re
import subprocess

with open('frontend/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find the module script
matches = list(re.finditer(r'<script type="module">(.*?)</script>', html, re.DOTALL))
print(f"Found {len(matches)} module scripts")
if matches:
    js = matches[0].group(1)
    with open('backend/extracted.js', 'w', encoding='utf-8') as f_out:
        f_out.write(js)
    print("Wrote backend/extracted.js, checking syntax with node...")
    res = subprocess.run(['node', '--check', 'backend/extracted.js'], capture_output=True, text=True)
    print("Node check exit code:", res.returncode)
    print("Node stdout:", res.stdout)
    print("Node stderr:", res.stderr)
