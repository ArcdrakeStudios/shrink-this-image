// A local, synthetic still image. No download, remote asset or personal content.
export async function createSampleImage() {
  const canvas = document.createElement('canvas');
  canvas.width = 1600; canvas.height = 1000;
  try {
    const context = canvas.getContext('2d');
    if (!context) throw new Error();
    const gradient = context.createLinearGradient(0, 0, 1600, 1000);
    gradient.addColorStop(0, '#17253d'); gradient.addColorStop(1, '#6741bd');
    // Transparent margins let users compare PNG/WebP with the JPG white background.
    context.fillStyle = gradient; context.fillRect(80, 80, 1440, 840);
    context.fillStyle = '#c5ef79';
    for (let i = 0; i < 12; i++) {
      context.beginPath(); context.arc(210 + i * 105, 480 + Math.sin(i) * 210, 38 + i * 2, 0, Math.PI * 2); context.fill();
    }
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob?.size || blob.type !== 'image/png') throw new Error();
    return new File([blob], 'sample.png', {type: 'image/png'});
  } catch {
    throw new Error('Could not create the sample image. Choose an image from your device instead.');
  } finally { canvas.width = 1; canvas.height = 1; }
}
