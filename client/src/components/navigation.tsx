import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileImage, Files } from 'lucide-react';

export default function Navigation() {
  const [location] = useLocation();

  return (
    <Card className="mb-6">
      <div className="p-4">
        <nav className="flex space-x-4">
          <Link href="/">
            <Button
              variant={location === '/' ? 'default' : 'ghost'}
              className="flex items-center space-x-2"
              data-testid="nav-single-map"
            >
              <FileImage className="h-4 w-4" />
              <span>Single Map</span>
            </Button>
          </Link>
          <Link href="/batch">
            <Button
              variant={location === '/batch' ? 'default' : 'ghost'}
              className="flex items-center space-x-2"
              data-testid="nav-batch-processing"
            >
              <Files className="h-4 w-4" />
              <span>Batch Processing</span>
            </Button>
          </Link>
        </nav>
      </div>
    </Card>
  );
}