import type { Metadata } from "next";
import { Providers } from "./providers";
import { themeInitScript } from "./theme";

export const metadata: Metadata = {
  title: "warden",
  description: "Control panel for the warden bot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Must run synchronously before first paint to avoid a flash of
            the wrong theme -- see theme.tsx's doc comment on why this is
            a raw inline script rather than a React effect. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
