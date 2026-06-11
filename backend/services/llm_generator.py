import os
import json
import google.generativeai as genai
from services.excel_lookup import lookup_insurance_details

def generate_insurance_answer(query: str, retrieved_context: list):
    if not retrieved_context:
        return "Not mentioned in the document. No relevant context found."
        
    context_str = "\n\n".join([f"Document: {c['document_name']} | Page {c['page_number']}:\n{c['content']}" for c in retrieved_context])
    
    prompt = f"""
    You are an expert insurance AI assistant. Answer the user's question based ONLY on the provided context.
    
    Context from Insurance Documents:
    {context_str}
    
    Rules:
    - Answer ONLY from the given context.
    - Do NOT assume or generate information outside the document.
    - If the answer is not present, respond with: "Not mentioned in the document."
    - Always include the exact clause from the document as a reference.
    - Be precise, professional, and easy to understand.
    - Highlight important conditions such as: Waiting periods, Exclusions, Coverage limits, Eligibility conditions.
    - Keep answer under 150 words unless needed.
    - If multiple clauses are relevant, combine them logically.
    - If the answer depends on conditions, clearly explain them.
    - Do not repeat unnecessary text.
    
    Response Format:
    <clear and concise explanation>
    Reference: <exact clause from the document>
    Page: <page number if available>
    Additionally: <conditions, exclusions, or combined clauses>
    
    User Question: {query}
    """
    
    # Using Gemini 2.5 Flash as latest supported model
    model = genai.GenerativeModel('gemini-2.5-flash')
    response = model.generate_content(prompt)
    text = response.text
    if text.startswith('Answer: '):
        text = text[8:]
    elif text.startswith('Answer:\n'):
        text = text[8:]
    return text

def extract_document_details(document_name: str, retrieved_context: list) -> dict:
    if not retrieved_context:
        return {
            "insurance_company": "Unknown",
            "insured_name": "Unknown",
            "plan_type": "Unknown",
            "premium": "Unknown",
            "sum_insured": "Unknown",
            "start_date": "Unknown",
            "end_date": "Unknown",
            "key_clauses": [],
            "policy_category": "Other",
            "family_members": [],
            "free_medical_checkup": "Unknown",
            "city": "Unknown",
            "pincode": "Unknown",
            "renewal_discounts": []
        }
        
    context_str = "\n\n".join([f"Page {c['page_number']}:\n{c['content']}" for c in retrieved_context])
    
    prompt = f"""
    You are an expert insurance data extractor. Extract the basic details from the provided document chunks.
    
    Context from Document ({document_name}):
    {context_str}
    
    Extract the following details:
    1. Insurance Company (Name of the insurance provider, e.g., ICICI Lombard, Star Health, etc.)
    2. Insured Name (Name of the primary insured person or company)
    3. Product Name (Extract the overarching product name, e.g., "Health AdvantEdge", "Optima Restore". If not found, use "Unknown").
    4. Plan Name (Extract the specific plan name, variant, or tier, e.g., "Top Up Plan B", "Gold". If not found or if the same as product name, use "Unknown").
    4. Sum Insured (This is CRITICAL. Look everywhere including tables, previous policy details, base cover, or any numerical value associated with the policy limit. E.g., 200000, 500000. Do not return "Not Found" if a past sum insured is listed; just extract the most recent one).
    5. Premium (The total premium paid or payable for the policy, usually written as Total Premium, Premium Amount, or Net Premium. Include the currency symbol if present).
    6. Start Date (Policy Inception Date)
    7. End Date (Policy Expiration Date)
    8. Inclusions (Extract ALL cover names from the "Covers" or "Benefits" tables. You MUST extract EVERY SINGLE cover listed across all pages (e.g., Domestic road ambulance, Donor expenses, etc.). DO NOT miss any. DO NOT include explanations or any text after a hyphen/dash. ONLY return the exact cover names).
    9. Exclusions (First, identify the policy type (e.g., Health, Motor, Life). You MUST extract EVERY SINGLE exclusion, limitation, and waiting period explicitly listed in the policy (maximum 3 to 5 words per exclusion, e.g., 'Vehicle class mismatch', 'Organized racing'). Secondly, dynamically analyze what standard coverages SHOULD be in this specific type of policy but are missing. List these missing coverages as exclusions. Extract as many as you can find without any limit!).
    10. Policy Category (Determine if this is "Health", "Life", "Motor", "Property", or "Other").
    11. Family Members (List ONLY the individuals explicitly covered by the policy for health benefits, including their Name and Age. CRITICAL: Do NOT include Nominees or emergency contacts in this list. If a person is only listed as a Nominee, skip them entirely).
    12. Free Medical Checkup (Does the policy explicitly mention a Free Medical Checkup or Health Checkup? "Yes", "No", or "Unknown").
    13. City (Extract the city from the insured's address).
    14. Pincode (Extract the 6-digit pincode or postal code from the insured's address).
    15. Contact Details (Extract phone numbers, email addresses, website URLs, and the insurance company's official address/registered office address. CRITICAL: ONLY extract the insurance company's official support contacts. Do NOT extract the customer's personal phone number or email. Do NOT extract any masked/redacted details containing asterisks like '99******01' or 'AS****@YAHOO.COM'. Remove any duplicate phone numbers and emails).
    
    If any detail is not found, use "Not Found" or "Unknown". For both inclusions and exclusions, you MUST NOT return an empty array. If you find fewer than 5 explicit inclusions, you MUST infer and append standard industry inclusions based on the policy type (e.g., In-patient hospitalization for Health, Third-party liability for Motor). For exclusions, if you find fewer than 5 explicit exclusions in the text, you MUST intelligently infer and list standard industry exclusions that are specifically relevant to the policy type (e.g., Pre-existing conditions for Health, Drunk driving for Motor) so that the final list is contextual and comprehensive.
    
    Return the output STRICTLY as a valid JSON object matching exactly this schema, without markdown formatting or code blocks:
    {{
        "insurance_company": "string",
        "insured_name": "string",
        "product_name": "string",
        "plan_name": "string",
        "sum_insured": "string",
        "premium": "string",
        "start_date": "string",
        "end_date": "string",
        "inclusions": ["string"],
        "exclusions": ["string"],
        "policy_category": "string",
        "family_members": [{{"name": "string", "age": 0}}],
        "free_medical_checkup": "string",
        "city": "string",
        "pincode": "string",
        "contact_details": {{
            "phone": ["string"],
            "email": ["string"],
            "website": ["string"],
            "address": "string"
        }}
    }}
    """
    
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    try:
        response = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
        details = json.loads(response.text)
        # Avoid printing details directly to prevent UnicodeEncodeError on Windows terminal
        # with characters like the Rupee symbol (₹)
        

        # Default initialization for renewal discounts
        details["renewal_discounts"] = []
        
        # Lookup additional details from excel if company and plan are found
        company = details.get("insurance_company", "Unknown")
        plan = details.get("plan_type", "Unknown")
        
        lookup_result = lookup_insurance_details(company, plan)
        if lookup_result:
            details["renewal_discounts"] = lookup_result["renewal_discounts"]
            # Override free medical checkup with excel data if available and not 'Unknown'
            if lookup_result["free_medical_checkup"] != 'Unknown':
                details["free_medical_checkup"] = lookup_result["free_medical_checkup"]
                
        return details
    except Exception as e:
        print(f"LLM Generation Error: {e}")
        raise Exception(f"Failed to generate insights: {str(e)}")
