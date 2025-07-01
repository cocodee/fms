import asyncio
import json
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import zenoh
from zenoh import Session, Reliability, Priority

zenoh_session: Optional[zenoh.Session] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global zenoh_session
    
    # --- Startup ---
    print("Application startup: Initializing Zenoh...")
    
    # 1. zenoh.open() is a SYNCHRONOUS function that returns a Session.
    #    No await, no async with.
    config = zenoh.Config()
    # 从配置文件读取 Zenoh 服务器地址
    try:
        with open('config.json', 'r') as f:
            config_data = json.load(f)
            zenoh_endpoint = config_data.get('zenoh_server_endpoint', 'tcp/127.0.0.1:7447')
    except FileNotFoundError:
        zenoh_endpoint = 'tcp/127.0.0.1:7447'
        print("Warning: config.json not found, using default Zenoh endpoint.")
    config.insert_json5("connect/endpoints", f'["{zenoh_endpoint}"]')
    session = zenoh.open(config)
    zenoh_session = session  # Assign to the global variable
    
    print("Zenoh session opened successfully.")

    # 2. Start background tasks with the valid session object.
    subscribe_task = asyncio.create_task(zenoh_subscribe(session))
    offline_checker_task = asyncio.create_task(state_manager.check_offline_robots())

    try:
        # FastAPI runs here
        yield
    finally:
        # --- Shutdown ---
        print("Application shutdown: Cleaning up...")
        
        # 3. Cleanly cancel the background tasks.
        subscribe_task.cancel()
        offline_checker_task.cancel()
        await asyncio.gather(subscribe_task, offline_checker_task, return_exceptions=True)
        print("Background tasks cancelled.")
        
        # 4. zenoh.Session.close() is also a SYNCHRONOUS function.
        #    No await.
        session.close()
        zenoh_session = None
        print("Zenoh session closed.")


app = FastAPI(lifespan=lifespan)

# 全局状态管理
class RobotState(BaseModel):
    robot_id: str
    pose: Dict[str, float] = {}
    battery: float = 0.0
    status: str = "OFFLINE"
    last_seen: float = 0.0
    custom_state: Dict[str, Any] = {}

class RobotStateManager:
    def __init__(self):
        self.robot_states: Dict[str, RobotState] = {}
        self.websocket_connections: List[WebSocket] = []
        self.lock = asyncio.Lock()

    async def update_robot_state(self, robot_id: str, state_type: str, data: Any):
        async with self.lock:
            if robot_id not in self.robot_states:
                self.robot_states[robot_id] = RobotState(robot_id=robot_id)

            robot = self.robot_states[robot_id]
            robot.last_seen = time.time()
            robot.status = "ONLINE"

            if state_type == "pose":
                robot.pose = data
            elif state_type == "battery":
                robot.battery = data
            elif state_type == "status":
                robot.status = data
            else:
                robot.custom_state[state_type] = data

            # 广播状态更新
            await self.broadcast_update(robot_id, state_type, data)

    async def broadcast_update(self, robot_id: str, state_type: str, data: Any):
        update_msg = json.dumps({
            "msg_type": "state_update",
            "robot_id": robot_id,
            "state_type": state_type,
            "data": data,
            "timestamp": time.time()
        })

        for connection in self.websocket_connections:
            try:
                await connection.send_text(update_msg)
            except Exception:
                # 移除无效连接
                await self.remove_connection(connection)

    async def add_connection(self, websocket: WebSocket):
        async with self.lock:
            self.websocket_connections.append(websocket)

    async def remove_connection(self, websocket: WebSocket):
        async with self.lock:
            if websocket in self.websocket_connections:
                self.websocket_connections.remove(websocket)

    async def check_offline_robots(self, threshold: int = 5):
        while True:
            current_time = time.time()
            offline_robots = []

            async with self.lock:
                for robot_id, robot in self.robot_states.items():
                    if current_time - robot.last_seen > threshold and robot.status != "OFFLINE":
                        robot.status = "OFFLINE"
                        offline_robots.append(robot_id)
                        await self.broadcast_update(robot_id, "status", "OFFLINE")

            # 发布离线事件
            for robot_id in offline_robots:
                await zenoh_publish(f"fms/system/event/robot_offline", {
                    "robot_id": robot_id,
                    "timestamp": current_time
                })

            await asyncio.sleep(1)

