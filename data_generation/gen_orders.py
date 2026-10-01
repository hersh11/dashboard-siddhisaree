import random
from datetime import datetime, timedelta

from gen_employees import build_employee_table
from gen_customers import build_customer_pool

random.seed(101)

TODAY = datetime(2026, 7, 1, 10, 0, 0)
START = datetime(2026, 1, 1)

MONTH_WEIGHTS = {1: 1.30, 2: 1.15, 3: 0.85, 4: 1.10, 5: 1.35, 6: 1.00}

STAGES = ["Order Created", "Designer Assigned", "Design Approved", "Production Assigned",
          "Quality Check", "Packaging", "Shipping", "Delivered"]

PRODUCTS = {
    "Saree": {
        "weight": 45,
        "sub_types": ["Banarasi Silk Saree", "Kanjivaram Silk Saree", "Georgette Saree",
                      "Chiffon Saree", "Organza Saree", "Tussar Silk Saree",
                      "Cotton Silk Saree", "Net Saree", "Crepe Saree", "Satin Saree"],
        "price_range": (4000, 45000),
        "prod_days": (7, 15),
    },
    "Lehenga": {
        "weight": 35,
        "sub_types": ["Bridal Lehenga", "Party Wear Lehenga", "Designer Lehenga",
                      "Sangeet Lehenga", "Net Lehenga", "Velvet Lehenga"],
        "price_range": (9000, 150000),
        "prod_days": (14, 32),
    },
    "Suit/Anarkali": {
        "weight": 12,
        "sub_types": ["Anarkali Suit", "Salwar Suit", "Palazzo Suit", "Sharara Suit"],
        "price_range": (3000, 22000),
        "prod_days": (6, 12),
    },
    "Gown": {
        "weight": 5,
        "sub_types": ["Designer Gown", "Indo-Western Gown", "Reception Gown"],
        "price_range": (6000, 60000),
        "prod_days": (10, 20),
    },
    "Blouse Only": {
        "weight": 3,
        "sub_types": ["Custom Stitched Blouse", "Designer Blouse"],
        "price_range": (1200, 8000),
        "prod_days": (4, 8),
    },
}

WORK_TYPES = ["Zari Work", "Zardozi Work", "Mirror Work", "Thread Embroidery", "Sequin Work",
              "Stone Work", "Gota Patti Work", "Resham Embroidery", "Kundan Work", "Aari Work",
              "Minimal / No Heavy Work"]

FABRICS = ["Banarasi Silk", "Kanjivaram Silk", "Georgette", "Chiffon", "Organza", "Tussar Silk",
           "Cotton Silk", "Net", "Crepe", "Satin", "Velvet", "Raw Silk"]

COLORS = ["Red", "Maroon", "Wine", "Pink", "Baby Pink", "Peach", "Mustard Yellow", "Royal Blue",
          "Navy Blue", "Green", "Bottle Green", "Purple", "Magenta", "Orange", "Gold", "Silver",
          "Black", "Ivory", "Beige", "Turquoise", "Rani Pink", "Coral"]

OCCASIONS = ["Wedding", "Engagement", "Reception", "Sangeet", "Mehendi", "Haldi",
             "Festival (Diwali)", "Festival (Eid)", "Festival (Holi)", "Anniversary",
             "Personal Use", "Gifting", "Family Function", "Ring Ceremony"]

CHANNELS = ["Instagram DM", "Instagram DM", "WhatsApp Business", "Store Walk-in",
            "Facebook Page", "Website Inquiry", "Phone Call", "Referral"]

PRIORITIES = ["Standard"] * 75 + ["Express"] * 18 + ["Rush"] * 7

COURIERS_LOCAL = ["Own Delivery Boy", "Local Courier"]
COURIERS_DOMESTIC = ["BlueDart", "Delhivery", "DTDC", "Ekart"]
COURIERS_INTL = ["DHL Express", "FedEx International", "Aramex"]

