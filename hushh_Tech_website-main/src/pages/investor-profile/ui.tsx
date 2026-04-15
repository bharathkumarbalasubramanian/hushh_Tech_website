import {
  Box,
  Container,
  Spinner,
  Center,
  Text,
  VStack,
  HStack,
  IconButton,
  Button,
  Icon,
} from "@chakra-ui/react";
import { CheckCircleIcon, CopyIcon } from "@chakra-ui/icons";
import { Share2 } from "lucide-react";
import { FaApple, FaGoogle } from "react-icons/fa";
import { InvestorProfileForm } from "../../components/investorProfile/InvestorProfileForm";
import { InvestorProfileReview } from "../../components/investorProfile/InvestorProfileReview";
import WalletCardPreviewModal from "../../components/wallet/WalletCardPreviewModal";
import { useInvestorProfileLogic } from "./logic";

function InvestorProfilePage() {
  const {
    step,
    isProcessing,
    profile,
    error,
    userData,
    isApplePassLoading,
    isGooglePassLoading,
    isWalletPreviewOpen,
    appleWalletSupported,
    appleWalletSupportMessage,
    googleWalletSupported,
    googleWalletSupportMessage,
    profileUrl,
    walletPreview,
    handleFormSubmit,
    handleProfileConfirm,
    handleCopyURL,
    handleShare,
    handleAppleWalletDownload,
    handleGoogleWalletDownload,
    openWalletPreview,
    closeWalletPreview,
  } = useInvestorProfileLogic();

  // Loading state
  if (step === "loading") {
    return (
      <Container maxW="container.xl" py={{ base: 12, md: 20 }}>
        <Center>
          <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" />
            <Text>Loading your profile...</Text>
          </VStack>
        </Center>
      </Container>
    );
  }

  // Complete state
  if (step === "complete") {
    return (
      <Container maxW="container.md" py={12}>
        <Center>
          <VStack spacing={6} w="full">
            <CheckCircleIcon boxSize={16} color="green.500" />

            <Text
              fontSize="2xl"
              fontWeight="500"
              color="green.500"
              textAlign="center"
            >
              ✓ Profile Created Successfully!
            </Text>

            <Text fontSize="md" color="gray.600" textAlign="center">
              Your public profile is now live and ready to share!
            </Text>

            {/* URL Display Box */}
            <Box
              w="full"
              bg="gray.50"
              border="1px solid"
              borderColor="gray.200"
              borderRadius="lg"
              p={6}
            >
              <Text fontSize="sm" color="gray.600" mb={2} fontWeight="medium">
                📍 Your Public Profile URL:
              </Text>

              <HStack
                bg="white"
                p={3}
                borderRadius="md"
                border="1px solid"
                borderColor="gray.300"
                spacing={2}
              >
                <Text
                  fontSize="sm"
                  color="blue.600"
                  fontWeight="medium"
                  flex={1}
                  isTruncated
                >
                  {profileUrl}
                </Text>
                <IconButton
                  icon={<CopyIcon />}
                  onClick={handleCopyURL}
                  size="sm"
                  colorScheme="blue"
                  variant="ghost"
                  aria-label="Copy URL"
                />
              </HStack>

              <HStack mt={4} spacing={2}>
                <Button
                  leftIcon={<Icon as={Share2} />}
                  onClick={handleShare}
                  colorScheme="blue"
                  size="sm"
                  flex={1}
                >
                  Share Profile
                </Button>
                <Button
                  onClick={handleCopyURL}
                  variant="outline"
                  size="sm"
                  flex={1}
                >
                  Copy Link
                </Button>
              </HStack>
            </Box>

            <Box
              w="full"
              bg="white"
              border="1px solid"
              borderColor="gray.200"
              borderRadius="lg"
              p={6}
              boxShadow="0 10px 30px rgba(15, 23, 42, 0.06)"
            >
              <VStack spacing={4}>
                <Button
                  onClick={openWalletPreview}
                  variant="outline"
                  size="sm"
                  w="full"
                  borderRadius="12px"
                  borderColor="gray.300"
                  h="44px"
                >
                  Preview Card
                </Button>
                <HStack spacing={4} justify="center" w="full">
                <Button
                  aria-label="Add to Apple Wallet"
                  onClick={handleAppleWalletDownload}
                  isDisabled={!appleWalletSupported}
                  isLoading={isApplePassLoading}
                  loadingText=""
                  spinner={<Spinner size="sm" color="#0B1120" />}
                  bg="white"
                  color="#0B1120"
                  borderRadius="12px"
                  border="1px solid #0B1120"
                  h="44px"
                  minW="120px"
                  px={4}
                  display="inline-flex"
                  alignItems="center"
                  justifyContent="center"
                  gap={2}
                  _hover={{ bg: "#F8FAFC" }}
                  _active={{ bg: "#F1F5F9", transform: "scale(0.98)" }}
                >
                  <Icon as={FaApple} boxSize={6} />
                </Button>
                <Button
                  aria-label="Add to Google Wallet"
                  onClick={handleGoogleWalletDownload}
                  isDisabled={!googleWalletSupported}
                  isLoading={isGooglePassLoading}
                  loadingText=""
                  spinner={<Spinner size="sm" color="#0B1120" />}
                  bg="white"
                  color="#0B1120"
                  borderRadius="12px"
                  border="1px solid #0B1120"
                  h="44px"
                  minW="120px"
                  px={4}
                  display="inline-flex"
                  alignItems="center"
                  justifyContent="center"
                  gap={2}
                  _hover={{ bg: "#F8FAFC" }}
                  _active={{ bg: "#F1F5F9", transform: "scale(0.98)" }}
                >
                  <Icon as={FaGoogle} boxSize={6} />
                </Button>
                </HStack>
              </VStack>
              {!appleWalletSupported && (
                <Text mt={3} fontSize="xs" color="gray.500" textAlign="center">
                  {appleWalletSupportMessage}
                </Text>
              )}
              {!googleWalletSupported && (
                <Text mt={3} fontSize="xs" color="gray.500" textAlign="center">
                  {googleWalletSupportMessage}
                </Text>
              )}
            </Box>

            <WalletCardPreviewModal
              isOpen={isWalletPreviewOpen}
              onClose={closeWalletPreview}
              preview={walletPreview}
              appleWalletSupported={appleWalletSupported}
              appleWalletSupportMessage={appleWalletSupportMessage}
              onAddToAppleWallet={handleAppleWalletDownload}
              isApplePassLoading={isApplePassLoading}
              googleWalletAvailable={googleWalletSupported}
              googleWalletSupportMessage={googleWalletSupportMessage}
              onAddToGoogleWallet={handleGoogleWalletDownload}
              isGooglePassLoading={isGooglePassLoading}
            />
          </VStack>
        </Center>
      </Container>
    );
  }

  // Error state
  if (error && step === "form") {
    return (
      <Container maxW="container.xl" py={{ base: 12, md: 20 }}>
        <Center>
          <VStack spacing={4}>
            <Text fontSize="xl" fontWeight="500" color="red.500">
              Error
            </Text>
            <Text color="gray.600">{error}</Text>
            <Text fontSize="sm" color="gray.500">
              Please try again or contact support
            </Text>
          </VStack>
        </Center>
      </Container>
    );
  }

  return (
    <Box minH="100dvh" bg="gray.50" py={{ base: 6, md: 8 }}>
      <Container maxW="container.xl">
        {step === "form" && (
          <InvestorProfileForm
            onSubmit={handleFormSubmit}
            isLoading={isProcessing}
            initialData={userData}
          />
        )}

        {step === "review" && profile && (
          <InvestorProfileReview
            profile={profile}
            onConfirm={handleProfileConfirm}
            isLoading={isProcessing}
          />
        )}
      </Container>
    </Box>
  );
}

export default InvestorProfilePage;
