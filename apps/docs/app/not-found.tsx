import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound(): React.ReactElement {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-muted-foreground">That page does not exist.</p>
      <div className="mt-6 flex justify-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/">Home</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/guides/">Guides</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/docs/">SDK</Link>
        </Button>
      </div>
    </div>
  );
}
