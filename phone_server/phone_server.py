#############################################################
################### android phone
#############################################################

import asyncio
import json
import threading
import time

import websockets
import numpy as np
import logging
import zenoh

# Configure logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)


class PhoneServer:
    def __init__(self, translation_step, host="0.0.0.0", port=8765, update_dt=1 / 50, zenoh_key="fms/phone_server", zenoh_connect_address=None):
        self.host = host
        self.port = port
        self.update_dt = update_dt
        self.translation_step = translation_step
        self.zenoh_key = zenoh_key
        self.zenoh_connect_address = zenoh_connect_address

        self._lock = threading.Lock()

        self._latest_data = {
            "buttonStates": [False] * 6,
            "isSwitch1On": False,
            "isSwitch2On": False,
            "rotation": [0.0, 0.0, 0.0, 1.0],
        }

        self.q_world = np.array([0.0, 0.0, 0.0, 1.0], dtype=np.float64)
        self.delta_position = np.zeros(3)
        self.rotation_flag = False
        self.gripper_flag = False
        self.receive_flag = False

        # Zenoh
        self.z_session = None
        self.z_pub = None
        self.init_zenoh()

    def init_zenoh(self):
        try:
            conf = zenoh.Config()
            if self.zenoh_connect_address:
                connect_config = {"endpoints": [self.zenoh_connect_address]}
                conf.insert_json5("connect", json.dumps(connect_config))
            self.z_session = zenoh.open(conf)
            self.z_pub = self.z_session.declare_publisher(self.zenoh_key)
            log.info(f"Zenoh session started and publisher declared for key: {self.zenoh_key}")
            if self.zenoh_connect_address:
                log.info(f"Connected to Zenoh router at: {self.zenoh_connect_address}")
        except Exception as e:
            log.error(f"Failed to initialize Zenoh: {e}")

    def key_map(self, data):
        delta_position = np.zeros(3)

        button_states = data["buttonStates"]
        isSwitch1On = data["isSwitch1On"]
        isSwitch2On = data["isSwitch2On"]

        rotation_flag = True if isSwitch1On else False
        gripper_flag = True if isSwitch2On else False

        # kep map
        if button_states[0]:
            delta_position[2] = -self.translation_step
        if button_states[1]:
            delta_position[2] = self.translation_step
        if button_states[2]:  # todo: check why the y axis is inversed
            delta_position[1] = -self.translation_step
        if button_states[5]:
            delta_position[1] = self.translation_step
        if button_states[4]:
            delta_position[0] = -self.translation_step
        if button_states[3]:
            delta_position[0] = self.translation_step

        q_world = data.get("rotation", [0.0, 0.0, 0.0, 1.0])[:4]
        q_world = np.array(q_world, dtype=np.float64)

        return q_world, delta_position, gripper_flag

    async def handler(self, websocket, path):
        """
        whenever a client connects, this handler will be called.
        upon receiving data, update self._latest_data.
        """

        log.info("A client connected.")
        time.sleep(3)
        self.receive_flag = True

        while True:
            try:
                message = await websocket.recv()
                log.info(f"Received from client: {message}") # Log the raw message

                data = json.loads(message)

                q_world, delta_position, gripper_flag = self.key_map(data)

                # update latest data (thread-safe)
                with self._lock:
                    self.q_world = q_world
                    self.delta_position = delta_position
                    self.gripper_flag = gripper_flag
                
                # Publish to Zenoh
                if self.z_pub:
                    payload = {
                        "orientation": q_world.tolist(),
                        "position_change": delta_position.tolist(),
                        "gripper_on": gripper_flag
                    }
                    self.z_pub.put(json.dumps(payload))


            except websockets.ConnectionClosed:
                self.receive_flag = False
                log.info("Connection closed.")
                break
            except Exception as e:
                self.receive_flag = False
                log.error(f"Error in handler: {e}")
                break
            except KeyboardInterrupt:
                self.receive_flag = False
                log.info("KeyboardInterrupt.")
                break

    async def main_server(self):
        """
        start the websockets server (async)
        """
        async with websockets.serve(self.handler, self.host, self.port):
            log.info(f"WebSocket Server started, listening on {self.host}:{self.port}")
            await asyncio.Future()  # run forever

    def start_server(self):
        """
        start the server in a new thread
        """

        def run_asyncio():
            asyncio.run(self.main_server())

        server_thread = threading.Thread(target=run_asyncio, daemon=True)
        server_thread.start()

    def get_latest_data(self):
        """
        get the latest position, orientation (thread-safe).
        return: (position: np.ndarray, orientation: np.ndarray)
        """
        with self._lock:
            # pos = self._latest_data["position"].copy()
            q_world = self.q_world.copy()
            delta_position = self.delta_position.copy()
            gripper_flag = self.gripper_flag
        return q_world, delta_position, gripper_flag

    @property
    def _latest_position(self):
        """
        internal attribute: get the latest position (no lock, for internal use only)
        """
        return self._latest_data["position"]

# =================================================================
#  MAIN EXECUTION EXAMPLE
# =================================================================
if __name__ == "__main__":
    # 1. Set the Zenoh router address
    #    e.g., "tcp/192.168.1.100:7447"
    #    If None, it will use the default Zenoh discovery
    ZENOH_ROUTER_ADDRESS = "tcp/74.48.61.171:7447"  # CHANGE THIS TO YOUR ZENOH ROUTER'S ADDRESS

    # 2. Create an instance of the server
    #    We can pass a translation_step or use the default value of 0.01
    phone_server = PhoneServer(
        translation_step=0.02,
        zenoh_connect_address=ZENOH_ROUTER_ADDRESS
    )

    # 3. Start the server in the background
    phone_server.start_server()

    # 4. Find your computer's IP address.
    #    On Windows, open cmd and type `ipconfig`.
    #    On macOS/Linux, open a terminal and type `ifconfig` or `ip addr`.
    #    Look for the "IPv4 Address". It will be something like 192.168.1.10.
    #    Your phone must be on the same Wi-Fi network.
    log.info("Main application is running. Waiting for phone connection...")
    log.info("Connect your phone app to this computer's IP address on port 8765.")

    # 5. Your main application loop
    #    This loop continuously gets the latest data from the server.
    #    This simulates a robot control loop.
    try:
        while True:
            # Get the latest control data from the phone
            orientation, position_change, gripper_on = phone_server.get_latest_data()

            # The receive_flag tells us if a client is actively connected
            if phone_server.receive_flag:
                print(f"Orientation (Quat): {orientation}")
                print(f"Position Change:    {position_change}")
                print(f"Gripper On:         {gripper_on}")
                print("-" * 20)

            # In a real application, you would use this data to control a robot, camera, etc.

            time.sleep(0.1)  # Run your main loop at 10 Hz

    except KeyboardInterrupt:
        log.info("Shutting down main application.")
    finally:
        if phone_server.z_session:
            phone_server.z_session.close()
            log.info("Zenoh session closed.")
