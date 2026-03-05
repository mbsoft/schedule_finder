import { NextResponse } from 'next/server';
import { getApiKey } from '@/lib/storage/data-access';

interface AutocompleteItem {
  title?: string;
  address?: {
    label?: string;
    postalCode?: string;
    city?: string;
    county?: string;
    state?: string;
    countryCode?: string;
  };
  position?: { lat: number; lng: number };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const apiKey = await getApiKey();
  if (!apiKey) {
    return NextResponse.json([]);
  }

  try {
    const params = new URLSearchParams({
      q: query,
      in: 'countryCode:GBR',
      limit: '8',
      key: apiKey,
    });

    const response = await fetch(
      `https://api.nextbillion.io/autocomplete?${params}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.items?.length > 0) {
        const suggestions = data.items
          .filter((item: AutocompleteItem) => item.address?.postalCode)
          .map((item: AutocompleteItem) => ({
            postcode: item.address!.postalCode!,
            title: item.title || '',
            label: item.address?.label || '',
            city: item.address?.city || '',
            county: item.address?.county || '',
            lat: item.position?.lat ?? null,
            lng: item.position?.lng ?? null,
          }));
        return NextResponse.json(suggestions);
      }
    }

    return NextResponse.json([]);
  } catch {
    return NextResponse.json([]);
  }
}
