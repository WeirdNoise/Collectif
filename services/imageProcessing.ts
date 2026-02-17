/**
 * Analyzes an image and returns CSS filters to standardize it
 * to a target brightness and contrast (Identity Photo Standard).
 */
export const analyzeAndNormalizeImage = (imageSrc: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageSrc;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      // Resize for faster processing (we don't need 4k pixels to check brightness)
      canvas.width = 200;
      canvas.height = 200 * (img.height / img.width);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let r, g, b, avg;
      let colorSum = 0;
      
      // 1. Calculate Average Luminance (Brightness)
      for (let x = 0, len = data.length; x < len; x += 4) {
        r = data[x];
        g = data[x + 1];
        b = data[x + 2];
        
        // Perceived brightness formula
        avg = Math.floor((r * 0.299) + (g * 0.587) + (b * 0.114));
        colorSum += avg;
      }

      const brightness = Math.floor(colorSum / (canvas.width * canvas.height));

      // 2. Calculate Correction
      // Standard ID photo usually implies a well-lit face. 
      // Target brightness ~128 (mid-grey) to ~140.
      const targetBrightness = 135; 
      
      // Calculate multiplier. Example: if image is 80, we need 135/80 = 1.68x brightness
      let brightnessMultiplier = targetBrightness / Math.max(brightness, 10); // avoid div by zero
      
      // Clamp values to avoid extreme noise (e.g., trying to brighten a black image)
      brightnessMultiplier = Math.max(0.8, Math.min(brightnessMultiplier, 1.6));

      // 3. Simple Contrast Heuristic
      // If brightness was very low or very high, the image likely lacks contrast after adjustment.
      let contrastMultiplier = 1.05; // Base slight boost
      
      // If we had to drastically brighten the image, boost contrast more to avoid "grey fog" look
      if (brightnessMultiplier > 1.2) {
        contrastMultiplier = 1.15;
      } else if (brightnessMultiplier < 0.9) {
        // If image was too bright, we dimmed it, so we might need a bit more definition
        contrastMultiplier = 1.1;
      }

      // 4. Saturation
      // Political/Profile photos benefit from a slight warmth/saturation boost
      const saturateMultiplier = 1.1;

      // Construct CSS Filter string
      // Note: Brightness in CSS filter: 1 is original. 0.5 is 50%.
      const filterString = `brightness(${brightnessMultiplier.toFixed(2)}) contrast(${contrastMultiplier.toFixed(2)}) saturate(${saturateMultiplier})`;

      resolve(filterString);
    };

    img.onerror = (e) => {
      console.error("Error analyzing image", e);
      resolve(''); // Return no filter on error
    };
  });
};