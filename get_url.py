import urllib.request
import re

try:
    html = urllib.request.urlopen("https://mindbot-gold.vercel.app/").read().decode("utf-8")
    js_files = re.findall(r'src="(/assets/[^"]+\.js)"', html)
    print("JS Files:", js_files)
    
    for js in js_files:
        js_url = "https://mindbot-gold.vercel.app" + js
        print(f"\\n--- {js} ---")
        js_content = urllib.request.urlopen(js_url).read().decode("utf-8")
        # Look for typical render URLs or vercel backend URLs
        matches = re.findall(r'https://[a-zA-Z0-9-]+\.onrender\.com', js_content)
        if matches:
            print("Found backend URL:", set(matches))
        
        matches2 = re.findall(r'https://[^"\']+', js_content)
        # Filter out common frontend URLs to find api base url
        api_urls = [m for m in matches2 if "api" in m.lower() or "mindbot" in m.lower()]
        print("Possible API URLs:", set(api_urls))
except Exception as e:
    print("Error:", e)
