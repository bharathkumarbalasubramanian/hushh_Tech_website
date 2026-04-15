import { useNavigate } from 'react-router-dom';
import { useDisclosure } from '@chakra-ui/react';
import { useAuthSession } from '../../auth/AuthSessionProvider';

export function useDeleteAccountLogic() {
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { status, user } = useAuthSession();
  const isLoading = status === 'booting';
  const isLoggedIn = status === 'authenticated';
  const userEmail = user?.email || '';

  // Handle successful account deletion
  const handleAccountDeleted = () => {
    onClose();
    // Redirect to home page after deletion
    navigate('/');
  };

  // Handle login redirect
  const handleLoginRedirect = () => {
    navigate('/login?redirect=%2Fdelete-account');
  };

  return {
    isOpen,
    onOpen,
    onClose,
    isLoggedIn,
    isLoading,
    userEmail,
    handleAccountDeleted,
    handleLoginRedirect,
  };
}
