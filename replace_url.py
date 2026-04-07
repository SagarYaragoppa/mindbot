import os
import re

directory = r'c:\Dev\mindbot\frontend\src'

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            if 'http://localhost:8000' in content:
                content = re.sub(r'`http://localhost:8000([^`]*)`', r'`${import.meta.env.VITE_API_BASE_URL}\1`', content)
                content = re.sub(r'\'http://localhost:8000([^\']*)\'', r'`${import.meta.env.VITE_API_BASE_URL}\1`', content)
                content = re.sub(r'\"http://localhost:8000([^\"]*)\"', r'`${import.meta.env.VITE_API_BASE_URL}\1`', content)

                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f'Updated {filepath}')
