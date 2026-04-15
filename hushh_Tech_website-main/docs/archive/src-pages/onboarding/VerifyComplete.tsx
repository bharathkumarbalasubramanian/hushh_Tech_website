import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  VStack,
  Text,
  Button,
  Icon,
  Spinner,
} from '@chakra-ui/react';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import config from '../../resources/config/config';
import { upsertOnboardingData } from '../../services/onboarding/upsertOnboardingData';

type VerificationResult = 'verified' | 'processing' | 'requires_input' | 'failed' | 'loading';

function VerifyCompletePage() {
  const navigate = useNavigate();
  const [result, setResult] = useState<VerificationResult>('loading');
  const [pollingCount, setPollingCount] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    checkVerificationStatus();
  }, []);

  useEffect(() => {
    if (result === 'processing' && pollingCount < 10) {
      const timer = setTimeout(() => {
        checkVerificationStatus();
        setPollingCount((prev) => prev + 1);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [result, pollingCount]);

  const checkVerificationStatus = async () => {
    if (!config.supabaseClient) {
      return;
    }

    try {
      const {
        data: { user },
      } = await config.supabaseClient.auth.getUser();

      if (!user) {
        navigate('/login');
        return;
      }

      const { data: verification } = await config.supabaseClient
        .from('identity_verifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (verification) {
        switch (verification.stripe_status) {
          case 'verified':
            setResult('verified');
            await upsertOnboardingData(user.id, {
              identity_verified: true,
              identity_verified_at: new Date().toISOString(),
            });
            break;
          case 'processing':
          case 'pending':
            setResult('processing');
            break;
          case 'requires_input':
            setResult('requires_input');
            break;
          case 'failed':
          case 'canceled':
            setResult('failed');
            break;
          default:
            setResult('processing');
        }
      } else {
        setResult('processing');
      }
    } catch (error) {
      console.error('Error checking status:', error);
      setResult('processing');
    }
  };

  const handleContinue = () => {
    navigate('/hushh-user-profile');
  };

  const handleRetry = () => {
    navigate('/onboarding/verify');
  };

  const renderContent = () => {
    switch (result) {
      case 'loading':
        return (
          <VStack spacing={6}>
            <Box
              w="100px"
              h="100px"
              borderRadius="full"
              bg="gray.100"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Spinner size="xl" color="#2b8cee" thickness="4px" />
            </Box>
            <Text fontSize="2xl" fontWeight="600" color="#0B1120">
              Checking Status...
            </Text>
            <Text color="gray.600" textAlign="center">
              Please wait while we confirm your verification.
            </Text>
          </VStack>
        );

      case 'verified':
        return (
          <VStack spacing={6}>
            <Box
              w="100px"
              h="100px"
              borderRadius="full"
              bg="green.100"
              display="flex"
              alignItems="center"
              justifyContent="center"
              animation="pulse 1s ease-in-out"
            >
              <Icon as={CheckCircle} boxSize={16} color="green.500" />
            </Box>
            <Text fontSize="2xl" fontWeight="600" color="#0B1120">
              Verification Complete
            </Text>
            <Text color="gray.600" textAlign="center" maxW="400px">
              Your identity has been verified successfully. You now have full access to all features.
            </Text>
            <Button
              onClick={handleContinue}
              h="56px"
              w="full"
              maxW="320px"
              borderRadius="full"
              bgGradient="linear(to-r, #2b8cee, #38bdf8)"
              color="white"
              fontWeight="600"
              fontSize="lg"
              rightIcon={<Icon as={ArrowRight} />}
              boxShadow="0 10px 25px rgba(43, 140, 238, 0.35)"
              _hover={{
                bgGradient: 'linear(to-r, #2070c0, #2b8cee)',
                boxShadow: '0 12px 30px rgba(43, 140, 238, 0.45)',
              }}
            >
              Continue to Profile
            </Button>
          </VStack>
        );

      case 'processing':
        return (
          <VStack spacing={6}>
            <Box
              w="100px"
              h="100px"
              borderRadius="full"
              bg="blue.100"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={Clock} boxSize={16} color="blue.500" />
            </Box>
            <Text fontSize="2xl" fontWeight="600" color="#0B1120">
              Verification in Progress
            </Text>
            <Text color="gray.600" textAlign="center" maxW="400px">
              Your verification is being processed. This usually takes just a few moments.
            </Text>
            <VStack spacing={2} w="full" maxW="320px">
              <Box
                w="full"
                h="4px"
                bg="gray.200"
                borderRadius="full"
                overflow="hidden"
              >
                <Box
                  h="full"
                  bgGradient="linear(to-r, #2b8cee, #38bdf8)"
                  animation="loading 2s ease-in-out infinite"
                  w="60%"
                />
              </Box>
              <Text fontSize="sm" color="gray.500">
                {pollingCount < 10 ? 'Checking status...' : 'Taking longer than expected'}
              </Text>
            </VStack>
            <Button
              onClick={handleContinue}
              variant="outline"
              h="48px"
              w="full"
              maxW="320px"
              borderRadius="full"
              borderColor="gray.300"
              color="gray.700"
              fontWeight="500"
              _hover={{ bg: 'gray.50' }}
            >
              Continue Anyway
            </Button>
            <Text fontSize="xs" color="gray.500" textAlign="center">
              You'll be notified when verification is complete
            </Text>
          </VStack>
        );

      case 'requires_input':
        return (
          <VStack spacing={6}>
            <Box
              w="100px"
              h="100px"
              borderRadius="full"
              bg="yellow.100"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={AlertCircle} boxSize={16} color="yellow.600" />
            </Box>
            <Text fontSize="2xl" fontWeight="600" color="#0B1120">
              Additional Info Needed
            </Text>
            <Text color="gray.600" textAlign="center" maxW="400px">
              We need some additional information to complete your verification. Please try again.
            </Text>
            <Button
              onClick={handleRetry}
              h="56px"
              w="full"
              maxW="320px"
              borderRadius="full"
              bgGradient="linear(to-r, #2b8cee, #38bdf8)"
              color="white"
              fontWeight="600"
              fontSize="lg"
              leftIcon={<Icon as={RefreshCw} />}
              boxShadow="0 10px 25px rgba(43, 140, 238, 0.35)"
              _hover={{
                bgGradient: 'linear(to-r, #2070c0, #2b8cee)',
              }}
            >
              Try Again
            </Button>
            <Button
              onClick={handleContinue}
              variant="ghost"
              color="gray.500"
              fontWeight="500"
            >
              I'll do this later
            </Button>
          </VStack>
        );

      case 'failed':
        return (
          <VStack spacing={6}>
            <Box
              w="100px"
              h="100px"
              borderRadius="full"
              bg="red.100"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={AlertCircle} boxSize={16} color="red.500" />
            </Box>
            <Text fontSize="2xl" fontWeight="600" color="#0B1120">
              Verification Failed
            </Text>
            <Text color="gray.600" textAlign="center" maxW="400px">
              We couldn't verify your identity. This could be due to unclear images or mismatched information.
            </Text>
            <Button
              onClick={handleRetry}
              h="56px"
              w="full"
              maxW="320px"
              borderRadius="full"
              bgGradient="linear(to-r, #2b8cee, #38bdf8)"
              color="white"
              fontWeight="600"
              fontSize="lg"
              leftIcon={<Icon as={RefreshCw} />}
              boxShadow="0 10px 25px rgba(43, 140, 238, 0.35)"
              _hover={{
                bgGradient: 'linear(to-r, #2070c0, #2b8cee)',
              }}
            >
              Try Again
            </Button>
            <Button
              onClick={handleContinue}
              variant="ghost"
              color="gray.500"
              fontWeight="500"
            >
              Continue without verification
            </Button>
            <Text fontSize="xs" color="gray.500" textAlign="center">
              Need help? Contact support@hushh.ai
            </Text>
          </VStack>
        );
    }
  };

  return (
    <Box className="onboarding-shell" minH="100dvh" h="100dvh" bg="white" display="flex" flexDirection="column" mx="auto">
      <Box as="main" flex="1" minH={0} overflowY="auto" px={{ base: 4, md: 5 }} pt={{ base: 8, md: 10 }} pb={8}>
        <Box maxW="500px" mx="auto" textAlign="center">
          {renderContent()}
        </Box>
      </Box>

      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(0.95); opacity: 0.7; }
            50% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes loading {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(0%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
    </Box>
  );
}

export default VerifyCompletePage;
