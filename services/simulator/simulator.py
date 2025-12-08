"""
AgriTrack IoT Simulator
Generates 50 virtual tractors with realistic sensor data
Publishes to MQTT broker for testing the full pipeline
"""

import json
import time
import random
import math
import os
from datetime import datetime
import paho.mqtt.client as mqtt
from dataclasses import dataclass, asdict
from typing import List, Optional
import threading

# Configuration
MQTT_BROKER = os.getenv('MQTT_BROKER_HOST', 'test.mosquitto.org')  # Public test broker
MQTT_PORT = int(os.getenv('MQTT_BROKER_PORT', 1883))
MQTT_TOPIC = os.getenv('MQTT_TOPIC', 'agritrack/live/sensors')
NUM_MACHINES = int(os.getenv('NUM_MACHINES', 10))  # Reduced for testing
PUBLISH_INTERVAL = float(os.getenv('PUBLISH_INTERVAL', 3.0))  # seconds


@dataclass
class MachineState:
    id: str
    lat: float
    lng: float
    temp: float
    vib_x: float
    vib_y: float
    vib_z: float
    speed: float
    mode: str  # 'active', 'idle', 'off', 'overheat'
    heading: float  # Direction in degrees
    fuel: float


class VirtualMachine:
    """Simulates a single CRM machine with realistic behavior"""
    
    # Base coordinates around Punjab/Haryana (CRM hotspots)
    BASE_LOCATIONS = [
        (30.9010, 75.8573),  # Ludhiana
        (31.6340, 74.8723),  # Amritsar
        (29.9695, 76.8783),  # Karnal
        (28.8955, 76.6066),  # Rohtak
        (29.1492, 75.7217),  # Hisar
        (30.3398, 76.3869),  # Patiala
        (29.4727, 77.7085),  # Shamli
        (30.7046, 76.7179),  # Mohali
    ]
    
    def __init__(self, machine_id: str):
        self.id = machine_id
        
        # Random starting location near base
        base = random.choice(self.BASE_LOCATIONS)
        self.lat = base[0] + random.uniform(-0.1, 0.1)
        self.lng = base[1] + random.uniform(-0.1, 0.1)
        
        self.temp = random.uniform(35, 50)  # Normal operating temp
        self.vib_x = 0.0
        self.vib_y = 0.0
        self.vib_z = 0.0
        self.speed = 0.0
        self.heading = random.uniform(0, 360)
        self.fuel = random.uniform(50, 100)
        
        # State machine
        self.mode = random.choice(['active', 'active', 'active', 'idle', 'off'])
        self.mode_duration = 0
        self.anomaly_active = False
        
    def update(self):
        """Update machine state for next tick"""
        self.mode_duration += 1
        
        # Randomly change modes
        if self.mode_duration > random.randint(30, 120):
            self._change_mode()
            self.mode_duration = 0
        
        # Update based on current mode
        if self.mode == 'active':
            self._update_active()
        elif self.mode == 'idle':
            self._update_idle()
        elif self.mode == 'off':
            self._update_off()
        elif self.mode == 'overheat':
            self._update_overheat()
            
        # Random anomaly injection (2% chance)
        if random.random() < 0.02 and not self.anomaly_active:
            self._inject_anomaly()
            
    def _change_mode(self):
        """Transition to a new operating mode"""
        transitions = {
            'active': ['active', 'active', 'idle', 'off'],
            'idle': ['active', 'idle', 'off'],
            'off': ['active', 'idle', 'off'],
            'overheat': ['idle', 'off']
        }
        self.mode = random.choice(transitions.get(self.mode, ['idle']))
        self.anomaly_active = False
        
    def _update_active(self):
        """Machine actively working in field"""
        # Move in current heading
        move_distance = random.uniform(0.0001, 0.0003)
        self.lat += move_distance * math.cos(math.radians(self.heading))
        self.lng += move_distance * math.sin(math.radians(self.heading))
        
        # Occasionally change direction
        if random.random() < 0.1:
            self.heading = (self.heading + random.uniform(-45, 45)) % 360
            
        # Speed 5-15 km/h
        self.speed = random.uniform(5, 15)
        
        # Operating temperature
        self.temp = min(85, self.temp + random.uniform(-1, 2))
        
        # Vibration patterns
        self.vib_x = random.uniform(0.02, 0.15)
        self.vib_y = random.uniform(0.02, 0.12)
        self.vib_z = random.uniform(0.01, 0.08)
        
        # Fuel consumption
        self.fuel = max(0, self.fuel - random.uniform(0.01, 0.05))
        
    def _update_idle(self):
        """Machine running but stationary"""
        self.speed = 0
        self.temp = max(40, self.temp - random.uniform(0, 1))
        
        # Low vibration (engine running)
        self.vib_x = random.uniform(0.01, 0.05)
        self.vib_y = random.uniform(0.01, 0.04)
        self.vib_z = random.uniform(0.005, 0.02)
        
        self.fuel = max(0, self.fuel - random.uniform(0.005, 0.01))
        
    def _update_off(self):
        """Machine powered off"""
        self.speed = 0
        self.temp = max(25, self.temp - random.uniform(0.5, 2))
        self.vib_x = 0
        self.vib_y = 0
        self.vib_z = 0
        
    def _update_overheat(self):
        """Machine overheating - critical alert"""
        self.speed = random.uniform(0, 3)
        self.temp = min(120, self.temp + random.uniform(1, 5))
        
        # Erratic vibration
        self.vib_x = random.uniform(0.2, 0.6)
        self.vib_y = random.uniform(0.15, 0.5)
        self.vib_z = random.uniform(0.1, 0.4)
        
    def _inject_anomaly(self):
        """Inject anomalous behavior for AI detection"""
        anomaly_type = random.choice(['overheat', 'vibration', 'geofence'])
        self.anomaly_active = True
        
        if anomaly_type == 'overheat':
            self.mode = 'overheat'
            self.temp = random.uniform(95, 110)
            print(f"⚠️ Injected OVERHEAT anomaly on {self.id}")
            
        elif anomaly_type == 'vibration':
            # Sudden high vibration (mechanical issue)
            self.vib_x = random.uniform(0.4, 0.8)
            self.vib_y = random.uniform(0.3, 0.7)
            self.vib_z = random.uniform(0.2, 0.5)
            print(f"⚠️ Injected VIBRATION anomaly on {self.id}")
            
        elif anomaly_type == 'geofence':
            # Jump to unexpected location
            self.lat += random.uniform(-0.5, 0.5)
            self.lng += random.uniform(-0.5, 0.5)
            print(f"⚠️ Injected GEOFENCE anomaly on {self.id}")
            
    def get_payload(self) -> dict:
        """Generate MQTT payload"""
        return {
            "id": self.id,
            "temp": round(self.temp, 1),
            "vib_x": round(self.vib_x, 4),
            "vib_y": round(self.vib_y, 4),
            "vib_z": round(self.vib_z, 4),
            "gps": [round(self.lat, 6), round(self.lng, 6)],
            "speed": round(self.speed, 1),
            "fuel_level": round(self.fuel, 1),
            "engine_hours": round(random.uniform(100, 5000), 1),
            "mode": self.mode,
            "timestamp": int(datetime.now().timestamp() * 1000)
        }


