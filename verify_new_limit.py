import requests
import time

AGENT2_URL = "http://localhost:8010/api/v1/telemetry"

def test_new_threshold():
    print("\n--- Testing Redirect Threshold (5 Requests in 5s) ---")
    session = requests.Session()
    
    # Burst of 6 requests to be sure
    print("Sending a burst of 6 rapid requests...")
    results = []
    for i in range(6):
        resp = session.post(AGENT2_URL, json={
            "event": "hit",
            "path": "/DVWA-master/login.php",
            "host": "localhost",
            "full_url": "http://localhost/DVWA-master/login.php"
        })
        results.append(resp.json().get('action'))
    
    for i, res in enumerate(results):
        print(f"Request {i+1}: {res}")
    
    if "redirect" in results:
        print("SUCCESS: Redirection triggered during burst.")
    else:
        print("FAILURE: No redirection triggered. Check Agent 1 logs for score/timestamps.")

if __name__ == "__main__":
    test_new_threshold()
