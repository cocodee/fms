#!/usr/bin/env python3
import json
import time
import uuid
import logging
from abc import ABC, abstractmethod
import zenoh
from zenoh import Reliability

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 抽象机器人接口
class RobotInterface(ABC):
    @abstractmethod
    def get_pose(self):
        pass
    
    @abstractmethod
    def get_battery_state(self):
        pass
    
    @abstractmethod
    def send_velocity_command(self, linear_x, angular_z):
        pass
    
    @abstractmethod
    def get_current_time(self):
        pass
    
    @abstractmethod
    def is_shutdown(self):
        pass

# ROS2机器人接口实现
class ROSRobotInterface(RobotInterface):
    def __init__(self):
        try:
            import rospy
            from geometry_msgs.msg import PoseWithCovarianceStamped, Twist
            from sensor_msgs.msg import BatteryState
            self.rospy = rospy
            self.Twist = Twist
            
            # 初始化ROS节点
            rospy.init_node('robot_agent', anonymous=True)
            self.rate = rospy.Rate(1)  # 1Hz
            
            # 初始化状态变量
            self.pose = None
            self.battery_state = None
            
            # 订阅ROS主题
            rospy.Subscriber('/amcl_pose', PoseWithCovarianceStamped, self.amcl_pose_callback)
            rospy.Subscriber('/battery_state', BatteryState, self.battery_state_callback)
            
            # 创建命令发布者
            self.cmd_vel_pub = rospy.Publisher('/cmd_vel', Twist, queue_size=10)
            logger.info("ROS robot interface initialized successfully")
        except ImportError:
            logger.error("ROS dependencies not found. Please install ROS or use MockRobotInterface.")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize ROS interface: {str(e)}")
            raise
    
    def amcl_pose_callback(self, msg):
        self.pose = msg
    
    def battery_state_callback(self, msg):
        self.battery_state = msg
    
    def get_pose(self):
        return self.pose
    
    def get_battery_state(self):
        return self.battery_state
    
    def send_velocity_command(self, linear_x, angular_z):
        twist = self.Twist()
        twist.linear.x = linear_x
        twist.angular.z = angular_z
        self.cmd_vel_pub.publish(twist)
    
    def get_current_time(self):
        return self.rospy.Time.now().to_sec()
    
    def is_shutdown(self):
        return self.rospy.is_shutdown()

# 模拟机器人接口实现（用于独立测试）
class MockRobotInterface(RobotInterface):
    def __init__(self):
        self.pose = {
            'position': {'x': 0.0, 'y': 0.0, 'z': 0.0},
            'orientation': {'x': 0.0, 'y': 0.0, 'z': 0.0, 'w': 1.0}
        }
        self.battery_state = {
            'voltage': 12.0,
            'percentage': 0.95,
            'power_supply_status': 3
        }
        self.shutdown_flag = False
        logger.info("Mock robot interface initialized for testing")
    
    def get_pose(self):
        # 模拟位置缓慢变化
        self.pose['position']['x'] += 0.01
        return type('Pose', (object,), {
            'pose': type('Pose', (object,), {
                'pose': type('Pose', (object,), {
                    'position': type('Point', (object,), self.pose['position'])(),
                    'orientation': type('Quaternion', (object,), self.pose['orientation'])()
                })()
            })()
        })()
    
    def get_battery_state(self):
        return type('BatteryState', (object,), self.battery_state)()
    
    def send_velocity_command(self, linear_x, angular_z):
        logger.info(f"Mock sending velocity command: linear_x={linear_x}, angular_z={angular_z}")
    
    def get_current_time(self):
        return time.time()
    
    def is_shutdown(self):
        return self.shutdown_flag
    
    def shutdown(self):
        self.shutdown_flag = True

