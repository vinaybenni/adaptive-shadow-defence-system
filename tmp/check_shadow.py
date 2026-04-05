import redis
import json
import time
import requests

r = redis.Redis()
p = r.pubsub()
p.subscribe('shadow.activity')
print("Subscribed! Listening for 10 seconds...")

# Trigger a hit via curl
def trigger_hit():
    print("Triggering shadow hit...")
    payload = {
        'event': 'hit',
        'path': '/DVWA-rnaster/login.php',
        'full_url': 'http://localhost/DVWA-rnaster/login.php',
        'host': 'localhost',
        'user_agent': 'python-test-script'
    }
    try:
        requests.post('http://localhost:8010/api/v1/telemetry', json=payload)
    except Exception as e:
        print("Error triggering hit:", e)

import threading
threading.Thread(target=trigger_hit).start()

start = time.time()
while time.time() - start < 15:
    msg = p.get_message()
    if msg and msg['type'] == 'message':
        print("\nSUCCESS! Received message on shadow.activity:")
        print(msg['data'].decode())
        break
    time.sleep(0.5)
else:
    print("\nFAILED: No message received on shadow.activity within 15 seconds.")
