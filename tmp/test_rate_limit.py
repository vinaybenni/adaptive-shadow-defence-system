import requests
import time

url = "http://localhost:8010/api/v1/telemetry"
payload = {
    "event": "hit",
    "client_ip": "127.0.0.1",
    "path": "/DVWA-master/login.php",
    "host": "localhost",
    "full_url": "http://localhost/DVWA-master/login.php",
    "method": "GET"
}

print("Sending 6 requests (one per second) to Agent 2...")
for i in range(1, 7):
    try:
        r = requests.post(url, json=payload, timeout=5)
        print(f"Request {i}: Status {r.status_code}, Response {r.json()}")
    except Exception as e:
        print(f"Request {i}: Error {e}")
    time.sleep(1.1)
