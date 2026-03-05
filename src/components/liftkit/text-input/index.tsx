"use client";
import { useMemo, useState } from "react";
import { propsToDataAttrs } from "@/lib/liftkit/utilities";
import "@/components/liftkit/text-input/text-input.css";
import Icon from "@/components/liftkit/icon";
import Row from "@/components/liftkit/row";
import Text from "@/components/liftkit/text";
import StateLayer from "@/components/liftkit/state-layer";
import { IconName } from "lucide-react/dynamic";
Text;

interface LkTextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  labelPosition?: "default" | "on-input";
  helpText?: string;
  placeholder?: string;
  name?: string;
  endIcon?: IconName;
  labelBackgroundColor?: LkColor;
  onEndIconClick?: () => void;
  "data-erase-spin"?: boolean; // for internal use to trigger erase animation
}

export default function TextInput({
  labelPosition = "default",
  helpText,
  placeholder = "Placeholder",
  name = "Label",
  endIcon = "search",
  labelBackgroundColor,
  onEndIconClick,
  ...restProps
}: LkTextInputProps) {
  const textInputProps = useMemo(
    () => propsToDataAttrs({ labelPosition }, "text-input"),
    [labelPosition],
  );

  const [inputValue, setInputValue] = useState("");

  const isControlled = restProps.value !== undefined;
  const currentValue = isControlled ? restProps.value : inputValue;

  return (
    <div data-lk-component="text-input" {...textInputProps}>
      {labelPosition === "default" && (
        <label htmlFor={name} className="label">
          {name}
        </label>
      )}
      <div
        data-lk-text-input-el="input-wrap"
        data-lk-input-help-text={helpText ? "true" : "false"}
        data-help-text={helpText}
      >
        {labelPosition === "on-input" && (
          <label
            htmlFor={name}
            className={`body${labelBackgroundColor ? ` bg-${labelBackgroundColor}` : ""}${currentValue ? " on-field-with-value-set" : ""}`}
          >
            {name}
          </label>
        )}
        <input
          type="text"
          name={name}
          id={name}
          placeholder={labelPosition !== "on-input" ? placeholder : ""}
          value={currentValue}
          onChange={(e) => {
            if (!isControlled) setInputValue(e.target.value);
            restProps.onChange?.(e);
          }}
          {...restProps}
        />
        <StateLayer />
        {onEndIconClick ? (
          <button
            type="button"
            onClick={onEndIconClick}
            className="end-icon-button"
            aria-label={endIcon}
            data-erase-spin={restProps["data-erase-spin"] ? "true" : "false"}
          >
            <Icon name={endIcon} />
          </button>
        ) : (
          <Icon name={endIcon} />
        )}
        {/* implementation omitted for brevity */}
      </div>
      {helpText && (
        <Row alignItems="center">
          <Icon
            name="info"
            fontClass="capline"
            color="outline"
            opticShift={true}
          />
          <Text color="outline" fontClass="caption" className="m-left-2xs">
            Help text goes here
          </Text>
        </Row>
      )}
    </div>
  );
}
