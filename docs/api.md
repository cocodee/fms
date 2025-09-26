# API Reference

Complete API documentation for the Fleet Management System (FMS) including REST endpoints, WebSocket events, and Zenoh message protocols.

## Table of Contents

- [Base Configuration](#base-configuration)
- [REST API Endpoints](#rest-api-endpoints)
- [WebSocket API](#websocket-api)
- [Zenoh Message Protocol](#zenoh-message-protocol)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Authentication](#authentication)

## Base Configuration

### Server Endpoints
- **Development**: `http://localhost:8088`
- **Production**: `https://your-domain.com`

### WebSocket Endpoints
- **Development**: `ws://localhost:8088/ws`
- **Production**: `wss://your-domain.com/ws`

### API Versioning
Current API version: `v1` (implicit)
Future versions will be explicitly versioned: `/api/v2/`

## REST API Endpoints

### Robot Management

#### Get All Robots
Retrieve information about all robots in the fleet.

```http
GET /api/robots
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "robot_id": "robot-001",
      "pose": {
        "position": {
          "x": 1.5,
          "y": 2.3,
          "z": 0.0
        },
        "orientation": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.1,
          "w": 0.99
        },
        "timestamp": 1640995200.0
      },
      "battery": 85.5,
      "status": "ONLINE",
      "last_seen": 1640995200.0,
      "custom_state": {}
    }
  ],
  "count": 1,
  "timestamp": 1640995200.0
}
```

**Status Codes:**
- `200 OK`: Successfully retrieved robot list
- `500 Internal Server Error`: Server error

#### Get Specific Robot
Retrieve detailed information about a specific robot.

```http
GET /api/robots/{robot_id}
```

**Parameters:**
- `robot_id` (string): Unique identifier for the robot

**Response:**
```json
{
  "success": true,
  "data": {
    "robot_id": "robot-001",
    "pose": {
      "position": {"x": 1.5, "y": 2.3, "z": 0.0},
      "orientation": {"x": 0.0, "y": 0.0, "z": 0.1, "w": 0.99},
      "timestamp": 1640995200.0
    },
    "battery": 85.5,
    "status": "ONLINE",
    "last_seen": 1640995200.0,
    "custom_state": {
      "navigation_state": "idle",
      "sensor_health": "good"
    }
  }
}
```

**Status Codes:**
- `200 OK`: Robot found and data returned
- `404 Not Found`: Robot does not exist
- `500 Internal Server Error`: Server error

### Task Management

#### Create Task
Assign a new task to a specific robot.

```http
POST /api/tasks
Content-Type: application/json
```

**Request Body:**
```json
{
  "robot_id": "robot-001",
  "target_position": {
    "x": 10.0,
    "y": 5.0,
    "z": 0.0
  },
  "priority": "normal",
  "metadata": {
    "task_type": "navigation",
    "timeout": 300,
    "retry_count": 3
  }
}
```

**Request Parameters:**
- `robot_id` (string, required): Target robot identifier
- `target_position` (object, required): Destination coordinates
  - `x` (number): X coordinate in meters
  - `y` (number): Y coordinate in meters  
  - `z` (number): Z coordinate in meters
- `priority` (string, optional): Task priority ("low", "normal", "high", "urgent")
- `metadata` (object, optional): Additional task parameters

**Response:**
```json
{
  "success": true,
  "data": {
    "task_id": "task_1640995200",
    "robot_id": "robot-001",
    "status": "scheduled",
    "created_at": 1640995200.0,
    "estimated_duration": 120
  }
}
```

**Status Codes:**
- `201 Created`: Task successfully created and assigned
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Robot not found
- `503 Service Unavailable`: Robot unavailable (offline or low battery)

#### Get Task Status
Retrieve the current status of a specific task.

```http
GET /api/tasks/{task_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "task_id": "task_1640995200",
    "robot_id": "robot-001", 
    "status": "in_progress",
    "progress": 45.5,
    "created_at": 1640995200.0,
    "started_at": 1640995205.0,
    "estimated_completion": 1640995320.0,
    "target_position": {"x": 10.0, "y": 5.0, "z": 0.0},
    "current_position": {"x": 4.5, "y": 2.1, "z": 0.0}
  }
}
```

#### Cancel Task
Cancel the current task for a specific robot.

```http
POST /api/robots/{robot_id}/cancel
Content-Type: application/json
```

**Request Body (Optional):**
```json
{
  "reason": "user_request",
  "force": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Cancel command sent to robot-001",
    "task_id": "task_1640995200",
    "status": "cancelling"
  }
}
```

**Status Codes:**
- `200 OK`: Cancel command sent successfully
- `404 Not Found`: Robot not found
- `409 Conflict`: No active task to cancel

### Fleet Operations

#### Get Fleet Status
Retrieve overall fleet statistics and health information.

```http
GET /api/fleet/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_robots": 5,
    "online_robots": 4,
    "busy_robots": 2,
    "idle_robots": 2,
    "offline_robots": 1,
    "average_battery": 72.3,
    "active_tasks": 2,
    "completed_tasks_today": 15,
    "system_health": "good"
  }
}
```

#### Emergency Stop
Send emergency stop command to all robots.

```http
POST /api/fleet/emergency-stop
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "safety_incident",
  "operator_id": "admin_001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Emergency stop sent to all robots",
    "affected_robots": ["robot-001", "robot-002"],
    "timestamp": 1640995200.0
  }
}
```

## WebSocket API

### Connection
Establish a persistent connection for real-time updates.

```javascript
const ws = new WebSocket('ws://localhost:8088/ws');
```

### Message Format
All WebSocket messages follow a consistent JSON format:

```json
{
  "msg_type": "string",
  "timestamp": 1640995200.0,
  "data": {}
}
```

### Incoming Messages

#### Robot State Update
Real-time robot state changes.

```json
{
  "msg_type": "state_update",
  "robot_id": "robot-001",
  "state_type": "pose",
  "data": {
    "position": {"x": 1.5, "y": 2.3, "z": 0.0},
    "orientation": {"x": 0.0, "y": 0.0, "z": 0.1, "w": 0.99},
    "timestamp": 1640995200.0
  },
  "timestamp": 1640995200.0
}
```

**State Types:**
- `pose`: Robot position and orientation
- `battery`: Battery level and health
- `status`: Operational status (ONLINE, OFFLINE, BUSY, ERROR)
- `task_progress`: Current task execution progress

#### Task Status Update
Real-time task execution updates.

```json
{
  "msg_type": "task_update",
  "task_id": "task_1640995200",
  "robot_id": "robot-001",
  "data": {
    "status": "in_progress",
    "progress": 25.5,
    "estimated_completion": 1640995320.0
  },
  "timestamp": 1640995200.0
}
```

#### System Event
Important system-wide notifications.

```json
{
  "msg_type": "system_event",
  "event_type": "robot_offline",
  "data": {
    "robot_id": "robot-001",
    "reason": "connection_timeout",
    "last_seen": 1640995195.0
  },
  "timestamp": 1640995200.0
}
```

#### Heartbeat
Connection keepalive message.

```json
{
  "msg_type": "heartbeat",
  "timestamp": 1640995200.0
}
```

### Outgoing Messages

#### Subscribe to Robot
Request updates for specific robots.

```json
{
  "msg_type": "subscribe",
  "data": {
    "robot_ids": ["robot-001", "robot-002"],
    "state_types": ["pose", "battery", "status"]
  }
}
```

#### Unsubscribe
Stop receiving updates.

```json
{
  "msg_type": "unsubscribe",
  "data": {
    "robot_ids": ["robot-001"]
  }
}
```

## Zenoh Message Protocol

### Topic Structure
All Zenoh topics follow a hierarchical naming convention:

```
fms/{component}/{entity_id}/{category}/{subcategory}
```

### Robot State Topics

#### Robot publishes to these topics:

**Pose Updates:**
```
Topic: fms/robot/{robot_id}/state/pose
```
```json
{
  "position": {"x": 1.5, "y": 2.3, "z": 0.0},
  "orientation": {"x": 0.0, "y": 0.0, "z": 0.1, "w": 0.99},
  "covariance": [0.1, 0.0, 0.0, 0.0, 0.1, 0.0, 0.0, 0.0, 0.1],
  "frame_id": "map",
  "timestamp": 1640995200.0
}
```

**Battery Status:**
```
Topic: fms/robot/{robot_id}/state/battery
```
```json
{
  "voltage": 12.4,
  "current": -2.1,
  "percentage": 85.5,
  "capacity": 5000,
  "temperature": 25.3,
  "power_supply_status": 3,
  "health": "good",
  "timestamp": 1640995200.0
}
```

**Status Updates:**
```
Topic: fms/robot/{robot_id}/state/status
```
```json
{
  "status": "IDLE",
  "substatus": "waiting_for_task",
  "message": "Robot ready for assignment",
  "error_code": null,
  "timestamp": 1640995200.0
}
```

**Heartbeat:**
```
Topic: fms/robot/{robot_id}/heartbeat
```
```json
{
  "status": "RUNNING",
  "uptime": 3600,
  "cpu_usage": 15.2,
  "memory_usage": 128.5,
  "network_quality": 95,
  "timestamp": 1640995200.0
}
```

### Command Topics

#### Server publishes to these topics:

**Task Assignment:**
```
Topic: fms/robot/{robot_id}/cmd/task
```
```json
{
  "task_id": "task_1640995200",
  "task_type": "navigation",
  "target_position": {"x": 10.0, "y": 5.0, "z": 0.0},
  "target_orientation": {"x": 0.0, "y": 0.0, "z": 0.0, "w": 1.0},
  "priority": "normal",
  "timeout": 300,
  "parameters": {
    "max_velocity": 1.0,
    "path_tolerance": 0.1,
    "goal_tolerance": 0.2
  },
  "timestamp": 1640995200.0
}
```

**Task Cancellation:**
```
Topic: fms/robot/{robot_id}/cmd/cancel
```
```json
{
  "task_id": "task_1640995200",
  "reason": "user_request",
  "force": false,
  "timestamp": 1640995200.0
}
```

**Emergency Stop:**
```
Topic: fms/robot/{robot_id}/cmd/emergency_stop
```
```json
{
  "reason": "safety_incident",
  "stop_type": "immediate",
  "operator_id": "admin_001",
  "timestamp": 1640995200.0
}
```

### System Topics

**Robot Offline Event:**
```
Topic: fms/system/event/robot_offline
```
```json
{
  "robot_id": "robot-001",
  "last_seen": 1640995195.0,
  "offline_duration": 5.0,
  "reason": "heartbeat_timeout",
  "timestamp": 1640995200.0
}
```

**Fleet Status:**
```
Topic: fms/system/fleet/status
```
```json
{
  "total_robots": 5,
  "online_count": 4,
  "active_tasks": 2,
  "system_health": "good",
  "timestamp": 1640995200.0
}
```

## Error Handling

### HTTP Error Responses

All API errors return a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ROBOT_NOT_FOUND",
    "message": "Robot with ID 'robot-001' not found",
    "details": {
      "robot_id": "robot-001",
      "available_robots": ["robot-002", "robot-003"]
    },
    "timestamp": 1640995200.0,
    "request_id": "req_1640995200_abc123"
  }
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `ROBOT_NOT_FOUND` | Robot ID does not exist | 404 |
| `ROBOT_OFFLINE` | Robot is not connected | 503 |
| `ROBOT_BUSY` | Robot is executing another task | 409 |
| `LOW_BATTERY` | Robot battery below threshold | 503 |
| `INVALID_POSITION` | Target position is unreachable | 400 |
| `TASK_NOT_FOUND` | Task ID does not exist | 404 |
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `ZENOH_ERROR` | Communication system error | 500 |
| `INTERNAL_ERROR` | Server internal error | 500 |

### WebSocket Error Messages

```json
{
  "msg_type": "error",
  "error": {
    "code": "SUBSCRIPTION_FAILED",
    "message": "Failed to subscribe to robot updates",
    "details": {"robot_id": "robot-001"}
  },
  "timestamp": 1640995200.0
}
```

## Rate Limiting

### API Rate Limits

| Endpoint Category | Rate Limit | Window |
|------------------|------------|---------|
| Robot queries | 100 req/min | Per IP |
| Task creation | 10 req/min | Per IP |
| Task cancellation | 20 req/min | Per IP |
| Fleet operations | 5 req/min | Per IP |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995260
X-RateLimit-Window: 60
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "details": {
      "limit": 100,
      "window": 60,
      "reset_at": 1640995260
    }
  }
}
```

## Authentication

### Current Status
The current implementation does not include authentication. This is suitable for development and closed network environments.

### Future Authentication (Planned)

#### JWT Token Authentication
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### API Key Authentication
```http
X-API-Key: your-api-key-here
```

#### OAuth 2.0 Integration
```http
Authorization: Bearer oauth-access-token
```

### Recommended Security Headers

```http
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## SDK and Client Libraries

### JavaScript/TypeScript Client

```javascript
import { FMSClient } from '@fms/client';

const client = new FMSClient({
  baseURL: 'http://localhost:8088',
  apiKey: 'your-api-key' // when authentication is implemented
});

// Get all robots
const robots = await client.robots.getAll();

// Send task
const task = await client.tasks.create({
  robotId: 'robot-001',
  targetPosition: { x: 10, y: 5, z: 0 }
});

// Real-time updates
client.on('robot.status', (update) => {
  console.log('Robot status updated:', update);
});
```

### Python Client

```python
from fms_client import FMSClient

client = FMSClient(
    base_url='http://localhost:8088',
    api_key='your-api-key'  # when authentication is implemented
)

# Get all robots
robots = client.robots.get_all()

# Send task
task = client.tasks.create(
    robot_id='robot-001',
    target_position={'x': 10, 'y': 5, 'z': 0}
)

# Real-time updates
@client.on('robot.status')
def handle_robot_update(update):
    print(f"Robot status updated: {update}")
```

---

For more information, see the main [README.md](../README.md) or component-specific documentation.