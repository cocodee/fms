import React, { useState } from 'react';
import { Box, TextField, Button, FormControl, InputLabel, Select, MenuItem, Grid, Typography, Alert, CircularProgress } from '@mui/material';
import { Send } from '@mui/icons-material';
import useRobotStore from '../store/robotStore';

const TaskForm = ({ robotId }) => {
  const [formData, setFormData] = useState({
  robot_id: robotId || '',
  target_position: {
    x: '',
    y: ''
  },
  priority: 'normal'
});
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { sendTask, robots } = useRobotStore();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    setLocalError('');
  };

  const validateForm = () => {
    const { x, y } = formData.target_position;
    if (!formData.robot_id) {
      setLocalError('请选择一个机器人');
      return false;
    }
    if (!x || !y) {
      setLocalError('请输入目标位置的X和Y坐标');
      return false;
    }
    if (isNaN(parseFloat(x)) || isNaN(parseFloat(y))) {
      setLocalError('坐标必须是有效的数字');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setLocalError('');

    try {
      const taskData = {
        robot_id: formData.robot_id,
        target_position: {
          x: parseFloat(formData.target_position.x),
          y: parseFloat(formData.target_position.y)
        },
        priority: formData.priority
      };

      await sendTask(taskData);
      // 提交成功后重置表单
      setFormData({
        target_position: {
          x: '',
          y: ''
        },
        priority: 'normal'
      });
    } catch (err) {
      setLocalError(err.message || '发送任务失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      {localError && (
        <Alert severity="error" sx={{ mb: 2 }}>{localError}</Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <TextField
              fullWidth
              label="目标X坐标"
              name="target_position.x"
              value={formData.target_position.x}
              onChange={handleChange}
              variant="outlined"
              size="small"
              required
              inputProps={{ type: 'number', step: '0.01' }}
            />
        </Grid>
        {robotId ? (
          <Grid item xs={12}>
            <Typography variant="subtitle1">
              当前机器人: <strong>{robotId}</strong>
            </Typography>
          </Grid>
        ) : (
          <Grid item xs={12}>
            <FormControl fullWidth size="small" required>
              <InputLabel>选择机器人</InputLabel>
              <Select
                name="robot_id"
                value={formData.robot_id}
                label="选择机器人"
                onChange={handleChange}
              >
                {Object.values(robots).map(robot => (
                  <MenuItem key={robot.robot_id} value={robot.robot_id}>
                    {robot.robot_id} ({robot.status})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="目标Y坐标"
            name="target_position.y"
            value={formData.target_position.y}
            onChange={handleChange}
            variant="outlined"
            size="small"
            required
            inputProps={{ type: 'number', step: '0.01' }}
          />
        </Grid>
      </Grid>

      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>任务优先级</InputLabel>
        <Select
          name="priority"
          value={formData.priority}
          label="任务优先级"
          onChange={handleChange}
        >
          <MenuItem value="low">低</MenuItem>
          <MenuItem value="normal">中</MenuItem>
          <MenuItem value="high">高</MenuItem>
        </Select>
      </FormControl>

      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        disabled={submitting}
        startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Send />}
      >
        {submitting ? '发送中...' : '发送任务'}
      </Button>
    </Box>
  );
};

export default TaskForm;