import requests
import time

AGENT2_URL = "http://localhost:8010/api/v1/telemetry"
STATS_URL = "http://localhost:8010/api/v1/stats"

def get_stats():
    try:
        r = requests.get(STATS_URL)
        return r.json()['stats']
    except Exception as e:
        print(f"Stats Error: {e}")
        return None

def test_filtering():
    print("--- Testing Shadow URL Filtering ---")
    initial_stats = get_stats()
    if not initial_stats: return
    
    # Send telemetry for Shadow URL
    print("Sending Shadow URL telemetry (should be ignored)...")
    resp = requests.post(AGENT2_URL, json={
        "event": "hit",
        "path": "/DVWA-rnaster/login.php",
        "host": "localhost",
        "full_url": "http://localhost/DVWA-rnaster/login.php"
    })
    print(f"Shadow Response: {resp.json()}")
    
    final_stats = get_stats()
    if final_stats['totalRequests'] == initial_stats['totalRequests']:
        print("SUCCESS: Shadow URL hit was filtered out.")
    else:
        print(f"FAILURE: Total Requests increased from {initial_stats['totalRequests']} to {final_stats['totalRequests']}")

def test_threshold():
    print("\n--- Testing Redirect Threshold (Score > 90) ---")
    session = requests.Session()
    
    # Send 3 rapid requests
    print("Sending 3 rapid requests to trigger high frequency (score 95)...")
    for i in range(3):
        resp = session.post(AGENT2_URL, json={
            "event": "hit",
            "path": "/DVWA-master/login.php",
            "host": "localhost",
            "full_url": "http://localhost/DVWA-master/login.php"
        })
        data = resp.json()
        print(f"Request {i+1} - Action: {data.get('action')}, Status: {data.get('status')}")
    
    if data.get('action') == "redirect":
        print("SUCCESS: Redirected when score > 90.")
    else:
        print("FAILURE: Did not redirect. Score might not have exceeded 90.")

if __name__ == "__main__":
    test_filtering()
    test_threshold()
