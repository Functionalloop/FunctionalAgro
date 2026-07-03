import asyncio
from backend.firebase_app import get_db

async def monitor_prices_loop():
    """
    Background task that runs periodically (e.g., daily) to check Agmarknet prices 
    and send SMS alerts if thresholds are met.
    """
    print("🚀 Started Background Price Monitor Loop...")
    while True:
        try:
            db = get_db()
            alerts_ref = db.collection("price_alerts").where("is_active", "==", True)
            alerts = alerts_ref.stream()

            # Note: In a real production system, you would batch-fetch live prices 
            # for all unique crops in the alerts list, then compare.
            # Here, we will just mock the price matching for the demo.
            
            for alert in alerts:
                data = alert.to_dict()
                phone = data.get("phone_number")
                target = data.get("target_price")
                crop = data.get("crop")

                # --- DEMO MOCK: Assume price surged by 10% above target ---
                live_price = target * 1.10
                
                if live_price >= target:
                    print("\n" + "="*50)
                    print(f"📱 🚨 SMS DISPATCH TRIGGERED!")
                    print(f"To: {phone}")
                    print(f"Message: KISAN ALERT! The modal price of {crop} in your region has surged to ₹{live_price:.0f}/quintal, exceeding your target of ₹{target:.0f}. Consider selling today!")
                    print("="*50 + "\n")
                    
                    # Deactivate alert after firing to prevent spam
                    alert.reference.update({"is_active": False})
                    
        except Exception as e:
            print(f"⚠️ Error in price_monitor: {e}")
        
        # Sleep for 24 hours (86400 seconds) - set to 60 seconds for demo purposes
        await asyncio.sleep(86400) 
