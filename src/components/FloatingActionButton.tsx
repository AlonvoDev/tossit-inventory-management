import React, { useState } from 'react';
import {
  Fab,
  useTheme,
  alpha,
  Modal,
  Box,
  IconButton,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import OpenItemForm from './OpenItemForm';
import { useAuth } from '../context/AuthContext';

interface FloatingActionButtonProps {
  area: string;
  onItemAdded: () => void;
  disabled?: boolean;
}

/**
 * Floating Action Button (FAB) that provides quick access to add new products.
 * Shows a modal with the OpenItemForm when clicked.
 */
const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  area,
  onItemAdded,
  disabled = false
}) => {
  const [showModal, setShowModal] = useState(false);
  const { profile, user, isOffline } = useAuth();

  const handleOpenModal = () => {
    if (!disabled && !isOffline) {
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleItemAdded = () => {
    setShowModal(false);
    onItemAdded();
  };

  const isDisabled = disabled || isOffline || !profile || !user;

  const theme = useTheme();

  return (
    <>
      {/* Modern Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add product"
        onClick={handleOpenModal}
        disabled={isDisabled}
        sx={{
          position: 'fixed',
          bottom: { xs: 24, sm: 32 },
          right: { xs: 24, sm: 32 },
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          '&:hover': {
            boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
            transform: 'scale(1.05)',
            background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
          },
          '&:disabled': {
            background: theme.palette.grey[400],
            color: theme.palette.grey[600],
          },
          transition: 'all 0.2s ease-in-out',
          zIndex: 1000,
        }}
        title={isDisabled ? 'לא זמין במצב לא מקוון' : 'הוסף מוצר חדש'}
      >
        <AddIcon sx={{ fontSize: '2rem' }} />
      </Fab>

      {/* Modern Modal with OpenItemForm */}
      <Modal
        open={showModal}
        onClose={handleCloseModal}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Box
          sx={{
            background: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
            borderRadius: 4,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
            maxWidth: 600,
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 3,
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              background: alpha(theme.palette.primary.main, 0.05),
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              הוסף מוצר חדש - {area}
            </Typography>
            <IconButton
              onClick={handleCloseModal}
              sx={{
                background: alpha(theme.palette.grey[500], 0.1),
                '&:hover': {
                  background: alpha(theme.palette.grey[500], 0.2),
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Modal Body */}
          <Box sx={{ p: 3, overflow: 'auto', flexGrow: 1 }}>
            <OpenItemForm
              area={area}
              businessId={profile?.businessId}
              userId={user?.uid}
              onItemAdded={handleItemAdded}
              disabled={isDisabled}
              areas={['מטבח', 'בר', 'מחסן', 'אחר']}
            />
          </Box>
        </Box>
      </Modal>
    </>
  );
};

export default FloatingActionButton;