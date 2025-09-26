# FMS Documentation

Welcome to the Fleet Management System (FMS) documentation. This directory contains comprehensive guides for understanding, installing, configuring, and operating the FMS.

## 📚 Documentation Overview

### Getting Started
- **[README.md](../README.md)** - Main project overview and quick start guide
- **[Installation Guide](installation.md)** - Complete installation instructions for all platforms
- **[API Reference](api.md)** - Complete API documentation and reference

### Component Documentation
- **[Server Documentation](server.md)** - FMS Server architecture and configuration
- **[Agent Documentation](agent.md)** - Robot Agent implementation and ROS2 integration
- **[Frontend Documentation](frontend.md)** - React web application development guide

### Operations
- **[Deployment Guide](deployment.md)** - Production deployment strategies and configurations

## 🎯 Quick Navigation

### For New Users
1. Start with the [main README](../README.md) for project overview
2. Follow the [Installation Guide](installation.md) for setup
3. Check the [API Reference](api.md) for integration

### For Developers
1. Review [Server Documentation](server.md) for backend development
2. Study [Agent Documentation](agent.md) for robot integration
3. Explore [Frontend Documentation](frontend.md) for UI development

### For DevOps/Administrators
1. Follow [Deployment Guide](deployment.md) for production setup
2. Reference [Installation Guide](installation.md) for system requirements
3. Use [API Reference](api.md) for monitoring and integration

## 📖 Documentation Structure

```
docs/
├── README.md              # This documentation index
├── installation.md        # Installation and setup guide
├── api.md                # Complete API reference
├── server.md             # FMS Server documentation
├── agent.md              # Robot Agent documentation
├── frontend.md           # Web frontend documentation
└── deployment.md         # Production deployment guide
```

## 🔍 Finding Information

### By Topic

| Topic | Primary Document | Related Documents |
|-------|------------------|-------------------|
| **Installation** | [installation.md](installation.md) | [deployment.md](deployment.md) |
| **API Usage** | [api.md](api.md) | [server.md](server.md) |
| **Robot Integration** | [agent.md](agent.md) | [api.md](api.md) |
| **Web Development** | [frontend.md](frontend.md) | [api.md](api.md) |
| **Production Deployment** | [deployment.md](deployment.md) | [installation.md](installation.md) |
| **Architecture** | [server.md](server.md), [agent.md](agent.md) | [README.md](../README.md) |

### By Component

| Component | Documentation | Configuration | API Reference |
|-----------|---------------|---------------|---------------|
| **FMS Server** | [server.md](server.md) | `server/config.json` | [api.md#rest-endpoints](api.md#rest-api-endpoints) |
| **Robot Agent** | [agent.md](agent.md) | `agent/config.json` | [api.md#zenoh-protocol](api.md#zenoh-message-protocol) |
| **Web Frontend** | [frontend.md](frontend.md) | `front/.env` | [api.md#websocket-api](api.md#websocket-api) |
| **Zenoh Router** | [deployment.md](deployment.md) | `zenoh-server/docker-compose.yml` | [api.md#zenoh-protocol](api.md#zenoh-message-protocol) |

### By Use Case

| Use Case | Recommended Reading Order |
|----------|---------------------------|
| **First-time Setup** | [README.md](../README.md) → [installation.md](installation.md) → [api.md](api.md) |
| **Development** | [server.md](server.md) → [agent.md](agent.md) → [frontend.md](frontend.md) |
| **Production Deployment** | [installation.md](installation.md) → [deployment.md](deployment.md) → [api.md](api.md) |
| **Robot Integration** | [agent.md](agent.md) → [api.md#zenoh-protocol](api.md#zenoh-message-protocol) |
| **API Integration** | [api.md](api.md) → [server.md](server.md) |

## 🚀 Quick Reference

### Common Commands

```bash
# Start development environment
docker-compose up -d

# Check service status
curl http://localhost:8088/api/robots

# View logs
docker logs fms-server

# Run tests
npm test
python -m pytest
```

### Important URLs (Development)

| Service | URL | Purpose |
|---------|-----|---------|
| **Web Dashboard** | http://localhost:3000 | Main user interface |
| **API Server** | http://localhost:8088 | REST API and WebSocket |
| **Zenoh Router** | tcp://localhost:7447 | Message broker |
| **API Documentation** | http://localhost:8088/docs | Interactive API docs |

### Configuration Files

| File | Purpose | Documentation |
|------|---------|---------------|
| `server/config.json` | FMS Server settings | [server.md](server.md) |
| `agent/config.json` | Robot Agent settings | [agent.md](agent.md) |
| `front/.env` | Frontend environment | [frontend.md](frontend.md) |
| `docker-compose.yml` | Service orchestration | [deployment.md](deployment.md) |

## 🔧 Troubleshooting

### Quick Diagnostics

```bash
# Check all services are running
docker ps
curl http://localhost:8088/api/robots
curl http://localhost:3000

# Check logs for errors
docker logs fms-server
docker logs zenoh-router
journalctl -u fms-server -f
```

### Common Issues

| Issue | Quick Fix | Detailed Solution |
|-------|-----------|-------------------|
| **Port conflicts** | Change ports in config | [installation.md#troubleshooting](installation.md#troubleshooting) |
| **Docker issues** | Restart Docker service | [deployment.md#troubleshooting](deployment.md#troubleshooting) |
| **Robot not connecting** | Check Zenoh connectivity | [agent.md#troubleshooting](agent.md#troubleshooting) |
| **Web app not loading** | Check backend connection | [frontend.md#troubleshooting](frontend.md#troubleshooting) |

## 📞 Support

### Getting Help

1. **Search Documentation**: Use browser search (Ctrl+F) to find specific topics
2. **Check Troubleshooting Sections**: Each document has troubleshooting guidance
3. **Review Examples**: All documents include practical examples
4. **Check Issues**: Look for similar problems in the project repository

### Contributing to Documentation

We welcome improvements to the documentation:

1. **Fix Errors**: Submit corrections for any inaccuracies
2. **Add Examples**: Provide additional code examples or use cases
3. **Improve Clarity**: Suggest better explanations or restructuring
4. **Add Languages**: Help translate documentation

#### Documentation Standards

- Use clear, concise language
- Include practical examples
- Provide troubleshooting guidance
- Link to related sections
- Keep code examples up-to-date

### Community Resources

- **Project Repository**: https://github.com/your-org/fms
- **Issue Tracker**: https://github.com/your-org/fms/issues
- **Discussions**: https://github.com/your-org/fms/discussions
- **Wiki**: https://github.com/your-org/fms/wiki

## 📝 Documentation Updates

This documentation is actively maintained and updated with each release:

| Version | Date | Changes |
|---------|------|---------|
| **v1.0.0** | 2024-01 | Initial comprehensive documentation |
| **v1.1.0** | 2024-02 | Added deployment examples |
| **v1.2.0** | 2024-03 | Enhanced troubleshooting guides |

### Staying Updated

- Watch the repository for documentation updates
- Check the changelog for documentation changes
- Subscribe to release notifications

---

**Need help?** Start with the [main README](../README.md) or jump to the most relevant guide for your needs. If you can't find what you're looking for, check our [troubleshooting sections](#troubleshooting) or create an issue in the project repository.