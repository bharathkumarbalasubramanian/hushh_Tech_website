import React from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Icon,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { FaEye, FaLock, FaPercent } from "react-icons/fa";
import { MdAnalytics, MdPsychology, MdSmartToy, MdVerifiedUser } from "react-icons/md";
import { useNavigate } from "react-router-dom";

const MotionBox = motion(Box);
const MotionButton = motion(Button);

const appleEase: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const tokens = {
  title: "#1f2937",
  body: "#4b5563",
  primary: "#3a63b8",
  gradientFrom: "#3a63b8",
  gradientTo: "#06b6d4",
  cardBorder: "#f3f4f6",
};

const fontFamily = 'Manrope, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';

const featureCards = [
  {
    title: "Data Driven",
    body: "Real-time market analytics.",
    icon: MdAnalytics,
    iconBg: "#dbeafe",
    iconColor: "#3b82f6",
    bodyMaxW: "113px",
  },
  {
    title: "Low Fees",
    body: "Maximize your total returns.",
    icon: FaPercent,
    iconBg: "#d1fae5",
    iconColor: "#059669",
    bodyMaxW: "129px",
  },
  {
    title: "Expert Vetted",
    body: "Curated top opportunities.",
    icon: MdVerifiedUser,
    iconBg: "#ffedd5",
    iconColor: "#ea580c",
    bodyMaxW: "92px",
  },
  {
    title: "Automated",
    body: "Hands-free smart investing.",
    icon: MdSmartToy,
    iconBg: "#ede9fe",
    iconColor: "#7c3aed",
    bodyMaxW: "117px",
  },
];

const trustChips = [
  {
    label: "AI-First",
    icon: MdPsychology,
    bg: "#f3e8ff",
    border: "#f3e8ff",
    iconColor: "#7c3aed",
    width: "160px",
  },
  {
    label: "Secure",
    icon: FaLock,
    bg: "#dcfce7",
    border: "#dcfce7",
    iconColor: "#16a34a",
    width: "160px",
  },
  {
    label: "Transparent",
    icon: FaEye,
    bg: "#dbeafe",
    border: "#dbeafe",
    iconColor: "#2563eb",
    width: "200px",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: appleEase,
    },
  },
};

const FeatureCard = ({ item }: { item: typeof featureCards[0] }) => {
  return (
    <MotionBox
      variants={itemVariants}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="space-between"
      h="168px"
      p="17px"
      borderRadius="24px"
      bg="white"
      border="1px solid"
      borderColor={tokens.cardBorder}
      boxShadow="0px 2px 5px -1px rgba(0,0,0,0.05), 0px 1px 3px -1px rgba(0,0,0,0.03)"
    >
      <Flex
        w="48px"
        h="48px"
        borderRadius="16px"
        align="center"
        justify="center"
        bg={item.iconBg}
      >
        <Icon as={item.icon} boxSize="18px" color={item.iconColor} />
      </Flex>

      <VStack spacing={2} textAlign="center">
        <Text
          fontSize="15px"
          fontWeight="700"
          color={tokens.title}
          lineHeight="22.5px"
          fontFamily={fontFamily}
        >
          {item.title}
        </Text>
        <Text
          fontSize="12px"
          fontWeight="400"
          color={tokens.body}
          lineHeight="19.25px"
          maxW={item.bodyMaxW}
          fontFamily={fontFamily}
        >
          {item.body}
        </Text>
      </VStack>
    </MotionBox>
  );
};

