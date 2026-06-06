import os, re

src_dir = r'D:\48h\frontend\src'
classes_to_check = [
    'panel', 'btn', 'hud', 'data-value', 'signal-marker', 'breathe',
    'skeleton', 'page-in', 'decode-in', 'stagger', 'slide-up', 'row-hover',
    'carousel-track', 'wave-bar', 'corners', 'divider', 'starfield',
    'star-layer', 'shooting-star', 'label',
]

for cls in classes_to_check:
    files = []
    for root, dirs, fnames in os.walk(src_dir):
        if 'node_modules' in root:
            continue
        for fname in fnames:
            if fname.endswith(('.tsx', '.ts')):
                path = os.path.join(root, fname)
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    if cls in content:
                        rel = os.path.relpath(path, src_dir).replace('\\', '/')
                        files.append(rel)
    if files:
        print(f"{cls}: USED in {files}")
    else:
        print(f"{cls}: NOT USED")