CUSTOMER_NOTE_TEMPLATES = [
    "{occasion} hai ghar mein, chahiye ek {color} {product} jo bahut {look} lage. Budget around {budget}.",
    "Need something like what's trending on Instagram — {work} but not too heavy, {color} color preferred.",
    "Bhabhi/behen ki {occasion_lower}, kuch {product_lower} type dikhaiye, range around {budget}.",
    "Want matching blouse piece, prefer {fabric_lower} fabric, {color} ya usse milta julta shade.",
    "Daughter's {occasion_lower}, need {color} {product_lower}, not too flashy, budget {budget}.",
    "Sent a reference picture on WhatsApp — chahiye bilkul waisa hi, {work} ke saath.",
    "Need it urgently for {occasion_lower} on short notice, please suggest fastest option.",
    "Function ke liye chahiye, {color} color mein kuch heavy {work} wala, budget flexible thoda.",
    "First time ordering from you, {relative} ne recommend kiya. Chahiye {color} {product_lower}.",
    "Same as my last order but different color this time — {color} ki jagah is baar.",
    "Chahiye bilkul bridal type, heavy {work}, budget around {budget}, {occasion_lower} hai.",
    "Simple aur elegant chahiye, {color}, zyada bhaari kaam nahi, roz ke function ke liye.",
]

RELATIVES = ["meri bhabhi", "meri cousin", "meri saheli", "meri mummy", "mere husband ke colleague", "meri neighbour"]
LOOKS = ["shiny", "royal", "traditional", "modern", "unique", "bridal type", "elegant"]

DESIGNER_NOTES = [
    "Suggested {fabric} with {work} border as per customer's WhatsApp reference image.",
    "Prepared initial sketch, sent for customer approval via WhatsApp.",
    "Customer requested motif change on pallu, revised design sent — 2nd round.",
    "Design approved on first review, no changes requested.",
    "Discussed blouse pattern separately, boat-neck with back tie-up as requested.",
    "Customer wanted lighter {work}, adjusted design and re-shared.",
    "Reference matched to an existing catalogue piece, customer confirmed with minor tweaks.",
    "Sent 3 fabric swatch options, customer finalised {fabric}.",
]

PRODUCTION_NOTES = [
    "Karigar {name} started {work} on the {product_lower}.",
    "Base fabric cutting and stitching completed, embroidery work in progress.",
    "Delay of 2 days due to complex {work} pattern, informed customer.",
    "Zari border work completed, moving to blouse stitching.",
    "Production on track, no issues reported.",
    "Additional artisan assigned to speed up {work} for rush order.",
    "Customer requested minor size adjustment mid-production, noted and applied.",
]

QC_PASS_NOTES = [
    "Checked stitching, embroidery finishing and fall — all as per approved design. Passed.",
    "Verified against design approval photos, colour and work matched. Passed.",
    "Checked blouse fitting reference and pallu finishing. Passed for packaging.",
    "Minor thread trimming done during check, otherwise passed.",
]

QC_FAIL_NOTES = [
    "Loose thread found on pallu, sent back to production for correction.",
    "Zari work slightly uneven on one side, returned for rework.",
    "Blouse stitching did not match size chart, sent back to karigar.",
    "Colour mismatch with approved swatch noticed, flagged for correction.",
]

PACKAGING_NOTES = [
    "Packed in premium box with tissue wrap and brand tag.",
    "Folded as per saree/lehenga standard, added silica gel pouch for silk items.",
    "Packed with garment cover, ready for dispatch.",
    "Gift wrapping added as customer requested for {occasion_lower} gift.",
]

SHIPPING_NOTES_LOCAL = [
    "Handed over to local delivery boy for same-day Bareilly delivery.",
    "Dispatched via local courier within city.",
]

SHIPPING_NOTES_DOMESTIC = [
    "Shipped via {courier}, tracking ID {tracking}.",
    "Booked with {courier}, customer shared tracking on WhatsApp, ID {tracking}.",
]

SHIPPING_NOTES_INTL = [
    "Shipped internationally via {courier}, tracking ID {tracking}. Customs invoice attached.",
    "Booked international shipment with {courier}, tracking {tracking}, customer informed of approx transit time.",
]

DELIVERED_NOTES = [
    "Delivered successfully, customer confirmed receipt via WhatsApp.",
    "Delivery confirmed, customer shared unboxing photos, very happy with the work.",
    "Delivered on time, customer requested contact for future orders.",
    "Delivered, minor complaint about box handling but product was fine — resolved.",
]