const WhyChooseSection = () => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const navigate = useNavigate();

  return (
    <Box
      ref={sectionRef}
      bg="white"
      display="flex"
      justifyContent="center"
      w="100%"
      px={{ base: 6, md: 8 }}
      pt="48px"
      pb="32px"
      fontFamily={fontFamily}
    >
      <MotionBox
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={containerVariants}
        display="flex"
        w="100%"
        maxW="448px"
        flexDirection="column"
        alignItems="center"
      >
        <MotionBox variants={itemVariants} display="flex" justifyContent="center" mb={6}>
          <Flex
            align="center"
            justify="center"
            px="20px"
            py="8px"
            borderRadius="9999px"
            bg={tokens.primary}
            boxShadow="0px 1px 2px 0px rgba(0,0,0,0.05)"
          >
            <Text
              fontSize="12px"
              fontWeight="700"
              letterSpacing="0.6px"
              textTransform="uppercase"
              color="white"
              lineHeight="16px"
              fontFamily={fontFamily}
            >
              Why Hushh
            </Text>
          </Flex>
        </MotionBox>

        <MotionBox variants={itemVariants} textAlign="center" mb={8}>
          <Heading
            as="h2"
            fontSize={{ base: "40px", md: "44px" }}
            fontWeight="700"
            lineHeight={{ base: "50px", md: "54px" }}
            letterSpacing="-1px"
            color={tokens.title}
            mb={4}
            fontFamily={fontFamily}
          >
            The Hushh
            <br />
            <Box
              as="span"
              bgGradient={`linear(to-r, ${tokens.gradientFrom}, ${tokens.gradientTo})`}
              bgClip="text"
              color="transparent"
            >
              Advantage
            </Box>
          </Heading>
          <Text
            fontSize="18px"
            fontWeight="400"
            color={tokens.body}
            lineHeight="29.25px"
            maxW="283px"
            mx="auto"
            fontFamily={fontFamily}
          >
            Built for the modern investor who values clarity over complexity.
          </Text>
        </MotionBox>

        <MotionBox variants={itemVariants} w="100%" mb={8}>
          <SimpleGrid columns={2} spacing={3}>
            {featureCards.map((item) => (
              <FeatureCard key={item.title} item={item} />
            ))}
          </SimpleGrid>
        </MotionBox>

        <MotionBox variants={itemVariants} w="100%" mb={8}>
          <VStack spacing={3} w="100%" align="center">
            <Flex w="100%" justify="center" gap={3}>
              {trustChips.slice(0, 2).map((chip) => (
                <Flex
                  key={chip.label}
                  w={chip.width}
                  maxW={chip.width}
                  align="center"
                  justify="center"
                  gap={2}
                  px="17px"
                  py="13px"
                  borderRadius="16px"
                  bg={chip.bg}
                  border="1px solid"
                  borderColor={chip.border}
                  boxShadow="0px 1px 2px 0px rgba(0,0,0,0.05)"
                >
                  <Icon as={chip.icon} boxSize="12px" color={chip.iconColor} />
                  <Text
                    fontSize="14px"
                    fontWeight="600"
                    color={tokens.title}
                    lineHeight="20px"
                    fontFamily={fontFamily}
                  >
                    {chip.label}
                  </Text>
                </Flex>
              ))}
            </Flex>

            <Flex
              w={trustChips[2].width}
              maxW={trustChips[2].width}
              align="center"
              justify="center"
              gap={2}
              px="25px"
              py="13px"
              borderRadius="16px"
              bg={trustChips[2].bg}
              border="1px solid"
              borderColor={trustChips[2].border}
              boxShadow="0px 1px 2px 0px rgba(0,0,0,0.05)"
            >
              <Icon as={trustChips[2].icon} boxSize="12px" color={trustChips[2].iconColor} />
              <Text
                fontSize="14px"
                fontWeight="600"
                color={tokens.title}
                lineHeight="20px"
                fontFamily={fontFamily}
              >
                {trustChips[2].label}
              </Text>
            </Flex>
          </VStack>
        </MotionBox>

        <MotionButton
          variants={itemVariants}
          onClick={() => navigate("/discover-fund-a")}
          display="flex"
          w="100%"
          h="52px"
          borderRadius="24px"
          bg={tokens.primary}
          color="white"
          fontSize="18px"
          fontWeight="600"
          lineHeight="28px"
          fontFamily={fontFamily}
          boxShadow="0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -4px rgba(0,0,0,0.1)"
          _hover={{ bg: "#355aa8" }}
          _active={{ transform: "scale(0.98)" }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          Explore our Approach
        </MotionButton>
      </MotionBox>
    </Box>
  );
};

export default WhyChooseSection;
