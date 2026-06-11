import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def register_user(email, password, full_name):
    res = supabase.auth.sign_up({
        "email": email,
        "password": password,
        "options": {
            "data": {
                "full_name": full_name
            }
        }
    })
    return res

def login_user(email, password):
    res = supabase.auth.sign_in_with_password({
        "email": email,
        "password": password
    })
    return res

def get_user_by_token(token):
    res = supabase.auth.get_user(token)
    return res.user

def get_chat_sessions(user_id):
    res = supabase.table("chat_sessions").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return res.data

def create_chat_session(user_id, session_name):
    res = supabase.table("chat_sessions").insert({
        "user_id": user_id,
        "session_name": session_name
    }).execute()
    return res.data[0]

def get_chat_messages(session_id):
    res = supabase.table("chat_messages").select("*").eq("session_id", session_id).order("created_at", desc=False).execute()
    return res.data

def add_chat_message(session_id, msg_type, text, time, is_archived=False):
    res = supabase.table("chat_messages").insert({
        "session_id": session_id,
        "type": msg_type,
        "text": text,
        "time": time,
        "is_archived": is_archived
    }).execute()
    return res.data[0]

def get_archived_insights(user_id):
    res = supabase.table("archived_insights").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return res.data

def add_archived_insight(user_id, query, response, document_name):
    res = supabase.table("archived_insights").insert({
        "user_id": user_id,
        "query": query,
        "response": response,
        "document_name": document_name
    }).execute()
    return res.data[0]

def delete_archived_insight(insight_id):
    res = supabase.table("archived_insights").delete().eq("id", insight_id).execute()
    return res.data
