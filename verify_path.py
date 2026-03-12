import httpx
import asyncio

async def verify_path_redirection():
    base_url = "http://localhost:8010"
    
    print("Testing Path-Preserving Redirection...")
    # SQLi on specific path
    path = "/DVWA-master/vulnerabilities/sqli/"
    attack_query = "' OR '1'='1"
    full_url = f"http://localhost{path}?id={attack_query}&Submit=Submit"
    
    telemetry_data = {
        "event": "hit",
        "host": "localhost",
        "path": path,
        "method": "GET",
        "full_url": full_url,
        "payload": "",
        "headers": {}
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{base_url}/api/v1/telemetry", json=telemetry_data)
        result = resp.json()
        
        print(f"Action: {result.get('action')}")
        print(f"Redirect URL: {result.get('url')}")
        
        expected_redirect = "http://localhost/DVWA-rnaster/vulnerabilities/sqli/"
        if result.get('action') == 'redirect' and expected_redirect in result.get('url'):
            print("\n[SUCCESS] Path preserved correctly in redirect URL!")
        else:
            print("\n[FAILURE] Path was not preserved or redirect failed.")

if __name__ == "__main__":
    asyncio.run(verify_path_redirection())
