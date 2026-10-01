import random

HINDU_MALE = ["Rohit","Amit","Rajesh","Suresh","Vikram","Ankit","Deepak","Manish","Saurabh","Vivek",
    "Gaurav","Nikhil","Pankaj","Arjun","Karan","Rahul","Sandeep","Ashish","Puneet","Varun",
    "Aditya","Mohit","Yash","Abhishek","Sanjay","Ramesh","Dinesh","Naveen","Praveen","Kunal",
    "Tarun","Anil","Sunil","Rajeev","Alok","Vishal","Vinay","Ajay","Vijay","Harish"]

HINDU_FEMALE = ["Priya","Neha","Pooja","Anjali","Kavita","Sunita","Meena","Ritu","Swati","Shweta",
    "Nisha","Ekta","Divya","Preeti","Anita","Kiran","Rekha","Sarita","Manisha","Deepika",
    "Aarti","Shalini","Vandana","Rachna","Komal","Payal","Ishita","Riya","Simran","Tanvi",
    "Neelam","Sonal","Bharti","Seema","Usha","Rani","Kajal","Nidhi","Alka","Renu"]

MUSLIM_MALE = ["Mohd. Salim","Arif","Shakeel","Naushad","Irfan","Zubair","Rizwan","Faisal","Aslam",
    "Sameer","Imran","Wasim","Javed","Aamir","Shahid","Danish","Kamran","Adil","Owais","Sohail"]

MUSLIM_FEMALE = ["Rukhsar","Shabana","Nazia","Farah","Saira","Nasreen","Afshan","Iram","Rehana",
    "Yasmin","Sultana","Zeenat","Shabnam","Naaz","Ambreen","Farheen","Uzma","Nikhat","Tabassum","Alina"]

SIKH_MALE = ["Gurpreet","Harpreet","Jaspreet","Manpreet","Amarjeet","Baljeet","Jagdeep","Rajwinder"]
SIKH_FEMALE = ["Simran","Harleen","Navpreet","Amandeep","Ravneet","Jasleen"]

SURNAME_HINDU = ["Sharma","Verma","Gupta","Agarwal","Mishra","Tiwari","Pandey","Srivastava",
    "Chaudhary","Yadav","Singh","Rastogi","Khandelwal","Goel","Bansal","Saxena","Dixit",
    "Awasthi","Kapoor","Malhotra","Jain","Aggarwal","Mehrotra","Sinha","Trivedi","Bhatia","Arora"]

SURNAME_MUSLIM = ["Khan","Ansari","Siddiqui","Qureshi","Ahmed","Hussain","Malik","Raza","Beg"]

SURNAME_SIKH = ["Singh","Kaur"]

CITIES_LOCAL_UP = [
    ("Bareilly","Uttar Pradesh"), ("Bareilly","Uttar Pradesh"), ("Bareilly","Uttar Pradesh"),
    ("Bareilly","Uttar Pradesh"), ("Bareilly","Uttar Pradesh"),
    ("Rampur","Uttar Pradesh"), ("Moradabad","Uttar Pradesh"), ("Pilibhit","Uttar Pradesh"),
    ("Shahjahanpur","Uttar Pradesh"), ("Badaun","Uttar Pradesh"), ("Rudrapur","Uttarakhand"),
]

CITIES_PAN_INDIA = [
    ("Lucknow","Uttar Pradesh"), ("Kanpur","Uttar Pradesh"), ("Agra","Uttar Pradesh"),
    ("Meerut","Uttar Pradesh"), ("Ghaziabad","Uttar Pradesh"), ("Noida","Uttar Pradesh"),
    ("New Delhi","Delhi"), ("Mumbai","Maharashtra"), ("Pune","Maharashtra"),
    ("Bangalore","Karnataka"), ("Hyderabad","Telangana"), ("Chennai","Tamil Nadu"),
    ("Kolkata","West Bengal"), ("Jaipur","Rajasthan"), ("Ahmedabad","Gujarat"),
    ("Surat","Gujarat"), ("Indore","Madhya Pradesh"), ("Bhopal","Madhya Pradesh"),
    ("Patna","Bihar"), ("Chandigarh","Chandigarh"), ("Dehradun","Uttarakhand"),
]

CITIES_INTL = [
    ("Edison","New Jersey","USA"), ("Sugar Land","Texas","USA"), ("Fremont","California","USA"),
    ("Jersey City","New Jersey","USA"), ("Chicago","Illinois","USA"),
    ("Leicester","England","UK"), ("Birmingham","England","UK"), ("Southall","London","UK"),
    ("Toronto","Ontario","Canada"), ("Surrey","British Columbia","Canada"), ("Brampton","Ontario","Canada"),
    ("Dubai","Dubai","UAE"), ("Sharjah","Sharjah","UAE"), ("Abu Dhabi","Abu Dhabi","UAE"),
    ("Sydney","New South Wales","Australia"), ("Melbourne","Victoria","Australia"),
    ("Singapore","Singapore","Singapore"), ("Auckland","Auckland","New Zealand"),
]

CUSTOMER_TYPES = ["Retail"]*85 + ["Boutique Reseller"]*10 + ["Wedding Planner"]*5
ACQ_SOURCES = ["Instagram DM","Instagram DM","WhatsApp Referral","Walk-in Store","Facebook Page",
    "Website Inquiry","Word of Mouth","Wedding Exhibition","Phone Enquiry"]

def random_name():
    religion = random.choices(["hindu","muslim","sikh"], weights=[62,32,6])[0]
    gender = random.choice(["m","f"])
    if religion == "hindu":
        first = random.choice(HINDU_MALE if gender=="m" else HINDU_FEMALE)
        last = random.choice(SURNAME_HINDU)
    elif religion == "muslim":
        first = random.choice(MUSLIM_MALE if gender=="m" else MUSLIM_FEMALE)
        last = random.choice(SURNAME_MUSLIM)
    else:
        first = random.choice(SIKH_MALE if gender=="m" else SIKH_FEMALE)
        last = "Kaur" if gender=="f" else "Singh"
    return f"{first} {last}"

def build_customer_pool(n, seed=7):
    random.seed(seed)
    customers = []
    used_names = set()
    for i in range(1, n+1):
        # 65% local Bareilly/UP, 25% pan-India, 10% international NRI
        loc_type = random.choices(["local","pan_india","intl"], weights=[62,28,10])[0]
        name = random_name()
        while name in used_names:
            name = random_name()
        used_names.add(name)

        if loc_type == "local":
            city, state = random.choice(CITIES_LOCAL_UP)
            country = "India"
        elif loc_type == "pan_india":
            city, state = random.choice(CITIES_PAN_INDIA)
            country = "India"
        else:
            city, state, country = random.choice(CITIES_INTL)

        customers.append({
            "customer_id": f"CUST{i:04d}",
            "name": name,
            "phone": f"+91-{random.randint(7000000000,9999999999)}" if country=="India" else f"+{random.choice([1,44,971,61,65,64])}-{random.randint(1000000000,9999999999)}",
            "email": f"{name.lower().replace(' ','.').replace('.','',1 if name.startswith('Mohd') else 0)}{random.randint(1,999)}@{random.choice(['gmail.com','yahoo.com','outlook.com','hotmail.com'])}",
            "city": city,
            "state": state,
            "country": country,
            "customer_type": random.choice(CUSTOMER_TYPES),
            "acquisition_source": random.choice(ACQ_SOURCES),
            "is_nri": country != "India",
        })
    return customers

if __name__ == "__main__":
    cs = build_customer_pool(20)
    for c in cs[:10]:
        print(c)