CANCEL_NOTES = [
    "Customer postponed the function, order put on hold then cancelled.",
    "Customer found a cheaper alternative locally, cancelled before production.",
    "Budget mismatch after design finalisation, customer backed out.",
    "Customer unreachable after advance payment reminder, order cancelled after 15 days.",
    "Design not approved even after 3 revisions, customer decided to cancel.",
]

ON_HOLD_NOTES = [
    "Awaiting customer confirmation on final design for over a week.",
    "Customer requested to pause — travelling, will resume in coming weeks.",
    "Balance payment pending from customer, production paused.",
    "Waiting on customer to send correct blouse measurements.",
]


def pick_weighted(d):
    keys = list(d.keys())
    weights = [d[k]["weight"] for k in keys]
    return random.choices(keys, weights=weights)[0]


def random_order_date():
    month = random.choices(list(MONTH_WEIGHTS.keys()), weights=list(MONTH_WEIGHTS.values()))[0]
    day = random.randint(1, 28)
    hour = random.choices(range(10, 20), weights=[6,7,8,9,10,11,10,9,8,6])[0]
    minute = random.randint(0, 59)
    return datetime(2026, month, day, hour, minute)


def gen_tracking(country):
    if country == "India":
        return f"{random.randint(100000000000, 999999999999)}"
    return f"{random.choice(['DHL','FDX','ARX'])}{random.randint(1000000000,9999999999)}"


