import pandas as pd
import os

EXCEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'health_insurance_plans name.xlsx')

def lookup_insurance_details(company_name, plan_name):
    if not plan_name or plan_name == "Unknown":
        return None
        
    if not os.path.exists(EXCEL_PATH):
        print(f"Excel file not found at {EXCEL_PATH}")
        return None
        
    try:
        df = pd.read_excel(EXCEL_PATH)
        # Drop rows where Insurance Company is NaN
        df = df.dropna(subset=['Insurance Company', 'Plan Name'])
        
        import difflib
        
        # We try to match company_name and plan_name (case insensitive, partial match)
        company_lower = str(company_name).lower().strip() if company_name else ""
        plan_lower = str(plan_name).lower().strip()
        
        match = None
        best_score = 0
        
        for index, row in df.iterrows():
            row_company = str(row['Insurance Company']).lower()
            row_plan = str(row['Plan Name']).lower()
            
            # Match company if it's provided and not 'Unknown'/'Not Found'
            company_match = True
            if company_name and str(company_name).lower() not in ["unknown", "not found", "none", ""]:
                company_match = (company_lower in row_company or row_company in company_lower)
                
            if company_match:
                # Calculate similarity for plan name
                score = difflib.SequenceMatcher(None, plan_lower, row_plan).ratio()
                
                # Boost score if it's a substring match
                if plan_lower in row_plan or row_plan in plan_lower:
                    score += 0.5
                    
                if score > best_score and score > 0.6:
                    best_score = score
                    match = row
        
        if match is not None:
            discounts = []
            
            def add_discount(term, val):
                if pd.notna(val) and str(val).strip().lower() != 'no discount':
                    # Ensure it is a string representation
                    val_str = str(val).strip()
                    if isinstance(val, float) and val < 1.0:
                        val_str = f"{int(val * 100)}%"
                    discounts.append({"term": term, "discount": val_str})

            add_discount("2 Years", match.get('2 Years Discount'))
            add_discount("3 Years", match.get('3 Years Discount'))
            add_discount("5 Years", match.get('5 Years Discount'))
            
            free_checkup = str(match.get('Free Medical Checkup', 'Unknown')).strip()
            
            return {
                "renewal_discounts": discounts,
                "free_medical_checkup": free_checkup if free_checkup.lower() != 'nan' else 'Unknown'
            }
            
    except Exception as e:
        print(f"Error reading excel: {e}")
        
    return None
