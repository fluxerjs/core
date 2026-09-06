import { DownloadsStatClient } from '@/components/DownloadsStatClient';
import { loadNpmDownloadStats } from '@/lib/npm-downloads';

export async function DownloadsStat(): Promise<React.ReactElement | null> {
  const stats = await loadNpmDownloadStats();
  if (!stats) return null;
  return <DownloadsStatClient initial={stats} />;
}
