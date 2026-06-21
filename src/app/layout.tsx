import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Donewell Motor Retention 2020–2024 | Internal Analytics',
  description:
    'Five-year customer retention analysis of Donewell Insurance\'s motor portfolio: cohort decay, channel performance, product risk, CLV, and a prioritised action plan.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
