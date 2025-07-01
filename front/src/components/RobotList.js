import React from 'react';
import { Grid, Card, CardContent, CardHeader, Typography, Chip, Box, Avatar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Error, Warning } from '@mui/icons-material';
import { BatteryFull, Battery50, Battery20, BatteryAlert } from '@mui/icons-material';
import useRobotStore from '../store/robotStore';

const RobotList = ({ robots }) => {
  const { cancelTask } = useRobotStore();
  const navigate = useNavigate();

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ONLINE': return <CheckCircle color="success" />;
      case 'OFFLINE': return <Error color="error" />;
      case 'BUSY': return <Warning color="warning" />;
      default: return <Error color="default" />;
    }
  };

  const handleCardClick = (robotId) => {
    navigate(`/robot/${robotId}`);
  };

  // 根据电池电量获取对应的图标
  const getBatteryIcon = (level) => {
    if (level >= 75) return <BatteryFull color="success" />;
    if (level >= 50) return <Battery50 color="success" />;
   else if (level >= 20) return <Battery20 color="warning" />;
    return <BatteryAlert color="error" />;
  };

  // 根据状态获取对应的芯片颜色
  const getStatusColor = (status) => {
    switch (status) {
      case 'ONLINE': return 'success';
      case 'OFFLINE': return 'error';
      case 'BUSY': return 'warning';
      default: return 'default';
    }
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString();
  };

  // 按ID排序机器人
  const sortedRobots = robots ? [...robots].sort((a, b) => {
    const idA = a?.id || '';
    const idB = b?.id || '';
    return idA.localeCompare(idB);
  }) : [];

  return (
    <Grid container spacing={3} sx={{ p: 2 }}>
      {sortedRobots.map((robot) => (
        <Grid item xs={12} sm={6} md={4} key={robot.id}>
          <Card
            sx={{ 
              height: '100%', 
              cursor: 'pointer',
              transition: '0.3s',
              '&:hover': { boxShadow: 6 }
            }}
            onClick={() => handleCardClick(robot.id)}
          >
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: getStatusColor(robot.status) }}>
                  {getStatusIcon(robot.status)}
                </Avatar>
              }
              title={robot.robot_id}
              subheader={`最后更新: ${formatTimestamp(robot.last_seen)}`}
            />
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {getBatteryIcon(robot.battery)} 
                <Typography variant="body2" sx={{ ml: 1 }}>
                  电池电量: {robot.battery !== undefined && robot.battery !== null ? robot.battery.toFixed(1) : 'N/A'}%
                </Typography>
              </Box>
              <Chip
                label={robot.status}
                color={getStatusColor(robot.status)}
                size="small"
                sx={{ mb: 2 }}
              />
              {robot.status === 'BUSY' && robot.current_task && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>当前任务:</Typography>
                  <Typography variant="body2">
                    目标位置: ({robot.current_task.target_position?.x !== undefined && robot.current_task.target_position?.x !== null ? robot.current_task.target_position.x.toFixed(1) : 'N/A'},
                    {robot.current_task.target_position?.y !== undefined && robot.current_task.target_position?.y !== null ? robot.current_task.target_position.y.toFixed(1) : 'N/A'})
                  </Typography>
                  <Chip
                    size="small"
                    label="取消任务"
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelTask(robot.robot_id);
                    }}
                    color="error"
                    sx={{ mt: 1 }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'ONLINE': return 'success';
    case 'OFFLINE': return 'error';
    case 'BUSY': return 'warning';
    default: return 'default';
  }
};

export const getBatteryIcon = (level) => {
  if (level >= 75) return <BatteryFull color="success" />;
  if (level >= 50) return <Battery50 color="success" />;
  else if (level >= 20) return <Battery20 color="warning" />;
  return <BatteryAlert color="error" />;
};

export const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString();
};

export default RobotList;