state_manager = RobotStateManager()
zenoh_session: Optional[Session] = None
async def zenoh_subscribe(session: Session):
    """订阅机器人状态更新"""
    async def callback(sample):
        """处理接收到的状态更新"""
        # 解析key: fms/robot/{robot_id}/state/{state_type}
        key_parts = sample.key_expr.split('/')
        if len(key_parts) < 5 or key_parts[0] != 'fms' or key_parts[1] != 'robot' or key_parts[3] != 'state':
            return

        robot_id = key_parts[2]
        state_type = '/'.join(key_parts[4:])

        try:
            data = json.loads(sample.payload.decode('utf-8'))
            await state_manager.update_robot_state(robot_id, state_type, data)
        except json.JSONDecodeError:
            print(f"无法解析机器人{robot_id}的{state_type}状态数据")

    # 订阅所有机器人状态
    await session.subscribe("fms/robot/*/state/**", callback,
                           reliability=Reliability.RELIABLE())

async def zenoh_publish(key: str, data: Any, priority: Priority = Priority.DEFAULT):
    """发布数据到Zenoh"""
    if zenoh_session is None:
        return

    payload = json.dumps(data).encode('utf-8')
    await zenoh_session.put(
        key,
        payload,
        priority=priority,
        reliability=Reliability.RELIABLE()
    )

# 任务调度逻辑
class TaskRequest(BaseModel):
    robot_id: str
    target_position: Dict[str, float]
    priority: str = "normal"

class TaskResponse(BaseModel):
    task_id: str
    robot_id: str
    status: str

async def schedule_robot(task: TaskRequest) -> Optional[str]:
    """使用前端指定的机器人ID执行任务"""
    async with state_manager.lock:
        robot_id = task.robot_id
        robot = state_manager.robot_states.get(robot_id)
        
        # 检查机器人是否存在、在线且电量充足
        if robot and robot.status == "ONLINE" and robot.battery > 20.0:
            return robot_id
        return None

# HTTP API 路由
@app.get("/api/robots")
async def get_all_robots():
    async with state_manager.lock:
        return list(state_manager.robot_states.values())

@app.get("/api/robots/{robot_id}")
async def get_robot(robot_id: str):
    async with state_manager.lock:
        if robot_id not in state_manager.robot_states:
            raise HTTPException(status_code=404, detail="机器人不存在")
        return state_manager.robot_states[robot_id]

@app.post("/api/tasks", response_model=TaskResponse)
async def create_task(task: TaskRequest):
    robot_id = await schedule_robot(task)
    if not robot_id:
        raise HTTPException(status_code=503, detail=f"指定机器人{task.robot_id}不可用（离线或电量不足）")

    task_id = f"task_{int(time.time())}"
    task_data = {
        "task_id": task_id,
        "target_position": task.target_position,
        "priority": task.priority,
        "timestamp": time.time()
    }

    # 发送任务给机器人，使用高优先级
    priority = Priority.REAL_TIME if task.priority == "high" else Priority.NORMAL
    await zenoh_publish(
        f"fms/robot/{robot_id}/cmd/task",
        task_data,
        priority=priority
    )

    return TaskResponse(
        task_id=task_id,
        robot_id=robot_id,
        status="scheduled"
    )

@app.post("/api/robots/{robot_id}/cancel")
async def cancel_task(robot_id: str):
    async with state_manager.lock:
        if robot_id not in state_manager.robot_states:
            raise HTTPException(status_code=404, detail="机器人不存在")

    cancel_data = {
        "timestamp": time.time(),
        "reason": "user_request"
    }

    await zenoh_publish(
        f"fms/robot/{robot_id}/cmd/cancel",
        cancel_data,
        priority=Priority.REAL_TIME
    )

    return {"status": "cancel command sent"}

# WebSocket 路由
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    await state_manager.add_connection(websocket)
    try:
        while True:
            # 保持连接，不需要接收客户端消息
            await asyncio.sleep(30)
            await websocket.send_text(json.dumps({"msg_type": "heartbeat", "timestamp": time.time()}))
    except WebSocketDisconnect:
        await state_manager.remove_connection(websocket)
    except Exception:
        await state_manager.remove_connection(websocket)