import subprocess, os
os.chdir(r'D:\48h')
if os.path.exists('cleanup.py'):
    os.remove('cleanup.py')
subprocess.run(['git', 'add', '-A'])
subprocess.run(['git', 'commit', '-m', 'chore: remove cleanup script'])
r = subprocess.run(['git', 'push'], capture_output=True, text=True)
print(f"Push: return code {r.returncode}")
