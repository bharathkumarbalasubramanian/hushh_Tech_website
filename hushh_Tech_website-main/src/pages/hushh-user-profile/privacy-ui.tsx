import React from "react";
import {
  Box, Heading, Text, VStack, HStack, Switch,
  Spinner, Button,
} from "@chakra-ui/react";
import { ArrowLeft, Save } from "lucide-react";
import { FIELD_LABELS, ONBOARDING_FIELD_LABELS } from "../../types/investorProfile";
import { usePrivacyControlsLogic, TOKENS } from "./privacy-logic";

const PrivacyControlsPage: React.FC = () => {
  const {
    loading,
    saving,
    privacySettings,
    handleToggle,
    handleSave,
    handleBackToProfile,
  } = usePrivacyControlsLogic();

  const tokens = TOKENS;

  if (loading) {
    return (
      <Box minH="100dvh" bg="white" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" color={tokens.blue} thickness="4px" />
          <Text color={tokens.secondary}>Loading privacy settings...</Text>
        </VStack>
      </Box>
    );
  }

  if (!privacySettings) {
    return null;
  }

  return (
    <Box minH="100dvh" bg="white" py={{ base: 8, md: 12 }}>
      <Box maxW="960px" mx="auto" px={{ base: 4, md: 6 }}>
        {/* Header */}
        <VStack align="stretch" spacing={4} mb={8}>
          <Button
            leftIcon={<ArrowLeft size={16} />}
            variant="ghost"
            alignSelf="flex-start"
            onClick={handleBackToProfile}
            color={tokens.blue}
            _hover={{ bg: "rgba(10,132,255,0.08)" }}
          >
            Back to Profile
          </Button>

          <Heading as="h1" fontSize={{ base: "24px", md: "28px" }} fontWeight="500" color={tokens.label}>
            Privacy Settings
          </Heading>

          <Text fontSize="14px" color={tokens.secondary}>
            Control which information is visible on your public investor profile. Toggle fields on or off to manage your privacy.
          </Text>
        </VStack>

        {/* Basic Info Section */}
        <Box mb={8}>
          <HStack justify="space-between" mb={3}>
            <Text fontSize="17px" fontWeight="500" color={tokens.label}>Basic Information</Text>
            <Text fontSize="13px" color={tokens.secondary}>
              {Object.values(privacySettings.basic_info).filter(Boolean).length} / {Object.keys(privacySettings.basic_info).length} visible
            </Text>
          </HStack>

          <Box
            border={`1px solid ${tokens.separator}`}
            borderRadius="12px"
            overflow="hidden"
          >
            {Object.entries(privacySettings.basic_info).map(([field, isVisible], index) => (
              <HStack
                key={field}
                justify="space-between"
                px={4}
                py={3}
                borderBottom={index < Object.keys(privacySettings.basic_info).length - 1 ? `1px solid ${tokens.separator}` : "none"}
                bg={isVisible ? "white" : "rgba(120,120,128,0.06)"}
              >
                <VStack align="start" spacing={0}>
                  <Text fontSize="15px" fontWeight="500" color={tokens.label}>
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                  </Text>
                  <Text fontSize="13px" color={isVisible ? tokens.green : tokens.secondary}>
                    {isVisible ? "Visible on public profile" : "Hidden from public profile"}
                  </Text>
                </VStack>
                <Switch
                  size="lg"
                  isChecked={isVisible}
                  onChange={() => handleToggle("basic_info", field)}
                  colorScheme="blue"
                />
              </HStack>
            ))}
          </Box>
        </Box>

        {/* Investment Profile Section */}
        <Box mb={8}>
          <HStack justify="space-between" mb={3}>
            <Text fontSize="17px" fontWeight="500" color={tokens.label}>Investment Profile (AI-Generated)</Text>
            <Text fontSize="13px" color={tokens.secondary}>
              {Object.values(privacySettings.investor_profile).filter(Boolean).length} / {Object.keys(privacySettings.investor_profile).length} visible
            </Text>
          </HStack>

          <Box
            border={`1px solid ${tokens.separator}`}
            borderRadius="12px"
            overflow="hidden"
          >
            {Object.entries(privacySettings.investor_profile).map(([field, isVisible], index) => (
              <HStack
                key={field}
                justify="space-between"
                px={4}
                py={3}
                borderBottom={index < Object.keys(privacySettings.investor_profile).length - 1 ? `1px solid ${tokens.separator}` : "none"}
                bg={isVisible ? "white" : "rgba(120,120,128,0.06)"}
              >
                <VStack align="start" spacing={0}>
                  <Text fontSize="15px" fontWeight="500" color={tokens.label}>
                    {FIELD_LABELS[field as keyof typeof FIELD_LABELS]}
                  </Text>
                  <Text fontSize="13px" color={isVisible ? tokens.green : tokens.secondary}>
                    {isVisible ? "Visible on public profile" : "Hidden from public profile"}
                  </Text>
                </VStack>
                <Switch
                  size="lg"
                  isChecked={isVisible}
                  onChange={() => handleToggle("investor_profile", field)}
                  colorScheme="blue"
                />
              </HStack>
            ))}
          </Box>
        </Box>

        {/* Onboarding Data Section */}
        <Box mb={8}>
          <HStack justify="space-between" mb={3}>
            <Text fontSize="17px" fontWeight="500" color={tokens.label}>Personal Information (Onboarding Data)</Text>
            <Text fontSize="13px" color={tokens.secondary}>
              {Object.values(privacySettings.onboarding_data).filter(Boolean).length} / {Object.keys(privacySettings.onboarding_data).length} visible
            </Text>
          </HStack>

          {/* Account Details */}
          <Box mb={4}>
            <Text fontSize="13px" fontWeight="500" color={tokens.secondary} px={4} py={2} bg="rgba(120,120,128,0.06)" borderRadius="8px 8px 0 0">
              ACCOUNT DETAILS
            </Text>
            <Box border={`1px solid ${tokens.separator}`} borderRadius="0 0 8px 8px" overflow="hidden">
              {['account_type', 'selected_fund', 'account_structure'].map((field, index, arr) => (
                <HStack
                  key={field}
                  justify="space-between"
                  px={4}
                  py={3}
                  borderBottom={index < arr.length - 1 ? `1px solid ${tokens.separator}` : "none"}
                  bg={privacySettings.onboarding_data[field as keyof typeof privacySettings.onboarding_data] ? "white" : "rgba(120,120,128,0.06)"}
                >
                  <VStack align="start" spacing={0}>
                    <Text fontSize="15px" fontWeight="500" color={tokens.label}>
                      {ONBOARDING_FIELD_LABELS[field]}
                    </Text>
                    <Text fontSize="13px" color={privacySettings.onboarding_data[field as keyof typeof privacySettings.onboarding_data] ? tokens.green : tokens.secondary}>
                      {privacySettings.onboarding_data[field as keyof typeof privacySettings.onboarding_data] ? "Visible" : "Hidden"}
                    </Text>
                  </VStack>
                  <Switch
                    size="lg"
                    isChecked={privacySettings.onboarding_data[field as keyof typeof privacySettings.onboarding_data]}
                    onChange={() => handleToggle("onboarding_data", field)}
                    colorScheme="blue"
                  />
                </HStack>
              ))}
            </Box>
          </Box>

          {/* Identity */}
          <Box mb={4}>
            <Text fontSize="13px" fontWeight="500" color={tokens.secondary} px={4} py={2} bg="rgba(120,120,128,0.06)" borderRadius="8px 8px 0 0">
              IDENTITY
            </Text>
            <Box border={`1px solid ${tokens.separator}`} borderRadius="0 0 8px 8px" overflow="hidden">
              {['legal_first_name', 'legal_last_name', 'date_of_birth', 'ssn_encrypted', 'citizenship_country', 'residence_country'].map((field, index, arr) => (
                <HStack
                  key={field}
                  justify="space-between"
                  px={4}
                  py={3}
                  borderBottom={index < arr.length - 1 ? `1px solid ${tokens.separator}` : "none"}
                  bg={privacySettings.onboarding_data[field as keyof typeof privacySettings.onboarding_data] ? "white" : "rgba(120,120,128,0.06)"}
                >
                  <VStack align="start" spacing={0}>
                    <Text fontSize="15px" fontWeight="500" color={tokens.label}>
                      {ONBOARDING_FIELD_LABELS[field]}
                      {field === 'ssn_encrypted' && (
                        <Text as="span" fontSize="11px" color={tokens.red} ml={2} fontWeight="500">
                          ⚠️ SENSITIVE
                        </Text>
                      )}
                    </Text>
                    <Text fontSize="13px" color={privacySettings.onboarding_data[field as keyof typeof privacySettings.onboarding_data] ? tokens.green : tokens.secondary}>
                      {privacySettings.onboarding_data[field as keyof typeof privacySettings.onboarding_data] ? "Visible" : "Hidden"}
                    </Text>
                  </VStack>
                  <Switch
                    size="lg"
                    isChecked={privacySettings.onboarding_data[field as keyof typeof privacySettings.onboarding_data]}
                    onChange={() => handleToggle("onboarding_data", field)}
                    colorScheme="blue"
                  />
                </HStack>
              ))}
            </Box>
          </Box>

          {/* Contact & Address */}
          <Box mb={4}>
            <Text fontSize="13px" fontWeight="500" color={tokens.secondary} px={4} py={2} bg="rgba(120,120,128,0.06)" borderRadius="8px 8px 0 0">
              CONTACT & ADDRESS
            </Text>
            <Box border={`1px solid ${tokens.separator}`} borderRadius="0 0 8px 8px" overflow="hidden">
              {['phone_number', 'phone_country_code', 'address_line_1', 'address_line_2', 'city', 'state', 'zip_code', 'address_country'].map((field, index, arr) => (
                <HStack
                  key={field}
                  justify="space-between"
                  px={4}
                  py={3}
                  borderBottom={index < arr.length - 1 ? `1px solid ${tokens.separator}` : "none"}
                  bg={privacySettings.onboarding_data[field as keyof typeof privacySettings.onboarding_data] ? "white" : "rgba(120,120,128,0.06)"}
                >
                  <VStack align="start" spacing={0}>
                    <Text fontSize="15px" fontWeight="500" color={tokens.label}>
                      {ONBOARDING_FIELD_LABELS[field]}
                    </Text>
                    <Text fontSize="13px" color={privacySettings.onboarding_data[field as keyof typeof privacySettings.onboarding_data] ? tokens.green : tokens.secondary}>
                      {privacySettings.onboarding_data[field as keyof typeof privacySettings.onboarding_data] ? "Visible" : "Hidden"}
                    </Text>
                  </VStack>
                  <Switch
                    size="lg"
                    isChecked={privacySettings.onboarding_data[field as keyof typeof privacySettings.onboarding_data]}
                    onChange={() => handleToggle("onboarding_data", field)}
                    colorScheme="blue"
                  />
                </HStack>
              ))}
            </Box>
          </Box>

          {/* Investment Details */}
          <Box mb={4}>
            <Text fontSize="13px" fontWeight="500" color={tokens.secondary} px={4} py={2} bg="rgba(120,120,128,0.06)" borderRadius="8px 8px 0 0">
              INVESTMENT DETAILS
            </Text>
            <Box border={`1px solid ${tokens.separator}`} borderRadius="0 0 8px 8px" overflow="hidden">
              {['initial_investment_amount', 'recurring_investment_enabled', 'recurring_frequency', 'recurring_amount', 'recurring_day_of_month'].map((field, index, arr) => (
                <HStack
                  key={field}
                  justify="space-between"
                  px={4}
                  py={3}
                  borderBottom={index < arr.length - 1 ? `1px solid ${tokens.separator}` : "none"}
                  bg={privacySettings.onboarding_data[field as keyof typeof privacySettings.onboarding_data] ? "white" : "rgba(120,120,128,0.06)"}
                >
                  <VStack align="start" spacing={0}>
                    <Text fontSize="15px" fontWeight="500" color={tokens.label}>
                      {ONBOARDING_FIELD_LABELS[field]}
                    </Text>
                    <Text fontSize="13px" color={privacySettings.onboarding_data[field as keyof typeof privacySettings.onboarding_data] ? tokens.green : tokens.secondary}>
                      {privacySettings.onboarding_data[field as keyof typeof privacySettings.onboarding_data] ? "Visible" : "Hidden"}
                    </Text>
                  </VStack>
                  <Switch
                    size="lg"
                    isChecked={privacySettings.onboarding_data[field as keyof typeof privacySettings.onboarding_data]}
                    onChange={() => handleToggle("onboarding_data", field)}
                    colorScheme="blue"
                  />
                </HStack>
              ))}
            </Box>
          </Box>
        </Box>

        {/* Save Button */}
        <Box position="sticky" bottom={4} bg="white" py={4} borderTop={`1px solid ${tokens.separator}`}>
          <Button
            leftIcon={<Save size={16} />}
            colorScheme="blue"
            size="lg"
            width="full"
            onClick={handleSave}
            isLoading={saving}
            loadingText="Saving..."
          >
            Save Privacy Settings
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default PrivacyControlsPage;
