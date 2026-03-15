import os
import re

directory = r"c:\Users\Jogender.Yadav1\projects\internal RnD\project_1\services\api\src"

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.ts'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            new_content = content
            
            # Reduce axios timeout
            new_content = re.sub(r'timeout:\s*30000', 'timeout: 5000', new_content)
            
            # Don't block queue operations - add fire-and-forget or try-catch
            
            if content != new_content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {path}")
print("done timeouts")
