import type { IconName } from "lucide-react/dynamic";
import { css } from "styled-system/css";
import { Box, Flex } from "styled-system/jsx";
import CloseButton from "@/components/shares/CloseButton";
import Badge from "~liftkit/badge";
import Card from "~liftkit/card";
import Heading from "~liftkit/heading";
import Text from "~liftkit/text";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: IconName;
  children?: React.ReactNode;
  onCloseAction: () => void;
}

export default function FeatureCard(props: FeatureCardProps) {
  const { title, description, icon, children, onCloseAction } = props;

  return (
    <Card
      material="glass"
      variant="outline"
      scaleFactor="body"
      className={css({ boxShadow: "2xl" })}
    >
      <CloseButton
        onClick={onCloseAction}
        className={css({
          position: "absolute!",
          top: "4!",
          right: "4!",
          zIndex: 10,
          "& svg": {
            color: "slate.400!",
          },
          _hover: {
            "& svg": {
              color: "white!",
            },
          },
        })}
      />

      <Box p={1}>
        <Flex align="center" gap={3} mb={6}>
          <Badge
            icon={icon}
            scale="md"
            className={css({
              bg: "indigo.500/15!",
              border: "2px solid!",
              borderColor: "indigo.500/20!",
              color: "indigo.500!",
            })}
          />
          <Box>
            <Heading
              tag="h2"
              fontClass="title3-bold"
              className={css({ color: "white" })}
            >
              {title}
            </Heading>
            <Text
              tag="p"
              fontClass="caption"
              className={css({ color: "slate.400" })}
            >
              {description}
            </Text>
          </Box>
        </Flex>
        {children}
      </Box>
    </Card>
  );
}
