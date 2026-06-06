import subprocess, os, shutil

os.chdir(r'D:\48h\frontend')

# Find npm
npm_path = shutil.which('npm') or shutil.which('npm.cmd')
print(f"npm found at: {npm_path}")

if npm_path:
    r = subprocess.run([npm_path, 'run', 'lint'], capture_output=True, text=True)
    with open('lint_result.txt', 'w', encoding='utf-8') as f:
        f.write('STDOUT:\n')
        f.write(r.stdout)
        f.write('\nSTDERR:\n')
        f.write(r.stderr)
        f.write(f'\nReturn code: {r.returncode}\n')
    print(f"Done. Return code: {r.returncode}")
else:
    print("npm not found in PATH")
    # Try common locations
    import glob
    for p in glob.glob(r'C:\Program Files\nodejs\npm*'):
        print(f"  Found: {p}")
    for p in glob.glob(r'C:\Users\*\AppData\Roaming\npm\npm*'):
        print(f"  Found: {p}")
