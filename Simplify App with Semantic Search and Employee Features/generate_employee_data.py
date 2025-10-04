import json
import random
from faker import Faker

fake = Faker()

def generate_employee_data(num_employees=20):
    employees = []
    for i in range(num_employees):
        employee = {
            "id": i + 1,
            "name": fake.name(),
            "email": fake.email(),
            "phone_number": fake.phone_number(),
            "job_title": fake.job(),
            "department": random.choice(["HR", "Engineering", "Marketing", "Sales", "Finance", "Operations"]),
            "hire_date": fake.date_between(start_date="-5y", end_date="today").strftime("%Y-%m-%d"),
            "salary": round(random.uniform(50000, 150000), 2),
            "address": fake.address(),
            "skills": random.sample(["Python", "JavaScript", "SQL", "Cloud Computing", "Project Management", "Data Analysis", "Machine Learning", "Communication", "Teamwork"], k=random.randint(2, 5))
        }
        employees.append(employee)
    return employees

if __name__ == "__main__":
    employee_data = generate_employee_data(20)
    with open("synthetic_employee_data.json", "w") as f:
        json.dump(employee_data, f, indent=4)
    print("Generated 20 synthetic employee data entries in synthetic_employee_data.json")

