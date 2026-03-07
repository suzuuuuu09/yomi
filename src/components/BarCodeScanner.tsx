"use client";

import {
  BarcodeFormat,
  BrowserMultiFormatReader,
  DecodeHintType,
} from "@zxing/library";
import { useEffect, useRef } from "react";
import Heading from "~liftkit/heading";
import { Box, Center, styled as s } from "styled-system/jsx";
import Text from "~liftkit/text";
import Column from "./liftkit/column";

interface ScannerProps {
  onScan: (isbn: string) => void;
}

export const BarcodeScanner = ({ onScan }: ScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannedRef = useRef(false);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;
    const hints = new Map();
    // ISBNのみをターゲットにする
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]);
    if (videoRef.current) {
      codeReader.decodeFromVideoDevice(null, videoRef.current, (result) => {
        if (result) {
          const text = result.getText();
          // 13桁で"97"から始まるコードのみをISBNとして扱う
          const isIsbn = text.length === 13 && text.startsWith("97");
          if (!isIsbn) return;
          if (!scannedRef.current) {
            scannedRef.current = true;
            // スキャン成功後にカメラをオフにする
            codeReaderRef.current?.reset();
            onScan(text);
          }
        }
      });
    }
    return () => {
      codeReader.reset();
    };
  }, [onScan]);

  return (
    <Column alignItems="center" gap="md" style={{ padding: "1rem" }}>
      <Heading tag="h3" fontClass="title3-bold">
        バーコードをスキャン
      </Heading>
      <Box
        position="relative"
        width="full"
        maxW="md"
        aspectRatio="4/3"
        bg="gray.900"
        overflow="hidden"
        borderRadius="xl"
        boxShadow="lg"
      >
        <s.video
          muted
          ref={videoRef}
          width="full"
          height="full"
          objectFit="cover"
        />
        <Center position="absolute" inset={0} pointerEvents="none">
          <Box
            w="80%"
            h="40%"
            borderWidth="2px"
            borderColor="blue.400"
            borderStyle="dashed"
            borderRadius="md"
            boxShadow="0 0 0 9999px rgba(0, 0, 0, 0.5)" // ガイド枠の外側を暗くする
            position="relative"
          />
        </Center>
      </Box>
      <Text tag="p" fontClass="label" color="onsurface">
        97から始まるバーコードを読み込んでください
      </Text>
    </Column>
  );
};
