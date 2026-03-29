import zipfile
import xml.etree.ElementTree as ET
import io

docx_path = r'c:\Dev\mindbot\doc\mb_project.docx'
with zipfile.ZipFile(docx_path) as docx:
    xml_content = docx.read('word/document.xml')

tree = ET.fromstring(xml_content)
namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
paragraphs = []
for p in tree.findall('.//w:p', namespaces):
    texts = [t.text for t in p.findall('.//w:t', namespaces) if t.text]
    if texts:
        paragraphs.append(''.join(texts))

with io.open('temp_doc.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(paragraphs))
