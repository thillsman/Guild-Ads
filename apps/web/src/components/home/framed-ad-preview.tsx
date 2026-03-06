import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function FramedAdPreview() {
  return (
    <Card className="border-primary/30 bg-background/95 shadow-xl">
      <CardHeader className="pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Actual In-App Ad
        </p>
        <CardTitle className="text-2xl leading-tight sm:text-3xl">
          A real ad placement inside a live app.
        </CardTitle>
        <CardDescription className="text-base">
          This screenshot shows how Guild Ads looks in context: one static ad, one clear CTA,
          and a format that stays out of the way until the user is ready to engage.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mx-auto max-w-[320px] sm:max-w-[340px]">
          <div className="relative aspect-square overflow-hidden rounded-[2.25rem] bg-black shadow-[0_30px_80px_-28px_rgba(15,23,42,0.45)] [mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.22)_10%,black_26%,black_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.22)_10%,black_26%,black_100%)]">
            <Image
              src="/home-ad-screenshot.webp"
              alt="Guild Ads example showing a real ad placement at the bottom of a live iPhone app screen"
              fill
              priority
              sizes="(min-width: 1024px) 320px, (min-width: 640px) 340px, 88vw"
              className="object-cover object-[center_bottom]"
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[26%] bg-gradient-to-b from-background via-background/70 to-transparent" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
