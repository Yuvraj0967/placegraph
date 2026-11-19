import './globals.css';
import { AuthGate } from '@/components/Auth';
import Nav from '@/components/Nav';

export const metadata = { title: 'PlaceGraph', description: 'Placement management on MySQL + Neo4j' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthGate>
          <Nav />
          <main>{children}</main>
        </AuthGate>
      </body>
    </html>
  );
}
