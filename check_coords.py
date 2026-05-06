import sqlite3

conn = sqlite3.connect('instance/soil_smart_pilot.db')
cursor = conn.cursor()
cursor.execute("SELECT id, email, location, latitude, longitude FROM users WHERE email = 'testdelhi@example.com'")
row = cursor.fetchone()
if row:
    print(f"ID: {row[0]}")
    print(f"Email: {row[1]}")
    print(f"Location: {row[2]}")
    print(f"Latitude: {row[3]}")
    print(f"Longitude: {row[4]}")
else:
    print("User not found")
conn.close()
