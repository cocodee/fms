import React from 'react';
import { List, ListItem, ListItemText, Box, Typography, Chip, Divider } from '@mui/material';
import { Assignment, AssignmentLate, AssignmentTurnedIn, PriorityHigh } from '@mui/icons-material';
import useRobotStore from '../store/robotStore';

const TaskPanel = () => {
  const { tasks } = useRobotStore();

  // 根据任务状态获取对应的图标和颜色
  const getTaskStatusInfo = (status) => {
    switch (status) {
      case 'scheduled':
        return { icon: <Assignment color="primary" />, color: 'primary', label: '已调度' };
      case 'executing':
        return { icon: <AssignmentLate color="warning" />, color: 'warning', label: '执行中' };
      case 'completed':
        return { icon: <AssignmentTurnedIn color="success" />, color: 'success', label: '已完成' };
      case 'cancelled':
        return { icon: <Assignment color="error" />, color: 'error', label: '已取消' };
      default:
        return { icon: <Assignment color="default" />, color: 'default', label: status };
    }
  };

  // 根据优先级获取对应的显示样式
  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high':
        return <Chip size="small" icon={<PriorityHigh />} label="高" color="error" />;
      case 'normal':
        return <Chip size="small" label="中" color="default" />;
      case 'low':
        return <Chip size="small" label="低" color="default" />;
      default:
        return <Chip size="small" label={priority} color="default" />;
    }
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  // 按时间戳降序排序任务（最新的在前）
  const sortedTasks = [...tasks].sort((a, b) => b.timestamp - a.timestamp);

  if (sortedTasks.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 150, color: 'text.secondary' }}>
        <Assignment sx={{ fontSize: 48, mb: 1 }} />
        <Typography variant="body1">暂无任务</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
      <List disablePadding>
        {sortedTasks.map((task) => {
          const statusInfo = getTaskStatusInfo(task.status);
          return (
            <React.Fragment key={task.task_id}>
              <ListItem sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle2">任务 {task.task_id}</Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {getPriorityLabel(task.priority)}
                        <Chip
                          size="small"
                          icon={statusInfo.icon}
                          label={statusInfo.label}
                          color={statusInfo.color}
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        机器人: {task.robot_id}
                      </Typography>
                      <Typography variant="body2">
                        目标位置: ({task.target_position.x.toFixed(2)}, {task.target_position.y.toFixed(2)})
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        创建时间: {formatTimestamp(task.timestamp)}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
              <Divider />
            </React.Fragment>
          );
        })}
      </List>
    </Box>
  );
};

export default TaskPanel;