def build_dataset(n_orders=1060):
    employees = build_employee_table()
    customer_pool = build_customer_pool(780)

    emp_by_role = {}
    for e in employees:
        emp_by_role.setdefault(e["role"], []).append(e)
    sales_execs = emp_by_role["Sales Executive"]
    designers = emp_by_role["Designer"]
    karigars = emp_by_role["Production Karigar"] + emp_by_role["Production Head"]
    qc_staff = emp_by_role["Quality Checker"]
    packers = emp_by_role["Packaging Staff"]
    shippers = emp_by_role["Shipping Coordinator"]

    orders = []
    stage_rows = []
    customer_first_order = {}
    used_customer_ids = []
    next_new_customer_idx = 0

    # pre-generate sorted order dates to make repeat-customer logic time-consistent
    order_dates = sorted(random_order_date() for _ in range(n_orders))

    for i, order_date in enumerate(order_dates, start=1):
        order_id = f"ORD{1000+i}"

        # pick customer: ~32% chance of a repeat customer once pool has been seeded
        if used_customer_ids and random.random() < 0.32:
            customer = random.choice(used_customer_ids)
        else:
            if next_new_customer_idx < len(customer_pool):
                customer = customer_pool[next_new_customer_idx]
                next_new_customer_idx += 1
            else:
                customer = random.choice(customer_pool)
        used_customer_ids.append(customer)

        is_returning = customer["customer_id"] in customer_first_order
        if not is_returning:
            customer_first_order[customer["customer_id"]] = order_date

        category = pick_weighted(PRODUCTS)
        pinfo = PRODUCTS[category]
        sub_type = random.choice(pinfo["sub_types"])
        fabric = random.choice(FABRICS)
        color = random.choice(COLORS)
        work = random.choice(WORK_TYPES)
        occasion = random.choice(OCCASIONS)
        channel = random.choice(CHANNELS)
        priority = random.choice(PRIORITIES)

        min_p, max_p = pinfo["price_range"]
        final_price = random.randint(min_p, max_p)
        final_price = round(final_price / 100) * 100
        budget_str = f"₹{final_price//1000}k" if final_price >= 1000 else f"₹{final_price}"

        sales_exec = random.choice(sales_execs)
        designer = random.choice(designers)
        karigar = random.choice(karigars)
        qc = random.choice(qc_staff)
        packer = random.choice(packers)
        shipper = random.choice(shippers)

        note_template = random.choice(CUSTOMER_NOTE_TEMPLATES)
        customer_note = note_template.format(
            occasion=occasion, occasion_lower=occasion.lower(), color=color,
            product=sub_type, product_lower=sub_type.lower(), look=random.choice(LOOKS),
            budget=budget_str, work=work.lower(), fabric_lower=fabric.lower(),
            relative=random.choice(RELATIVES),
        )

        advance_pct = random.choice([0.3, 0.4, 0.5, 1.0])
        advance_amount = int(final_price * advance_pct)
        payment_status = "Full Paid" if advance_pct == 1.0 else random.choice(["Advance Paid", "Partial Paid"])

        # ----- stage timeline -----
        cancelled = random.random() < 0.04
        cancel_at_stage = random.randint(1, 4) if cancelled else None

        t = {}
        t[1] = order_date  # Order Created
        t[2] = t[1] + timedelta(days=random.choice([0,0,1,1,2]), hours=random.randint(1,8))  # Designer Assigned
        revision_extra = random.choice([0,0,0,2,3,5]) if random.random() < 0.25 else 0
        t[3] = t[2] + timedelta(days=random.randint(1,5) + revision_extra, hours=random.randint(1,6))  # Design Approved

        t[4] = t[3] + timedelta(days=random.choice([0,0,1]), hours=random.randint(1,5))  # Production Assigned

        prod_min, prod_max = pinfo["prod_days"]
        prod_days = random.randint(prod_min, prod_max)
        if priority == "Express":
            prod_days = int(prod_days * 0.7)
        elif priority == "Rush":
            prod_days = int(prod_days * 0.5)
        prod_days = max(prod_days, 3)

        qc_failed = random.random() < 0.08
        t[5] = t[4] + timedelta(days=prod_days, hours=random.randint(1,6))  # Quality Check
        if qc_failed:
            rework_days = random.randint(2,5)
            t[5] = t[5] + timedelta(days=rework_days)  # re-QC after rework

        t[6] = t[5] + timedelta(days=random.choice([0,0,1]), hours=random.randint(1,4))  # Packaging
        t[7] = t[6] + timedelta(days=random.choice([0,1]), hours=random.randint(1,5))  # Shipping

        if customer["country"] == "India" and customer["city"] == "Bareilly":
            transit = random.randint(0,1)
        elif customer["country"] == "India" and customer["state"] == "Uttar Pradesh":
            transit = random.randint(1,3)
        elif customer["country"] == "India":
            transit = random.randint(2,6)
        else:
            transit = random.randint(6,16)
        t[8] = t[7] + timedelta(days=transit, hours=random.randint(1,10))  # Delivered

        # cap progression at TODAY
        assignees = {1: sales_exec, 2: designer, 3: designer, 4: karigar, 5: qc, 6: packer, 7: shipper, 8: shipper}
        stages_completed = []
        for s in range(1, 9):
            if cancelled and cancel_at_stage is not None and s > cancel_at_stage:
                break
            if t[s] > TODAY:
                break
            stages_completed.append(s)

        current_stage_idx = stages_completed[-1] if stages_completed else 1
        if cancelled and cancel_at_stage and current_stage_idx >= cancel_at_stage:
            current_status = "Cancelled"
        elif current_stage_idx == 8:
            current_status = "Delivered"
        elif random.random() < 0.05 and current_stage_idx not in (8,):
            current_status = "On Hold"
        else:
            current_status = "In Progress"

        expected_delivery = t[8].strftime("%Y-%m-%d")

        orders.append({
            "order_id": order_id,
            "customer_id": customer["customer_id"],
            "customer_name": customer["name"],
            "order_date": t[1].strftime("%Y-%m-%d %H:%M"),
            "product_category": category,
            "sub_type": sub_type,
            "fabric": fabric,
            "color": color,
            "work_type": work,
            "occasion": occasion,
            "customer_notes": customer_note,
            "order_channel": channel,
            "priority": priority,
            "quoted_price_inr": final_price,
            "final_price_inr": final_price,
            "advance_amount_inr": advance_amount,
            "balance_amount_inr": final_price - advance_amount,
            "payment_status": payment_status if not cancelled else "Advance Forfeited / Refunded",
            "assigned_sales_exec": sales_exec["name"],
            "expected_delivery_date": expected_delivery,
            "current_stage": STAGES[current_stage_idx-1],
            "current_status": current_status,
            "is_returning_customer": is_returning,
            "customer_city": customer["city"],
            "customer_state": customer["state"],
            "customer_country": customer["country"],
        })

        # ---- stage rows ----
        for s in range(1, 9):
            stage_name = STAGES[s-1]
            emp = assignees[s]
            if s not in stages_completed:
                # not yet reached (or order cancelled before this stage)
                if cancelled and cancel_at_stage and s > cancel_at_stage:
                    status = "Cancelled" if s == cancel_at_stage + 1 else "Not Started"
                    if s != cancel_at_stage + 1:
                        continue
                    note = random.choice(CANCEL_NOTES)
                    stage_rows.append({
                        "order_id": order_id, "stage_sequence": s, "stage_name": stage_name,
                        "assigned_employee": emp["name"], "assigned_role": emp["role"],
                        "start_timestamp": "", "end_timestamp": "",
                        "status": "Cancelled", "notes": note, "image_count": 0,
                        "image_refs": "",
                    })
                    continue
                if s == current_stage_idx + 1 and current_status == "On Hold":
                    stage_rows.append({
                        "order_id": order_id, "stage_sequence": s, "stage_name": stage_name,
                        "assigned_employee": emp["name"], "assigned_role": emp["role"],
                        "start_timestamp": "", "end_timestamp": "",
                        "status": "On Hold", "notes": random.choice(ON_HOLD_NOTES), "image_count": 0,
                        "image_refs": "",
                    })
                continue

            start_ts = t[s]
            end_ts = t[s] if s != 5 or not qc_failed else t[s]
            status = "Completed" if s < 8 else "Completed"
            img_count = 0
            img_refs = ""

            if s == 1:
                note = f"Order created by {emp['name']} after discussion with customer via {channel}."
                img_count = random.randint(0,2)
            elif s == 2:
                note = f"Designer {emp['name']} assigned to the order."
                img_count = random.randint(1,3)
            elif s == 3:
                note = random.choice(DESIGNER_NOTES).format(fabric=fabric, work=work.lower())
                img_count = random.randint(1,4)
            elif s == 4:
                note = f"Production assigned to karigar {emp['name']}."
                img_count = random.randint(0,1)
            elif s == 5:
                if qc_failed:
                    note = random.choice(QC_FAIL_NOTES) + " " + random.choice(QC_PASS_NOTES)
                else:
                    note = random.choice(QC_PASS_NOTES)
                img_count = random.randint(2,5)
            elif s == 6:
                note = random.choice(PACKAGING_NOTES).format(occasion_lower=occasion.lower())
                img_count = random.randint(1,2)
            elif s == 7:
                tracking = gen_tracking(customer["country"])
                if customer["country"] == "India" and customer["city"] == "Bareilly":
                    note = random.choice(SHIPPING_NOTES_LOCAL)
                elif customer["country"] == "India":
                    courier = random.choice(COURIERS_DOMESTIC)
                    note = random.choice(SHIPPING_NOTES_DOMESTIC).format(courier=courier, tracking=tracking)
                else:
                    courier = random.choice(COURIERS_INTL)
                    note = random.choice(SHIPPING_NOTES_INTL).format(courier=courier, tracking=tracking)
                img_count = 1
            elif s == 8:
                note = random.choice(DELIVERED_NOTES)
                img_count = random.randint(0,2)

            if img_count > 0:
                img_refs = "; ".join([f"IMG_{order_id}_{stage_name.replace(' ','')}_{k+1}.jpg" for k in range(img_count)])

            stage_rows.append({
                "order_id": order_id, "stage_sequence": s, "stage_name": stage_name,
                "assigned_employee": emp["name"], "assigned_role": emp["role"],
                "start_timestamp": start_ts.strftime("%Y-%m-%d %H:%M"),
                "end_timestamp": end_ts.strftime("%Y-%m-%d %H:%M"),
                "status": status, "notes": note, "image_count": img_count,
                "image_refs": img_refs,
            })

    return employees, customer_pool, orders, stage_rows


if __name__ == "__main__":
    emp, cust, orders, stages = build_dataset(50)
    print(len(orders), len(stages))
    print(orders[0])
    print(stages[0])
