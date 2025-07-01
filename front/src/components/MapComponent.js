import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Typography } from '@mui/material';
import { DirectionsRun, Warning } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// 自定义机器人图标
const robotIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cGF0aCBmaWxsPSIjMTk3NmQyIiBkPSJNMzgwLjcyIDE1Mi4wOGMtMjcuNjEtMC4wMi01MC4wMiAyMi40My01MC4wMiA1MC4wMnYxMDguNGMwIDI3LjYgMjIuNDEgNTAuMDIgNTAuMDIgNTAuMDJoMzguNGMtMi41OSAxMi4wNi00Ljk5IDI0LjA2LTcuMjcgMzUuOTVsLTQ2LjE1LTQ2LjE1Yy0xMi41LTEyLjUtMTIuNS0zMi43NiAwLTQ1LjI1czMyLjc2LTEyLjUgNDUuMjUgMGw0Ni4xNSA0Ni4xNWMxMi41IDEyLjUgMTIuNSAzMi43NiAwIDQ1LjI1cy0zMi43NiAxMi41LTQ1LjI1IDB6bS0xMzAuNzIgMGwtMjYuMzUgMjYuMzVjLTEyLjUgMTIuNS0zMi43NiAxMi41LTQ1LjI1IDBzLTEyLjUtMzIuNzYgMC00NS4yNWwyNi4zNS0yNi4zNWMxMi41LTEyLjUgMzIuNzYtMTIuNSA0NS4yNSAwczEyLjUgMzIuNzYgMCA0NS4yNXoiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMjU2IDhDMTE5IDggOCAxMTkgOCAyNTZzMTExIDI0OCAyNDggMjQ4IDI0OC0xMTEgMjQ4LTI0OFMzOTMgOCAyNTYgOHptMCA0NDhjLTExMC41IDAtMjAwLTg5LjUtMjAwLTIwMFMxNDUuNSA1NiAyNTYgNTZzMjAwIDg5LjUgMjAwIDIwMC04OS41IDIwMC0yMDAgMjAwem02NC0yNTZjMC0xNy42NzMtMTQuMzI3LTMyLTMyLTMycy0zMiAxNC4zMjctMzIgMzJ2MTI4YzAgMTcuNjczIDE0LjMyNyAzMiAzMiAzMnMyOCAxNC4zMjcgMjggMzJ2MzJjMCAxNy42NzMtMTQuMzI3IDMyLTMyIDMycy0zMi0xNC4zMjctMzItMzJ2LTMyYy0xNy42NzMgMC0zMi0xNC4zMjctMzItMzJ6Ii8+PC9zdmc+',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

// 离线机器人图标
const offlineRobotIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cGF0aCBmaWxsPSIjZmYwMDAwIiBkPSJNMzgwLjcyIDE1Mi4wOGMtMjcuNjEtMC4wMi01MC4wMiAyMi40My01MC4wMiA1MC4wMnYxMDguNGMwIDI3LjYgMjIuNDEgNTAuMDIgNTAuMDIgNTAuMDJoMzguNGMtMi41OSAxMi4wNi00Ljk5IDI0LjA2LTcuMjcgMzUuOTVsLTQ2LjE1LTQ2LjE1Yy0xMi41LTEyLjUtMTIuNS0zMi43NiAwLTQ1LjI1czMyLjc2LTEyLjUgNDUuMjUgMGw0Ni4xNSA0Ni4xNWMxMi41IDEyLjUgMTIuNSAzMi43NiAwIDQ1LjI1cy0zMi43NiAxMi41LTQ1LjI1IDB6bS0xMzAuNzIgMGwtMjYuMzUgMjYuMzVjLTEyLjUgMTIuNS0zMi43NiAxMi41LTQ1LjI1IDBzLTEyLjUtMzIuNzYgMC00NS4yNWwyNi4zNS0yNi4zNWMxMi41LTEyLjUgMzIuNzYtMTIuNSA0NS4yNSAwczEyLjUgMzIuNzYgMCA0NS4yNXoiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMjU2IDhDMTE5IDggOCAxMTkgOCAyNTZzMTExIDI0OCAyNDggMjQ4IDI0OC0xMTEgMjQ4LTI0OFMzOTMgOCAyNTYgOHptMCA0NDhjLTExMC41IDAtMjAwLTg5LjUtMjAwLTIwMFMxNDUuNSA1NiAyNTYgNTZzMjAwIDg5LjUgMjAwIDIwMC04OS41IDIwMC0yMDAgMjAwem02NC0yNTZjMC0xNy42NzMtMTQuMzI3LTMyLTMyLTMycy0zMiAxNC4zMjctMzIgMzJ2MTI4YzAgMTcuNjczIDE0LjMyNyAzMiAzMiAzMnMyOCAxNC4zMjcgMjggMzJ2MzJjMCAxNy42NzMtMTQuMzI3IDMyLTMyIDMycy0zMi0xNC4zMjctMzItMzJ2LTMyYy0xNy42NzMgMC0zMi0xNC4zMjctMzItMzJ6Ii8+PC9zdmc+',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

