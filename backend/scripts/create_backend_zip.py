import zipfile
import os

zip_path = 'backend.zip'
bak_path = 'backend_old.zip'

if os.path.exists('backend_old.zip'):
    try:
        os.remove('backend_old.zip')
    except:
        pass

if os.path.exists(zip_path):
    try:
        os.replace(zip_path, bak_path)
    except Exception as e:
        print('Could not backup old zip:', e)

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk('backend'):
        if '.git' in root or '__pycache__' in root:
            continue
        for file in files:
            if file.endswith('.log'):
                continue
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, '.')
            zipf.write(full_path, rel_path)

size_mb = os.path.getsize(zip_path) / (1024 * 1024)
print(f'Successfully created backend.zip: {size_mb:.2f} MB')
