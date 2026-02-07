'use client';

import React from 'react';
import {
  Drawer,
  IconButton,
  Box,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import InfoIcon from '@mui/icons-material/Info';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface MenuButtonProps {
  onDrawerToggle: () => void;
}

export const MenuButton: React.FC<MenuButtonProps> = ({
  onDrawerToggle,
}) => {
  return (
    <IconButton
      onClick={onDrawerToggle}
      sx={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        '&:hover': {
          backgroundColor: 'var(--hover-bg)',
        },
      }}
    >
      <MenuIcon />
    </IconButton>
  );
};

export const MenuDrawer: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    onClose();
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    onClose();
  };

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 320,
          backgroundColor: 'var(--card-bg)',
          borderRight: '1px solid var(--card-border)',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        {/* User Profile Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: 'var(--primary)',
              color: 'black',
              fontWeight: 'bold',
            }}
          >
            {user ? user.charAt(0).toUpperCase() : <PersonIcon />}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              {user || 'Guest'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Admin
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 2, borderColor: 'var(--card-border)' }} />

        {/* Navigation Menu */}
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNavigate('/dashboard')}>
              <ListItemIcon>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary="首頁" />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNavigate('/dashboard/price-prediction')}>
              <ListItemIcon>
                <TrendingUpIcon />
              </ListItemIcon>
              <ListItemText primary="價格預測" />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNavigate('/dashboard/price-prediction?tab=model-performance')}>
              <ListItemIcon>
                <AssessmentIcon />
              </ListItemIcon>
              <ListItemText primary="模型效能" />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNavigate('/dashboard/price-prediction?tab=market-info')}>
              <ListItemIcon>
                <InfoIcon />
              </ListItemIcon>
              <ListItemText primary="市場資訊" />
            </ListItemButton>
          </ListItem>
        </List>

        <Divider sx={{ my: 2, borderColor: 'var(--card-border)' }} />

        {/* Logout */}
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout} sx={{ color: '#ff4d4d' }}>
            <ListItemIcon>
              <LogoutIcon sx={{ color: '#ff4d4d' }} />
            </ListItemIcon>
            <ListItemText primary="登出" />
          </ListItemButton>
        </ListItem>
      </Box>
    </Drawer>
  );
};