// 自定义Styled组件
const StyledMapContainer = styled(MapContainer)({
  height: '100%',
  width: '100%',
  borderRadius: 4,
  overflow: 'hidden',
});

const StatusBadge = styled(Box)(({ theme, status }) => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 500,
  color: '#fff',
  backgroundColor: status === 'ONLINE' ? theme.palette.success.main :
                  status === 'BUSY' ? theme.palette.warning.main :
                  theme.palette.error.main,
}));

const MapComponent = ({ robots }) => {
  // 过滤出有位置信息的在线机器人
  const activeRobots = robots.filter(robot => 
    robot.status !== 'OFFLINE' && robot.pose && robot.pose.x !== undefined && robot.pose.y !== undefined
  );

  // 如果没有机器人数据，显示提示信息
  if (activeRobots.length === 0) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
        <Typography variant="body1">暂无机器人位置数据</Typography>
      </Box>
    );
  }

  // 计算地图中心（使用第一个机器人的位置）
  const center = [activeRobots[0].pose.y || 0, activeRobots[0].pose.x || 0];

  return (
    <StyledMapContainer center={center} zoom={16} scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {activeRobots.map(robot => (
        <Marker
          key={robot.robot_id}
          position={[robot.pose.y || 0, robot.pose.x || 0]}
          icon={robot.status === 'OFFLINE' ? offlineRobotIcon : robotIcon}
        >
          <Tooltip permanent direction="top">
            <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'background.paper', p: 1, borderRadius: 1, boxShadow: 1 }}>
              {robot.status === 'BUSY' ? <Warning color="warning" sx={{ mr: 1 }} /> : <DirectionsRun color="primary" sx={{ mr: 1 }} />}
              <Typography variant="subtitle2">{robot.robot_id}</Typography>
            </Box>
          </Tooltip>
          <Popup>
            <Box sx={{ minWidth: 200 }}>
              <Typography variant="h6" gutterBottom>{robot.robot_id}</Typography>
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2">状态: <StatusBadge status={robot.status}>{robot.status}</StatusBadge></Typography>
              </Box>
              <Typography variant="body2">电池电量: {robot.battery.toFixed(1)}%</Typography>
              {robot.pose && (
                <Typography variant="body2">位置: ({robot.pose.x.toFixed(2)}, {robot.pose.y.toFixed(2)})</Typography>
              )}
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                最后更新: {new Date(robot.last_seen * 1000).toLocaleTimeString()}
              </Typography>
            </Box>
          </Popup>
          {/* 机器人方向指示器 */}
          {robot.pose?.theta !== undefined && (
            <Circle
              center={[robot.pose.y, robot.pose.x]}
              radius={1.5}
              fillColor="#1976d2"
              fillOpacity={0.7}
              rotationAngle={robot.pose.theta * (180 / Math.PI)}
              rotationOrigin="center"
            />
          )}
        </Marker>
      ))}
    </StyledMapContainer>
  );
};

export default MapComponent;