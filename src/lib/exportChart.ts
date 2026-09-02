/**
 * Utility for exporting SVG elements or HTML canvases to PNG images.
 */
export function exportSvgToPng(svgElement: SVGSVGElement | null, filename: string, title?: string) {
  if (!svgElement) return;

  try {
    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    const width = svgElement.clientWidth || 800;
    const height = svgElement.clientHeight || 400;

    clone.setAttribute('width', `${width * 2}`);
    clone.setAttribute('height', `${height * 2}`);

    const svgData = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * 2;
      canvas.height = height * 2 + (title ? 60 : 0);
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // Dark background matching terminal theme
        ctx.fillStyle = '#0B0D12';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        let yOffset = 0;
        if (title) {
          ctx.fillStyle = '#F5F5F5';
          ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText(title, 32, 40);

          ctx.fillStyle = '#9299A8';
          ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText(`Thunder Edge Analytics • ${new Date().toLocaleDateString('fr-FR')}`, 32, 60);
          yOffset = 50;
        }

        ctx.drawImage(img, 0, yOffset, width * 2, height * 2);

        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `${filename}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  } catch (err) {
    console.error('Failed to export chart as PNG:', err);
  }
}
