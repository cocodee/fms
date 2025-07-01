import { create } from 'zustand';
import axios from 'axios';

const useRobotStore = create((set, get) => {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const httpProtocol = window.location.protocol;
  const wsHost = window.location.hostname;
  const wsPort = process.env.REACT_APP_BACKEND_PORT || '8088';
  const backendBaseUrl = `${httpProtocol}//${wsHost}:${wsPort}`;

  return {
  mockRobots: {
    'robot-001': {
      id: 'robot-001',
      name: 'Test Robot 1',
      status: 'IDLE',
      battery: 80,
      lastUpdate: new Date().toISOString(),
      currentTask: null
    },
    'robot-002': {
      id: 'robot-002',
      name: 'Test Robot 2',
      status: 'BUSY',
      battery: 45,
      lastUpdate: new Date().toISOString(),
      currentTask: {
        id: 'task-001',
        robotId: 'robot-002',
        status: 'IN_PROGRESS',
        priority: 'NORMAL'
      }
    }
  },
  robots: {
    'robot-001': {
      id: 'robot-001',
      name: 'Test Robot 1',
      status: 'IDLE',
      battery: 80,
      lastUpdate: new Date().toISOString(),
      currentTask: null
    },
    'robot-002': {
      id: 'robot-002',
      name: 'Test Robot 2',
      status: 'BUSY',
      battery: 45,
      lastUpdate: new Date().toISOString(),
      currentTask: {
        id: 'task-001',
        robotId: 'robot-002',
        status: 'IN_PROGRESS',
        priority: 'NORMAL'
      }
    }
  },
  getRobotById: (id) => get().mockRobots[id],
  isWebSocketConnected: false,
  tasks: [],
  error: null,

  // 初始化机器人状态
  initRobots: async () => {
    try {
      const response = await axios.get(`${backendBaseUrl}/api/robots`);
      const robots = response.data.reduce((acc, robot) => {
        acc[robot.robot_id] = robot;
        return acc;
      }, {});
      set({ robots, error: null });
    } catch (err) {
      set({ error: 'Failed to fetch initial robot data' });
      console.error(err);
    }
  },

  // 建立WebSocket连接
  connectWebSocket: () => {
    if (get().isWebSocketConnected) return;

    // 在实际环境中应从环境变量获取后端地址
    const ws = new WebSocket(`${wsProtocol}//${wsHost}:${wsPort}/ws`);

    ws.onopen = () => {
      set({ isWebSocketConnected: true, error: null });
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
        const { robot_id, msg_type,state_type, data } = update;

        set((state) => {
          if (msg_type === 'heartbeat'){
            return state.robots;
          }
          const currentRobot = state.robots[robot_id] || {};
          const updatedRobot = {
            ...currentRobot,
            robot_id,
            last_seen: update.timestamp,
            [state_type]: data,
            // 如果是状态更新，直接设置status字段
            ...(state_type === 'status' ? { status: data } : {}),
          };

          return {
            robots: {
              ...state.robots,
              [robot_id]: updatedRobot
            }
          };
        });
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      set({ isWebSocketConnected: false });
      console.log('WebSocket disconnected, reconnecting...');
      // 自动重连
      setTimeout(get().connectWebSocket, 3000);
    };

    ws.onerror = (error) => {
      set({ error: 'WebSocket connection error' });
      console.error('WebSocket error:', error);
    };
  },

  // 发送任务请求
  sendTask: async (taskData) => {
    try {
      const response = await axios.post('/api/tasks', taskData);
      const newTask = response.data;
      set((state) => ({
        tasks: [...state.tasks, newTask]
      }));
      return newTask;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to send task';
      set({ error: errorMsg });
      console.error(err);
      throw new Error(errorMsg);
    }
  },

  // 取消任务
  cancelTask: async (robotId) => {
    try {
      await axios.post(`/api/robots/${robotId}/cancel`);
      set((state) => ({
        tasks: state.tasks.map(task => 
          task.robot_id === robotId ? { ...task, status: 'cancelled' } : task
        )
      }));
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to cancel task';
      set({ error: errorMsg });
      console.error(err);
      throw new Error(errorMsg);
    }
  },

  // 清除错误
  clearError: () => set({ error: null })
}
});

export default useRobotStore;