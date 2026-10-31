"use client";

import { useEffect, useRef } from "react";
import { Box } from "styled-system/jsx";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxW?: string;
  variant?: "default" | "floating";
  placement?: "center" | "end";
  className?: string;
}

export default function Modal(props: ModalProps) {
  const {
    isOpen,
    onClose,
    children,
    maxW = "lg",
    variant = "default",
    placement = "center",
    className,
  } = props;
  const isFloating = variant === "floating";
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={1000}
      display="flex"
      alignItems={
        isFloating && placement === "end"
          ? { base: "flex-end", md: "center" }
          : "center"
      }
      justifyContent={placement === "end" ? "flex-end" : "center"}
      p={{ base: "2", md: "4" }}
      style={isFloating ? { pointerEvents: "none" } : undefined}
    >
      {isFloating ? null : (
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
      )}

      <Box
        className={className}
        position="relative"
        w="full"
        maxW={{ base: "full", md: maxW }}
        maxH={{ base: "85vh", md: "90vh" }}
        overflowY="auto"
        animation="scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
        style={
          isFloating
            ? { pointerEvents: "auto", maxWidth: maxW === "3xl" ? 768 : 640 }
            : undefined
        }
      >
        {children}
      </Box>
    </Box>
  );
}
