"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
export default function ThemeProvider({ children, ...props }: React.PropsWithChildren<{ attribute?: string; defaultTheme?: string; enableSystem?: boolean; disableTransitionOnChange?: boolean }>) {
  return <NextThemesProvider {...props as any}>{children}</NextThemesProvider>;
}
