type CloudinaryImageOptions = {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'limit';
  quality?: 'auto' | number;
};

export function getOptimizedCloudinaryImageUrl(
  url: string | null | undefined,
  options: CloudinaryImageOptions = {},
): string | undefined {
  if (!url) return undefined;
  if (!url.includes('/image/upload/')) return url;

  const transforms = [
    options.width ? `w_${options.width}` : null,
    options.height ? `h_${options.height}` : null,
    options.crop ? `c_${options.crop}` : null,
    `q_${options.quality ?? 'auto'}`,
    'f_auto',
  ].filter(Boolean);

  return url.replace('/image/upload/', `/image/upload/${transforms.join(',')}/`);
}
