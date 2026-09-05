import { ImageResponse } from "next/og";
import { PixelSchoolMarkPixels } from "../_icon/pixelSchoolMark";

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(<PixelSchoolMarkPixels size={512} solid />, {
    width: 512,
    height: 512,
  });
}
