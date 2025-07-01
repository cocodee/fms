import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Paper, Typography, Box, Button, Grid, Chip, CircularProgress, Alert } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import useRobotStore from '../store/robotStore';
import TaskForm from './TaskForm';
import { getBatteryIcon, getStatusColor, formatTimestamp } from './RobotList';

const RobotTaskPage = () => {
  const { robotId } = useParams();
  const navigate = useNavigate();
  const { robots, getRobotById, cancelTask, error } = useRobotStore();
  const robot = getRobotById(robotId) || {};

  if (!robot.id) {
    return (
      <Box sx={{ p: 2 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/')}
          sx={{ mb: 3 }}
        >
          返回列表
        </Button>
        <Alert severity="error" sx={{ mt: 2 }}>
          未找到ID为 {robotId} 的机器人
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/')}
        sx={{ mb: 3 }}
      >
        返回列表
      </Button>

      {error && (
        <Alert severity="error" onClose={() => useRobotStore.getState().clearError()} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* 机器人信息卡片 */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h5" gutterBottom>机器人信息</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ mr: 2 }}>ID:</Typography>
              <Typography variant="body1">{robot.robot_id}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ mr: 2 }}>状态:</Typography>
              <Chip
                label={robot.status}
                color={getStatusColor(robot.status)}
                size="small"
                sx={{ display: 'flex', alignItems: 'center' }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ mr: 2 }}>电池电量:</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {getBatteryIcon(robot.battery)} 
                <Typography variant="body1" sx={{ ml: 1 }}>
                  {robot.battery.toFixed(1)}%
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ mr: 2 }}>最后更新:</Typography>
              <Typography variant="body1">{formatTimestamp(robot.last_seen)}</Typography>
            </Box>
          </Paper>
        </Grid>

        {/* 任务表单 */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>发送任务</Typography>
            <TaskForm robotId={robot.robot_id} />
          </Paper>
        </Grid>

        {/* 当前任务状态 */}
        {robot.status === 'BUSY' && robot.current_task && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>当前任务</Typography>
              <Box sx={{ ml: 2 }}>
                <Typography variant="subtitle1">目标位置:</Typography>
                <Typography variant="body1">
                  X: {robot.current_task.target_position.x.toFixed(1)},
                  Y: {robot.current_task.target_position.y.toFixed(1)}
                </Typography>
                <Typography variant="subtitle1" sx={{ mt: 1 }}>优先级:</Typography>
                <Typography variant="body1">{robot.current_task.priority}</Typography>
                <Typography variant="subtitle1" sx={{ mt: 1 }}>创建时间:</Typography>
                <Typography variant="body1">{formatTimestamp(robot.current_task.timestamp)}</Typography>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => cancelTask(robot.robot_id)}
                  sx={{ mt: 2 }}
                >
                  取消任务
                </Button>
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default RobotTaskPage;