'use client';

import { useState } from 'react';
import {
  Avatar,
  Box,
  ButtonBase,
  Divider,
  ListItemIcon,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export interface UserMenuProps {
  /** Show username label next to avatar */
  showLabel?: boolean;
  /** Avatar size: small (28px) for toolbar, medium (32px) for header */
  size?: 'small' | 'medium';
}

const UserMenu = ({ showLabel = false, size = 'small' }: UserMenuProps) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNavigate = (path: string) => {
    handleClose();
    router.push(path);
  };

  const handleLogout = () => {
    handleClose();
    logout();
  };

  const avatarSize = size === 'small' ? 28 : 32;

  return (
    <>
      <Tooltip title="帳戶選單">
        <ButtonBase
          onClick={handleClick}
          sx={{
            borderRadius: '50%',
            p: size === 'small' ? 0.5 : 0.75,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            '&:hover': {
              backgroundColor: 'var(--hover-bg)',
            },
          }}
        >
          <Avatar
            sx={{
              width: avatarSize,
              height: avatarSize,
              bgcolor: 'var(--primary)',
              color: 'black',
              fontSize: size === 'small' ? '0.875rem' : '1rem',
            }}
          >
            {user ? user.charAt(0).toUpperCase() : <PersonIcon sx={{ fontSize: avatarSize * 0.6 }} />}
          </Avatar>
          {showLabel && (
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'var(--foreground)' }} noWrap>
              {user || 'Guest'}
            </Typography>
          )}
        </ButtonBase>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            bgcolor: 'var(--card-bg)',
            color: 'var(--foreground)',
            border: '1px solid var(--card-border)',
            backdropFilter: 'blur(10px)',
            minWidth: 180,
            '& .MuiListItemIcon-root': { minWidth: 36 },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'var(--card-bg)',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
              borderLeft: '1px solid var(--card-border)',
              borderTop: '1px solid var(--card-border)',
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => handleNavigate('/dashboard/settings')} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" sx={{ color: 'var(--foreground)' }} />
          </ListItemIcon>
          個人設定
        </MenuItem>
        <MenuItem onClick={() => handleNavigate('/dashboard/about')} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
          <ListItemIcon>
            <InfoOutlinedIcon fontSize="small" sx={{ color: 'var(--foreground)' }} />
          </ListItemIcon>
          關於網站
        </MenuItem>
        <Divider sx={{ borderColor: 'var(--card-border)' }} />
        <MenuItem onClick={handleLogout} sx={{ color: '#ff4d4d', '&:hover': { bgcolor: 'rgba(255,77,77,0.1)' } }}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" sx={{ color: '#ff4d4d' }} />
          </ListItemIcon>
          登出
        </MenuItem>
      </Menu>
    </>
  );
};

export default UserMenu;
