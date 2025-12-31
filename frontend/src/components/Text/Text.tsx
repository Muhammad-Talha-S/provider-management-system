import React from "react";
import { twMerge } from "tailwind-merge";

type TextProps = {
  children: React.ReactNode;
  className?: string;
};

export const Text: React.FC<TextProps> = ({ children, className = "" }) => {
  return (
    <p className={twMerge("text-gray-600 text-sm", className)}>{children}</p>
  );
};
