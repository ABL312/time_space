import subprocess, os

os.chdir(r'D:\48h')

# Stage all changes
subprocess.run(['git', 'add', '-A'])

# Check status
r = subprocess.run(['git', 'status', '--short'], capture_output=True, text=True)
print("Changed files:")
print(r.stdout)

# Commit
msg = """refactor: Card a11y keyboard + CSS cleanup + features/ modules + hooks fixes (#39 #40 #42)

#39: Card interactive now handles Enter/Space keyboard events for a11y
#39: Removed legacy .panel/.btn/.signal-marker CSS, added --space-* tokens
#40: Created feature module barrel exports (capsules/map/ar/profile/collections/recommend)
#40: useAPIWithRetry now uses unified client.ts instead of raw fetch
#42: Fixed 3 React hooks warnings (ARScene ref pattern, useApiWithTimeout useCallback, CapsuleDetailPage getState)
#42: Separated three.js into manual chunk 'three-vendor' for better caching"""

r2 = subprocess.run(['git', 'commit', '-m', msg], capture_output=True, text=True)
print("\nCommit result:")
print(r2.stdout)
print(r2.stderr)

# Push
r3 = subprocess.run(['git', 'push'], capture_output=True, text=True)
print("\nPush result:")
print(r3.stdout)
print(r3.stderr)
print(f"Push return code: {r3.returncode}")
