"use client";

import { Box } from "styled-system/jsx";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxW?: string;
}

export default function Modal(props: ModalProps) {
  const { isOpen, onClose, children, maxW = "lg" } = props;

  if (!isOpen) return null;

  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={1000}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={{ base: "2", md: "4" }}
    >
      <Box
        position="absolute"
        inset={0}
        w="full"
        h="full"
        border="none"
        onClick={onClose}
        animation="fadeIn 0.2s ease-out"
        style={{
          background: "#00000099",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />

      <Box
        position="relative"
        w="full"
        maxW={{ base: "full", md: maxW }}
        maxH={{ base: "85vh", md: "90vh" }}
        overflowY="auto"
        animation="scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      >
        {children}
      </Box>
    </Box>
  );
}
