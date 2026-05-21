import { Metadata } from 'next';

/**
 * Generate default metadata for pages
 */
export function generateDefaultMetadata(title?: string, description?: string): Metadata {
  const siteName = 'GetCareerTruth';
  const defaultTitle = title ? `${title} | ${siteName}` : siteName;
  const defaultDescription =
    description ||
    'Connect with industry professionals for career guidance. Get honest insights about companies, roles, and career paths from verified employees.';

  return {
    title: defaultTitle,
    description: defaultDescription,
    keywords: [
      'career guidance',
      'career advice',
      'industry insights',
      'company reviews',
      'career counseling',
      'job advice',
      'career mentorship',
      'professional networking',
    ],
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://getcareertruth.com'),
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: '/',
      siteName,
      title: defaultTitle,
      description: defaultDescription,
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: defaultTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: defaultTitle,
      description: defaultDescription,
      images: ['/og-image.png'],
      creator: '@getcareertruth',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
    },
  };
}

/**
 * Generate metadata for employee profile pages
 */
export function generateEmployeeMetadata(
  name: string,
  company: string,
  designation: string
): Metadata {
  const title = `${name} - ${designation} at ${company}`;
  const description = `Book a call with ${name}, ${designation} at ${company}. Get honest insights about the company, role, and career path.`;

  return generateDefaultMetadata(title, description);
}

/**
 * Generate metadata for booking pages
 */
export function generateBookingMetadata(employeeName: string): Metadata {
  const title = `Book a Call with ${employeeName}`;
  const description = `Schedule a 15-minute call with ${employeeName}. Get personalized career guidance and industry insights.`;

  return generateDefaultMetadata(title, description);
}

/**
 * Generate metadata for chat pages
 */
export function generateChatMetadata(): Metadata {
  const title = 'Chat';
  const description = 'Connect with peers and professionals. Ask questions, share experiences, and grow together.';

  return generateDefaultMetadata(title, description);
}

/**
 * Generate metadata for transcript pages
 */
export function generateTranscriptMetadata(): Metadata {
  const title = 'Call Transcripts';
  const description = 'Access your call transcripts, review key points, and download summaries for future reference.';

  return generateDefaultMetadata(title, description);
}
