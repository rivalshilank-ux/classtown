import { ImageResponse } from "next/og";
import { PixelSchoolMarkPixels } from "./_icon/pixelSchoolMark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<PixelSchoolMarkPixels size={180} solid />, { ...size });
}
