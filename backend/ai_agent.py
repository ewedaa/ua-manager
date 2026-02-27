
import os
import time
import json
import google.generativeai as genai
from django.conf import settings
from django.db import connection

# 1. Setup
if not os.environ.get("GOOGLE_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = "AIzaSy..."  # Use env var in production!

try:
    genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
except:
    pass

class DBTool:
    """Database tool that works with any Django-configured database (SQLite, PostgreSQL, etc.)"""

    def get_table_info(self):
        try:
            with connection.cursor() as cursor:
                # Get table names — works for both SQLite and PostgreSQL
                if connection.vendor == 'sqlite':
                    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                else:
                    cursor.execute("""
                        SELECT table_name FROM information_schema.tables 
                        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
                    """)
                tables = cursor.fetchall()
                schema_str = ""
                for table in tables:
                    table_name = table[0]
                    if table_name.startswith('django_') or table_name.startswith('auth_') or table_name.startswith('pg_'):
                        continue
                    
                    if connection.vendor == 'sqlite':
                        cursor.execute(f"PRAGMA table_info({table_name});")
                        columns = cursor.fetchall()
                        col_strs = [f"{col[1]} ({col[2]})" for col in columns]
                    else:
                        cursor.execute(f"""
                            SELECT column_name, data_type 
                            FROM information_schema.columns 
                            WHERE table_name = %s AND table_schema = 'public';
                        """, [table_name])
                        columns = cursor.fetchall()
                        col_strs = [f"{col[0]} ({col[1]})" for col in columns]
                    
                    schema_str += f"Table: {table_name}\nColumns: {', '.join(col_strs)}\n\n"
                return schema_str
        except Exception as e:
            return f"Error getting schema: {e}"

    def run(self, query):
        try:
            with connection.cursor() as cursor:
                cursor.execute(query)
                results = cursor.fetchmany(50)
                return str(results)
        except Exception as e:
            return f"Error executing query: {e}"

_db = None

def get_db():
    global _db
    if _db is None:
        _db = DBTool()
    return _db

def get_model():
    # Use gemini-1.5-flash as it is reliable and fast
    return genai.GenerativeModel('gemini-1.5-flash')

def retry_with_backoff(func, *args, retries=1, delay=1, **kwargs):
    for attempt in range(retries):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            if attempt == retries - 1: raise e
            time.sleep(delay)

def ask_uniform_agri_agent(question, context=None):
    try:
        model = get_model()
        schema = get_db().get_table_info()
        
        db_vendor = connection.vendor  # 'sqlite' or 'postgresql'
        
        # Step 1: Generate SQL
        sql_prompt = f"""
        You are an elite SQL Architect for 'Uniform Agri Manager'.
        Current System Date: {time.strftime('%Y-%m-%d')}
        Database Engine: {db_vendor}
        Database Schema:
        {schema}
        
        User Context: {context if context else "General Query"}
        User Question: "{question}"
        
        Return ONLY the raw SQL query (no markdown). Use {db_vendor}-compatible syntax.
        """
        
        sql_response = model.generate_content(sql_prompt).text
        sql_query = sql_response.replace('```sql', '').replace('```', '').strip()
        
        # Step 2: Run SQL
        result = get_db().run(sql_query)
        
        # Step 3: Humanize
        answer_prompt = f"""
        User Question: "{question}"
        SQL Query Ran: "{sql_query}"
        Data Result: "{result}"
        
        Instructions:
        1. Analyze the data and explain business implications.
        2. Format lists in markdown.
        3. Tone: Professional and Helpful.
        
        Format (JSON ONLY):
        {{
            "reasoning": "...",
            "answer": "...",
            "action": {{ "type": "navigate", "payload": "/route" }} OR null
        }}
        """
        
        final_response = model.generate_content(answer_prompt).text
        clean_json_str = final_response.replace('```json', '').replace('```', '').strip()
        
        try:
            final_data = json.loads(clean_json_str)
        except:
            final_data = { "answer": final_response, "action": None, "reasoning": "Processing..." }
            
        return final_data
        
    except Exception as e:
        return { "answer": f"Error: {str(e)}", "action": None }

def get_text_suggestion(field_name, current_text, context=""):
    try:
        model = get_model()
        prompt = f"Suggest professional text for {field_name}. Input: {current_text}. Context: {context}"
        return model.generate_content(prompt).text
    except:
        return ""

def generate_ticket_response(ticket_description):
    """Drafts a professional reply for a given support ticket."""
    try:
        model = get_model()
        prompt = f"""
        You are a highly professional, polite support agent at 'Uniform Agri'.
        A farmer has submitted the following ticket issue:
        "{ticket_description}"
        
        Write a concise, helpful, and empathetic initial reply drafted to the farmer. Do not include subject lines or unnecessary headers.
        """
        return model.generate_content(prompt).text
    except Exception as e:
        return f"Error generating reply: {str(e)}"

def summarize_client_profile(client_id):
    """Summarize a client using the AI model based on their DB profile."""
    try:
        db = get_db()
        client_data = db.run(f"SELECT * FROM core_client WHERE id={client_id}")
        invoices = db.run(f"SELECT * FROM core_invoice WHERE client_id={client_id} ORDER BY created_at DESC LIMIT 5")
        tickets = db.run(f"SELECT * FROM core_ticket WHERE client_id={client_id} ORDER BY created_at DESC LIMIT 5")
        
        prompt = f"""
        Provide a very brief 3-4 sentence comprehensive operational summary of this Uniform Agri Client.
        Client Info: {client_data}
        Recent Invoices: {invoices}
        Recent Tickets: {tickets}
        Focus broadly on their subscription status, financial standing, and current support health.
        """
        model = get_model()
        return model.generate_content(prompt).text
    except Exception as e:
        return f"Error summarizing client: {str(e)}"

def generate_business_report():
    try:
        db = get_db()
        total_clients = db.run("SELECT COUNT(*) FROM core_client")
        total_revenue = db.run("SELECT SUM(total_amount) FROM core_invoice WHERE status = 'Paid to Us'")
        
        model = get_model()
        report_prompt = f"""
        Write a CEO-Level Strategic Business Report for Uniform Agri.
        Data Snapshot:
        - Total Clients: {total_clients}
        - Total Revenue: {total_revenue}
        
        Format as markdown with Executive Summary, Financial Performance, and Strategic Recommendations.
        """
        return model.generate_content(report_prompt).text
    except Exception as e:
        return f"Error generating report: {str(e)}"

def analyze_file_content(file_bytes_b64, mime_type, prompt="Describe"):
    try:
        # Gemini supports images/files
        import base64
        image_data = base64.b64decode(file_bytes_b64)
        
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        response = model.generate_content([
            {'mime_type': mime_type, 'data': image_data},
            prompt
        ])
        return response.text
    except Exception as e:
        return f"Error analyzing file: {str(e)}"
