import subprocess, json, sys

repo = "ABL312/time_space"
for num in [39, 40, 41, 42]:
    # Get issue body
    r = subprocess.run(['gh', 'api', f'repos/{repo}/issues/{num}'], capture_output=True)
    issue = json.loads(r.stdout)
    
    # Get comments
    r2 = subprocess.run(['gh', 'api', f'repos/{repo}/issues/{num}/comments'], capture_output=True)
    comments = json.loads(r2.stdout)
    
    with open(f'issue{num}.json', 'w', encoding='utf-8') as f:
        json.dump({
            'title': issue.get('title', ''),
            'body': issue.get('body', ''),
            'state': issue.get('state', ''),
            'comments': [{'author': c['user']['login'], 'body': c['body']} for c in comments]
        }, f, ensure_ascii=False, indent=2)
    
    print(f"Saved issue{num}.json")
