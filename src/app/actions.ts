'use server';
import 'server-only';
import { extractMetadata as extractMetadataLogic, LinkMetadata } from '@/lib/metadata';

export { type LinkMetadata };

export async function extractMetadata(url: string): Promise<LinkMetadata | null> {
  return extractMetadataLogic(url);
}
