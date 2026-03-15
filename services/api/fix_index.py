import re

path = r"c:\Users\Jogender.Yadav1\projects\internal RnD\project_1\apps\user-app\app\(tabs)\home\index.tsx"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

text = re.sub(r"overflow:\s*['\"]scroll['\"]", "overflow: 'hidden'", text)
text = text.replace("position: 'zIndex'", "position: 'absolute'")

with open(path, "w", encoding="utf-8") as f:
    f.write(text)
print("done")