class Simulator:
    """Main simulator orchestrating all virtual machines"""
    
    def __init__(self, num_machines: int = 50):
        self.machines: List[VirtualMachine] = []
        self.running = False
        self.client: Optional[mqtt.Client] = None
        
        # Create virtual machines
        for i in range(num_machines):
            machine_id = f"sim_{str(i + 1).zfill(3)}"
            self.machines.append(VirtualMachine(machine_id))
            
        print(f"🚜 Created {num_machines} virtual machines")
        
    def connect_mqtt(self):
        """Connect to MQTT broker"""
        # Use CallbackAPIVersion.VERSION2 for paho-mqtt v2.0+
        self.client = mqtt.Client(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
            client_id=f"simulator_{int(time.time())}"
        )
        
        def on_connect(client, userdata, flags, reason_code, properties):
            if reason_code == 0:
                print(f"✅ Connected to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}")
            else:
                print(f"❌ Failed to connect, return code {reason_code}")
                
        def on_disconnect(client, userdata, flags, reason_code, properties):
            print(f"🔌 Disconnected from MQTT broker (rc={reason_code})")
            
        self.client.on_connect = on_connect
        self.client.on_disconnect = on_disconnect
        
        try:
            self.client.connect(MQTT_BROKER, MQTT_PORT, 60)
            self.client.loop_start()
            return True
        except Exception as e:
            print(f"❌ MQTT connection error: {e}")
            return False
            
    def publish_all(self):
        """Publish state of all machines"""
        for machine in self.machines:
            machine.update()
            payload = machine.get_payload()
            
            self.client.publish(
                MQTT_TOPIC,
                json.dumps(payload),
                qos=1
            )
            
    def run(self):
        """Main simulation loop"""
        if not self.connect_mqtt():
            print("Failed to connect to MQTT. Retrying in 5 seconds...")
            time.sleep(5)
            if not self.connect_mqtt():
                return
                
        self.running = True
        print(f"🚀 Simulator running - Publishing to {MQTT_TOPIC}")
        print(f"   Interval: {PUBLISH_INTERVAL}s | Machines: {len(self.machines)}")
        print("-" * 50)
        
        tick = 0
        try:
            while self.running:
                self.publish_all()
                tick += 1
                
                if tick % 10 == 0:  # Status every 10 ticks
                    active = sum(1 for m in self.machines if m.mode == 'active')
                    idle = sum(1 for m in self.machines if m.mode == 'idle')
                    off = sum(1 for m in self.machines if m.mode == 'off')
                    overheat = sum(1 for m in self.machines if m.mode == 'overheat')
                    print(f"📊 Tick {tick}: Active={active} | Idle={idle} | Off={off} | Overheat={overheat}")
                    
                time.sleep(PUBLISH_INTERVAL)
                
        except KeyboardInterrupt:
            print("\n🛑 Stopping simulator...")
            
        finally:
            self.running = False
            if self.client:
                self.client.loop_stop()
                self.client.disconnect()
            print("👋 Simulator stopped")
            
    def stop(self):
        """Stop the simulator"""
        self.running = False


if __name__ == "__main__":
    print("=" * 50)
    print("  AgriTrack IoT Simulator")
    print("=" * 50)
    
    simulator = Simulator(num_machines=NUM_MACHINES)
    simulator.run()