class RobotAgent:
    def __init__(self, robot_interface=None):
        # 获取或生成robot_id
        self.robot_id = self._get_robot_id()
        logger.info(f'Robot ID: {self.robot_id}')

        # 初始化状态变量
        self.status = 'IDLE'

        # 初始化机器人接口
        self.robot_interface = self._initialize_robot_interface(robot_interface)

        # 创建Zenoh会话
        self.zenoh_config = zenoh.Config()
        # 从配置文件读取Zenoh服务器地址
        import os
        config_path = os.path.join(os.path.dirname(__file__), 'config.json')
        default_endpoint = 'tcp/127.0.0.1:7447'
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
                endpoint = config.get('zenoh_server_endpoint', default_endpoint)
        except FileNotFoundError:
            logger.warning(f'Config file {config_path} not found, using default Zenoh endpoint: {default_endpoint}')
            endpoint = default_endpoint
        except Exception as e:
            logger.error(f'Error reading config file: {e}, using default Zenoh endpoint: {default_endpoint}')
            endpoint = default_endpoint

        self.zenoh_config.insert_json5('connect/endpoints', json.dumps([endpoint]))

        logger.info('Connecting to Zenoh...')
        self.session = zenoh.open(self.zenoh_config)
        logger.info('Connected to Zenoh successfully')

        # 订阅命令主题
        self.cmd_sub = self.session.subscribe(
            f'fms/robot/{self.robot_id}/cmd/**',
            self.cmd_callback,
            reliability=Reliability.RELIABLE
        )

    def _get_robot_id(self):
        # 尝试从环境变量获取robot_id，否则生成UUID
        import os
        return os.getenv('ROBOT_ID', str(uuid.uuid4()))

    def _initialize_robot_interface(self, robot_interface):
        if robot_interface:
            return robot_interface
        
        # 自动检测ROS环境
        try:
            import rospy
            return ROSRobotInterface()
        except ImportError:
            logger.warning("ROS not found, using mock interface for testing")
            return MockRobotInterface()

    def cmd_callback(self, sample):
        """处理接收到的命令"""
        try:
            # 解析命令
            cmd_key = sample.key_expr.as_string()
            cmd_data = json.loads(sample.payload.decode('utf-8'))
            logger.info(f'Received command: {cmd_key}, Data: {cmd_data}')

            # 提取命令类型
            cmd_type = cmd_key.split('/')[-1]

            # 处理不同类型的命令
            if cmd_type == 'task':
                # 执行任务命令
                self.execute_task(cmd_data)
            elif cmd_type == 'cancel':
                # 取消当前任务
                self.cancel_task()
            else:
                logger.warning(f'Unknown command type: {cmd_type}')
                self.update_status('ERROR', f'Unknown command type: {cmd_type}')

        except Exception as e:
            logger.error(f'Error processing command: {str(e)}')
            self.update_status('ERROR', str(e))

    def execute_task(self, task_data):
        """执行任务命令"""
        # 更新状态为运行中
        self.update_status('RUNNING', f'Executing task: {task_data.get("task_id", "unknown")}')

        # 这里添加实际执行任务的逻辑
        # 例如，发布速度命令或调用导航接口
        structured_task = {
            "task_id": task_data.get("task_id"),
            "target_position": task_data.get("target_position"),
            "priority": task_data.get("priority"),
            "timestamp": time.time()
        }
        logger.info(f'Executing task: {structured_task}')

        # 模拟任务执行
        # 在实际应用中，这里应该是与导航系统的交互
        time.sleep(2)

        # 更新状态为完成
        self.update_status('COMPLETED', f'Task {task_data.get("task_id", "unknown")} completed successfully')

    def cancel_task(self):
        """取消当前任务"""
        # 发布停止命令
        self.robot_interface.send_velocity_command(0, 0)
        self.update_status('CANCELLED', 'Task cancelled by user command')

    def update_status(self, status, message=''):
        """更新并发布机器人状态"""
        self.status = status
        status_data = {
            'status': status,
            'message': message,
            'timestamp': self.robot_interface.get_current_time()
        }
        self.session.put(
            f'fms/robot/{self.robot_id}/state/status',
            json.dumps(status_data),
            reliability=Reliability.RELIABLE
        )

    def publish_state(self):
        """发布机器人状态"""
        if self.pose is not None:
            pose_data = {
                'position': {
                    'x': self.pose.pose.pose.position.x,
                    'y': self.pose.pose.pose.position.y,
                    'z': self.pose.pose.pose.position.z
                },
                'orientation': {
                    'x': self.pose.pose.pose.orientation.x,
                    'y': self.pose.pose.pose.orientation.y,
                    'z': self.pose.pose.pose.orientation.z,
                    'w': self.pose.pose.pose.orientation.w
                },
                'timestamp': self.robot_interface.get_current_time()
            }
            self.session.put(f'fms/robot/{self.robot_id}/state/pose', json.dumps(pose_data))

        if self.battery_state is not None:
            battery_data = {
                'voltage': self.battery_state.voltage,
                'percentage': self.battery_state.percentage,
                'power_supply_status': self.battery_state.power_supply_status,
                'timestamp': self.robot_interface.get_current_time()
            }
            self.session.put(f'fms/robot/{self.robot_id}/state/battery', json.dumps(battery_data))

        # 发布心跳
        heartbeat_data = {
            'status': self.status,
            'timestamp': self.robot_interface.get_current_time()
        }
        self.session.put(f'fms/robot/{self.robot_id}/heartbeat', json.dumps(heartbeat_data))

    def run(self):
        """运行机器人代理主循环"""
        try:
            while not self.robot_interface.is_shutdown():
                self.publish_state()
                time.sleep(1)  # 1Hz循环
        except rospy.ROSInterruptException:
            pass
        finally:
            # 关闭Zenoh会话
            self.cmd_sub.close()
            self.session.close()
            logger.info('Zenoh session closed')

if __name__ == '__main__':
    try:
        # 可以通过命令行参数选择接口类型
        import argparse
        parser = argparse.ArgumentParser(description='Robot Agent')
        parser.add_argument('--interface', choices=['ros', 'mock'], default='ros',
                            help='Choose robot interface (ros or mock)')
        args = parser.parse_args()

        # 根据参数选择接口
        if args.interface == 'ros':
            interface = ROSRobotInterface() if 'rospy' in locals() else MockRobotInterface()
        else:
            interface = MockRobotInterface()

        agent = RobotAgent(robot_interface=interface)
        agent.run()
    except Exception as e:
        logger.error(f'Robot agent failed to start: {str(e)}')
        exit(1)