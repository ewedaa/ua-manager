import google.generativeai as genai
import os

os.environ["GOOGLE_API_KEY"] = "AIzaSyAJSbmnDr0rMtRxCg5dvxGAMk6_RwHZaSs"
genai.configure(api_key=os.environ["GOOGLE_API_KEY"])

with open('gemini_pro_check.txt', 'w', encoding='utf-8') as f:
    try:
        m = genai.GenerativeModel("gemini-pro")
        response = m.generate_content("Hello")
        f.write(f"SUCCESS: {response.text}\n")
    except Exception as e:
        f.write(f"ERROR: {e}\n")
