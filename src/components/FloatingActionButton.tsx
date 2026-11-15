import React, { useId, useState } from 'react';
import {
  Fab,
  Button,
  useTheme,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import OpenItemForm from './OpenItemForm';
import { useAuth } from '../context/AuthContext';
import type { Department } from '../domain/contracts';
import { departmentLabel } from '../app/access';

interface FloatingActionButtonProps {
  department: Department;
  onItemAdded: () => void;
  disabled?: boolean;
  /** 'inline' renders a labelled button in the page header (UI1); default keeps the floating button. */
  variant?: 'fab' | 'inline';
}

/**
 * Floating Action Button (FAB) that provides quick access to add new products.
 * Shows a modal with the OpenItemForm when clicked.
 */
const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  department,
  onItemAdded,
  disabled = false,
  variant = 'fab',
}) => {
  const [showModal, setShowModal] = useState(false);
  const titleId = useId();
  const { profile, user, isOffline } = useAuth();

  // Offline opening is allowed: C3 saves the intent on the device before sending.
  const isDisabled = disabled || !profile || !user;

  const handleOpenModal = () => {
    if (!isDisabled) {
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  // Keep the dialog open after a receipt so the confirmation (with expiry) stays visible
  // and the next item can be opened; the list refreshes behind it.
  const handleItemAdded = () => {
    onItemAdded();
  };


  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <>
      {variant === 'inline' ? (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenModal}
          disabled={isDisabled}
          sx={{ minHeight: 44, px: 2, flexShrink: 0, fontWeight: 700 }}
        >
          פתיחת פריט
        </Button>
      ) : (
      <Fab
        color="primary"
        aria-label="פתיחת פריט"
        onClick={handleOpenModal}
        disabled={isDisabled}
        sx={{
          position: 'fixed',
          bottom: { xs: 16, sm: 24, md: 32 },
          right: { xs: 16, sm: 24, md: 32 },
          width: { xs: 56, sm: 64 },
          height: { xs: 56, sm: 64 },
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          boxShadow: { xs: '0 4px 20px rgba(0,0,0,0.15)', sm: '0 8px 32px rgba(0,0,0,0.15)' },
          '&:hover': {
            boxShadow: { xs: '0 6px 24px rgba(0,0,0,0.2)', sm: '0 12px 40px rgba(0,0,0,0.2)' },
            transform: 'scale(1.05)',
            background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
          },
          '&:active': {
            transform: 'scale(0.95)',
          },
          '&:disabled': {
            background: theme.palette.grey[400],
            color: theme.palette.grey[600],
          },
          transition: 'all 0.2s ease-in-out',
          zIndex: 1000,
        }}
        title={isOffline ? 'פתיחת פריט (יישמר במכשיר עד שהחיבור יחזור)' : 'פתיחת פריט'}
      >
        <AddIcon sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }} />
      </Fab>
      )}

      {/* Open-item dialog: full screen on phones so the form and its sticky footer use the whole viewport;
          MUI traps focus inside and returns it to the opener on close. */}
      <Dialog
        open={showModal}
        onClose={handleCloseModal}
        fullScreen={fullScreen}
        fullWidth
        maxWidth="sm"
        aria-labelledby={titleId}
        dir="rtl"
        PaperProps={{ sx: { display: 'flex', flexDirection: 'column' } }}
      >
        <DialogTitle
          id={titleId}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, py: 1, px: 2, borderBottom: 1, borderColor: 'divider', fontSize: '1.1rem', fontWeight: 700 }}
        >
          {`פתיחת פריט — ${departmentLabel(department)}`}
          <IconButton aria-label="סגירה" onClick={handleCloseModal} sx={{ width: 44, height: 44 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', pt: '16px !important', pb: 0 }}>
          <OpenItemForm department={department} onItemAdded={handleItemAdded} disabled={isDisabled} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FloatingActionButton;