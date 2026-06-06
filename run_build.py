import subprocess, os, shutil

os.chdir(r'D:\48h\frontend')

npm_path = shutil.which('npm') or shutil.which('npm.cmd')
r = subprocess.run([npm_path, 'run', 'build'], capture_output=True, text=True)
with open('build_result.txt', 'w', encoding='utf-8') as f:
    f.write('STDOUT:\n')
    f.write(r.stdout)
    f.write('\nSTDERR:\n')
    f.write(r.stderr)
    f.write(f'\nReturn code: {r.returncode}\n')
print(f"Done. Return code: {r.returncode}")
