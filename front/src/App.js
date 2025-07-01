import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Grid, Paper, Typography, Box, Alert, CircularProgress } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import useRobotStore from './store/robotStore';
import RobotList from './components/RobotList';
import RobotTaskPage from './components/RobotTaskPage';
// Removed MapComponent import as it's no longer used
import TaskForm from './components/TaskForm';
import TaskPanel from './components/TaskPanel';
import { useNavigate } from 'react-router-dom';

// 创建自定义主题
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2196f3', // 更柔和的主蓝色
      light: '#e3f2fd',
      dark: '#1976d2'
    }, // 调整主色为更易搭配的亮蓝系
    // 修正: 移除了多余的 "secondary: { ... }" 嵌套
    secondary: {
      main: '#9c27b0', // 专业紫色系次色
      light: '#e1bee7',
      dark: '#7b1fa2'
    }, // 调整次色为优雅紫色系
    // 修正: 移除了多余的 "success: { ... }" 嵌套
    success: {
      main: '#2e7d32', // 深绿色
      light: '#66bb6a',
      dark: '#004d40'
    },
    // 修正: 移除了多余的 "error: { ... }" 嵌套
    error: {
      main: '#d32f2f', // 深红色
      light: '#ef5350',
      dark: '#b71c1c'
    },
    // 修正: 移除了多余的 "warning: { ... }" 嵌套
    warning: {
      main: '#f57c00', // 深橙色
      light: '#ffb74d',
      dark: '#e65100'
    },
    // 修正: 移除了多余的 "background: { ... }" 嵌套
    background: {
      default: '#d0d0d0',
      paper: '#e8e8e8'
    },
    // 修正: 将 components 从 palette 内部移到了与 palette 同级的位置
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)', // 更细腻的卡片阴影
          borderRadius: '8px' // 更现代的小圆角
        }
      }
    }
  }
});

const App = () => {
  const { initRobots, connectWebSocket, error, isWebSocketConnected, robots } = useRobotStore();

  // 应用初始化时获取机器人状态并连接WebSocket
  useEffect(() => {
    initRobots();
    connectWebSocket();
  }, [initRobots, connectWebSocket]);

  return (
    <Router>
      <ThemeProvider theme={theme}>
      <Box sx={{ p: 3, bgcolor: 'ffffff', minHeight: '100vh' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <Box sx={{ backgroundColor: 'primary.main', color: 'primary.contrastText', py: 2, px: 4, borderRadius: 2, boxShadow: 3 }}>
            机器人管理系统
          </Box>
        </Typography>

        {/* 错误提示 */}
        {error && (
          <Alert severity="error" onClose={() => useRobotStore.getState().clearError()} sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* WebSocket连接状态 */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" color={isWebSocketConnected ? 'success.main' : 'error.main'}>
            {isWebSocketConnected ? '实时连接已建立' : '实时连接未建立'}
          </Typography>
          {!isWebSocketConnected && (
            <CircularProgress size={16} sx={{ ml: 2 }} color="inherit" />
          )}
        </Box>

        {/* 路由配置 */}
        <Routes>
          <Route path="/" element={<RobotList robots={Object.values(robots)} />} />
          <Route path="/robot/:robotId" element={<RobotTaskPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Box>
    </ThemeProvider>
    </Router>
  );
};

export default App;