#!/bin/bash
# This script generates PNG icons from SVG using ImageMagick or rsvg-convert
# Run: chmod +x generate.sh && ./generate.sh

SVG_FILE="icon.svg"

# Create SVG source
cat > $SVG_FILE << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#2563eb"/>
  <text x="256" y="300" font-family="Arial, sans-serif" font-weight="bold" font-size="220" fill="white" text-anchor="middle">KC</text>
</svg>
EOF

for size in 72 96 128 144 152 192 384 512; do
  if command -v rsvg-convert &> /dev/null; then
    rsvg-convert -w $size -h $size $SVG_FILE -o "icon-${size}x${size}.png"
  elif command -v convert &> /dev/null; then
    convert -background none -resize ${size}x${size} $SVG_FILE "icon-${size}x${size}.png"
  else
    echo "Please install ImageMagick (convert) or librsvg (rsvg-convert)"
    break
  fi
  echo "Generated icon-${size}x${size}.png"
done

rm -f $SVG_FILE
echo "Done!"
