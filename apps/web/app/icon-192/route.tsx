import { ImageResponse } from "next/og";
import { PixelSchoolMarkPixels } from "../_icon/pixelSchoolMark";

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(<PixelSchoolMarkPixels size={192} solid />, {
    width: 192,
    height: 192,
  });
}
