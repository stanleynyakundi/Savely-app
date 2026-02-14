import { Providers } from "./providers";

export const metadata = {
  title: "Savely",
  description: "Micro-savings app",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
