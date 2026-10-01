import random

random.seed(42)

# Employees are fixed, named individuals (not randomly regenerated) so they recur
# consistently across orders, like real staff would.

EMPLOYEES = [
    # Sales Executives
    {"role": "Sales Executive", "name": "Ritika Saxena"},
    {"role": "Sales Executive", "name": "Mohd. Asif Khan"},
    {"role": "Sales Executive", "name": "Priyanka Rastogi"},
    {"role": "Sales Executive", "name": "Deepak Chaudhary"},
    {"role": "Sales Executive", "name": "Sana Ansari"},
    {"role": "Sales Executive", "name": "Karan Mehrotra"},
    # Designers
    {"role": "Designer", "name": "Ayesha Siddiqui"},
    {"role": "Designer", "name": "Nikhil Kapoor"},
    {"role": "Designer", "name": "Shalini Awasthi"},
    {"role": "Designer", "name": "Rehan Qureshi"},
    {"role": "Designer", "name": "Meenal Dixit"},
    # Production / Karigars (Bareilly is known for zari-zardozi artisan work)
    {"role": "Production Karigar", "name": "Mohd. Salim Khan"},
    {"role": "Production Karigar", "name": "Rukhsar Begum"},
    {"role": "Production Karigar", "name": "Aslam Ansari"},
    {"role": "Production Karigar", "name": "Naushad Qureshi"},
    {"role": "Production Karigar", "name": "Shabana Parveen"},
    {"role": "Production Karigar", "name": "Irfan Malik"},
    {"role": "Production Karigar", "name": "Zubair Ahmed"},
    {"role": "Production Karigar", "name": "Nasreen Bano"},
    {"role": "Production Head", "name": "Wasim Akram Khan"},
    # Quality Check
    {"role": "Quality Checker", "name": "Sunita Verma"},
    {"role": "Quality Checker", "name": "Farah Siddiqui"},
    {"role": "Quality Checker", "name": "Manoj Tiwari"},
    {"role": "Quality Checker", "name": "Iram Khan"},
    # Packaging
    {"role": "Packaging Staff", "name": "Rekha Pandey"},
    {"role": "Packaging Staff", "name": "Salman Ansari"},
    {"role": "Packaging Staff", "name": "Komal Gupta"},
    # Shipping / Logistics
    {"role": "Shipping Coordinator", "name": "Vivek Srivastava"},
    {"role": "Shipping Coordinator", "name": "Nasir Hussain"},
    {"role": "Shipping Coordinator", "name": "Anjali Bansal"},
]

CITIES_UP = ["Bareilly", "Bareilly", "Bareilly", "Bareilly", "Rampur", "Moradabad", "Pilibhit", "Shahjahanpur"]

JOIN_YEAR_RANGE = (2018, 2025)

def build_employee_table():
    rows = []
    for i, e in enumerate(EMPLOYEES, start=1):
        dept_map = {
            "Sales Executive": "Sales",
            "Designer": "Design Studio",
            "Production Karigar": "Production",
            "Production Head": "Production",
            "Quality Checker": "Quality Control",
            "Packaging Staff": "Packaging",
            "Shipping Coordinator": "Logistics",
        }
        city = random.choice(CITIES_UP)
        join_year = random.randint(*JOIN_YEAR_RANGE)
        join_month = random.randint(1, 12)
        join_day = random.randint(1, 28)
        first_token = e["name"].split()[0].lower().replace(".", "")
        rows.append({
            "employee_id": f"EMP{i:03d}",
            "name": e["name"],
            "role": e["role"],
            "department": dept_map[e["role"]],
            "base_location": city,
            "joining_date": f"{join_year}-{join_month:02d}-{join_day:02d}",
            "phone": f"9{random.randint(100000000,999999999)}",
            "email": f"{first_token}.{e['role'].split()[0].lower()}@siddhisarees.com",
        })
    return rows

if __name__ == "__main__":
    for r in build_employee_table():
        print(r)
