import zipfile
import os

dist_dir = os.path.join('frontend', 'dist')
if os.path.exists(dist_dir):
    with zipfile.ZipFile('dist.zip', 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(dist_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, dist_dir)
                zipf.write(full_path, rel_path)
    size_mb = os.path.getsize('dist.zip') / (1024 * 1024)
    print(f'dist.zip created successfully: {size_mb:.2f} MB')
else:
    print('dist directory not found')
