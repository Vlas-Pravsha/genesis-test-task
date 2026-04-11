export const hasMediaType = (headerValue: string, mediaType: string) =>
  headerValue.toLowerCase().includes(mediaType.toLowerCase());
