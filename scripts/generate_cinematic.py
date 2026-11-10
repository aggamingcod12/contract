"""Generate the local, scroll-scrubbed contract film asset."""
from pathlib import Path
import math
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "contract-cinematic.mp4"
POSTER = ROOT / "public" / "contract-cinematic-poster.jpg"
W, H, FPS, SECONDS = 1280, 720, 24, 12
FRAMES = FPS * SECONDS
Y, X = np.mgrid[0:H, 0:W]
Xn, Yn = X / W, Y / H


def render(t: float) -> Image.Image:
    # Warm ivory paper with a traveling blush/lavender light source.
    cx = 0.5 + 0.14 * math.sin(t * 0.34)
    cy = 0.48 + 0.09 * math.cos(t * 0.28)
    glow = np.exp(-(((Xn - cx) / 0.45) ** 2 + ((Yn - cy) / 0.6) ** 2) * 2.2)
    edge = np.clip((np.abs(Xn - 0.5) * 0.23 + np.abs(Yn - 0.5) * 0.08), 0, 0.11)
    base = np.zeros((H, W, 3), dtype=np.float32)
    base[:, :, 0] = 248 - edge * 170 + glow * 3
    base[:, :, 1] = 241 - edge * 170 - glow * 5
    base[:, :, 2] = 239 - edge * 150 + glow * 1
    lavender = np.exp(-(((Xn - (0.76 - t * 0.008)) / 0.28) ** 2 + ((Yn - 0.31) / 0.42) ** 2) * 4)
    base[:, :, 0] += lavender * 2
    base[:, :, 1] -= lavender * 5
    base[:, :, 2] += lavender * 8
    image = Image.fromarray(np.uint8(np.clip(base, 0, 255)), "RGB").convert("RGBA")
    draw = ImageDraw.Draw(image, "RGBA")

    # One barely visible orbit keeps the composition airy and contemporary.
    center = (int(W * 0.67), int(H * 0.48))
    radius = 245
    shift = math.sin(t * 0.32) * 8
    draw.ellipse((center[0] - radius - shift, center[1] - radius + shift,
                  center[0] + radius + shift, center[1] + radius - shift),
                 outline=(160, 112, 143, 16), width=1)

    scene = min(7, int(t / 1.5))
    cx, cy = int(W * 0.68), int(H * 0.51 + math.sin(t * 0.6) * 7)
    bob = math.sin(t * 1.1) * 7
    if scene <= 1:
        # The folded letter opens during the title and introduction scenes.
        open_amount = max(0.0, min(1.0, (t - 0.6) / 1.8))
        ew, eh = 245, 160
        shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        sd = ImageDraw.Draw(shadow)
        sd.rounded_rectangle((cx-ew//2+7, cy-eh//2+14, cx+ew//2+7, cy+eh//2+14), radius=12, fill=(78,47,68,45))
        image = Image.alpha_composite(image, shadow.filter(ImageFilter.GaussianBlur(20)))
        draw = ImageDraw.Draw(image, "RGBA")
        box = (cx-ew//2, cy-eh//2, cx+ew//2, cy+eh//2)
        draw.rounded_rectangle(box, radius=12, fill=(255,250,247,248), outline=(190,143,159,180), width=2)
        fold = int(eh * (0.48 - 0.44 * open_amount))
        draw.polygon([(box[0],box[1]),(cx,cy+fold),(box[2],box[1])], fill=(241,213,218,245))
        draw.line([(box[0],box[3]),(cx,cy+fold),(box[2],box[3])], fill=(211,169,182,175), width=2)
        draw.ellipse((cx-16,cy-16,cx+16,cy+16), fill=(190,105,135,235))
        draw.ellipse((cx-6,cy-6,cx+6,cy+6), fill=(255,239,241,245))
    elif scene == 2:
        # Mentor scene: a warm code window and a little Python terminal.
        left, top = cx-235, cy-170+int(bob)
        draw = ImageDraw.Draw(image, "RGBA")
        draw.rounded_rectangle((left+8,top+12,left+478,top+326), radius=22, fill=(72,49,77,35))
        draw.rounded_rectangle((left,top,left+470,top+314), radius=20, fill=(255,253,250,247), outline=(194,145,161,180), width=2)
        draw.rounded_rectangle((left+18,top+18,left+452,top+72), radius=13, fill=(48,42,57,245))
        for dot,color in enumerate(((235,143,154,255),(230,190,132,255),(160,194,162,255))):
            x=left+38+dot*22; draw.ellipse((x-5,top+41-5,x+5,top+41+5),fill=color)
        draw.rounded_rectangle((left+20,top+88,left+450,top+292), radius=12, fill=(48,42,57,250))
        for row in range(6):
            yy=top+116+row*27
            draw.rounded_rectangle((left+44,yy,left+70,yy+4),radius=2,fill=(190,159,206,210))
            length=120+((row*53)%190)
            col=((220,163,186,225),(191,206,159,230),(227,193,136,230))[row%3]
            draw.rounded_rectangle((left+88,yy,left+88+length,yy+5),radius=2,fill=col)
    elif scene == 3:
        # Student scene: two friendly silhouettes learning together at a laptop.
        draw = ImageDraw.Draw(image, "RGBA")
        draw.ellipse((cx-205,cy-180+int(bob),cx-75,cy-50+int(bob)),fill=(220,207,239,245),outline=(156,131,184,220),width=2)
        draw.ellipse((cx+70,cy-165-int(bob),cx+200,cy-35-int(bob)),fill=(242,201,210,245),outline=(196,126,151,220),width=2)
        for hx,hy in ((cx-140,cy-118+int(bob)),(cx+135,cy-106-int(bob))):
            draw.ellipse((hx-11,hy-8,hx,hy+4),fill=(150,93,125,200)); draw.ellipse((hx,hy-8,hx+11,hy+4),fill=(150,93,125,200)); draw.polygon([(hx-11,hy-3),(hx+11,hy-3),(hx,hy+13)],fill=(150,93,125,200))
        draw.rounded_rectangle((cx-155,cy+35,cx+155,cy+178),radius=18,fill=(58,52,67,245))
        draw.rounded_rectangle((cx-135,cy+52,cx+135,cy+152),radius=8,fill=(235,230,241,250))
        for row in range(3):
            yy=cy+75+row*24
            draw.ellipse((cx-108,yy-5,cx-98,yy+5),outline=(184,119,145,235),width=2)
            draw.rounded_rectangle((cx-85,yy-2,cx+95-(row*14),yy+2),radius=2,fill=(145,119,158,145))
        draw.polygon([(cx-180,cy+180),(cx+180,cy+180),(cx+225,cy+205),(cx-225,cy+205)],fill=(209,177,193,220))
    elif scene == 4:
        # Privileges scene: the stacked cards in the UI echo this drifting gift pile.
        draw = ImageDraw.Draw(image, "RGBA")
        for offset,angle,color in ((22,-8,(224,204,234,245)),(10,5,(246,210,211,248)),(0,-1,(255,253,250,252))):
            x1=cx-175+offset; y1=cy-185+int(bob)+offset
            draw.rounded_rectangle((x1,y1,x1+350,y1+255),radius=18,fill=color,outline=(184,126,150,200),width=2)
            draw.ellipse((x1+28,y1+28,x1+62,y1+62),outline=(191,109,139,230),width=3)
            draw.line((x1+102,y1+45,x1+300,y1+45),fill=(179,126,150,190),width=3)
            for row in range(3): draw.rounded_rectangle((x1+32,y1+104+row*35,x1+230+(row%2)*48,y1+110+row*35),radius=3,fill=(156,122,153,125))
        for sx,sy in ((cx-220,cy-100),(cx+210,cy+125),(cx+192,cy-205)):
            draw.line((sx-10,sy,sx+10,sy),fill=(197,119,147,200),width=2); draw.line((sx,sy-10,sx,sy+10),fill=(197,119,147,200),width=2)
    elif scene == 5:
        # Boundaries scene: a readable formal sheet with rose-highlighted clauses.
        draw = ImageDraw.Draw(image, "RGBA")
        left,top=cx-190,cy-205+int(bob)
        draw.rounded_rectangle((left+8,top+12,left+388,top+414),radius=10,fill=(78,47,68,35))
        draw.rounded_rectangle((left,top,left+380,top+402),radius=10,fill=(255,253,250,250),outline=(204,170,171,220),width=2)
        draw.rounded_rectangle((left+35,top+34,left+345,top+48),radius=4,fill=(75,66,83,220))
        for row in range(7):
            yy=top+88+row*38
            if row in (1,4,6): draw.rounded_rectangle((left+32,yy-8,left+346,yy+14),radius=4,fill=(249,224,230,245))
            draw.ellipse((left+36,yy-1,left+44,yy+7),fill=(188,104,132,215))
            draw.rounded_rectangle((left+58,yy,left+292+(row%3)*16,yy+5),radius=3,fill=(119,108,121,150))
        draw.ellipse((left+247,top+270,left+333,top+356),outline=(199,119,145,210),width=3)
        draw.ellipse((left+261,top+284,left+319,top+342),outline=(199,119,145,150),width=1)
    elif scene == 6:
        # Declaration scene: two genuine signature lines with a graceful ink flourish.
        draw = ImageDraw.Draw(image, "RGBA")
        left,top=cx-240,cy-150+int(bob)
        draw.rounded_rectangle((left+10,top+14,left+490,top+320),radius=18,fill=(78,47,68,34))
        draw.rounded_rectangle((left,top,left+480,top+306),radius=18,fill=(255,253,250,250),outline=(205,170,177,200),width=2)
        for i in range(2):
            yy=top+98+i*112
            draw.ellipse((left+30,yy-20,left+70,yy+20),fill=((219,207,239,255) if i==0 else (244,204,214,255)))
            draw.line((left+105,yy+25,left+410,yy+25),fill=(155,127,142,170),width=2)
            pts=[]
            for n in range(45):
                xx=left+115+n*6.3
                py=yy+2+math.sin(n*.44+i)*8*math.sin(math.pi*n/45)
                pts.append((xx,py))
            draw.line(pts,fill=(112,64,100,225),width=3)
        draw.polygon([(cx+190,cy+120),(cx+265,cy-45),(cx+232,cy-57),(cx+157,cy+106)],fill=(128,75,113,220))
    else:
        # Review scene: status cards and a sealed, completed-looking document.
        draw = ImageDraw.Draw(image, "RGBA")
        left,top=cx-240,cy-175+int(bob)
        draw.rounded_rectangle((left,top,left+480,top+350),radius=18,fill=(255,253,250,250),outline=(201,158,174,220),width=2)
        for i in range(2):
            yy=top+52+i*72
            draw.ellipse((left+28,yy-13,left+54,yy+13),fill=((216,205,236,255) if i==0 else (245,203,214,255)))
            draw.rounded_rectangle((left+72,yy-11,left+228,yy-5),radius=3,fill=(90,77,93,185))
            draw.rounded_rectangle((left+72,yy+3,left+188,yy+8),radius=3,fill=(142,128,141,125))
            draw.rounded_rectangle((left+350,yy-13,left+438,yy+13),radius=12,fill=(226,239,226,255))
        draw.rounded_rectangle((left+28,top+190,left+452,top+198),radius=4,fill=(232,222,226,255))
        draw.rounded_rectangle((left+28,top+190,left+270,top+198),radius=4,fill=(205,125,151,245))
        draw.ellipse((left+340,top+230,left+440,top+330),fill=(196,112,142,250),outline=(255,249,247,255),width=5)
        draw.ellipse((left+360,top+250,left+420,top+310),outline=(255,239,243,240),width=2)

    # Floating petal silhouettes; fixed seeds keep frame-to-frame motion smooth.
    for idx in range(28):
        seed = idx * 73.17
        px = int((seed * 17 + math.sin(t * 0.25 + idx) * 50) % W)
        py = int((seed * 31 + t * (13 + idx % 8) + math.sin(t + idx) * 24) % H)
        size = 3 + idx % 4
        alpha = 35 + (idx * 7) % 45
        color = [(195, 123, 149, alpha), (185, 163, 201, alpha), (232, 187, 158, alpha)][idx % 3]
        draw.ellipse((px - size * 0.6, py - size * 1.6, px + size * 0.6, py + size * 1.6), fill=color)
    return image.convert("RGB")


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg = subprocess.Popen([
        "ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pixel_format", "rgb24",
        "-video_size", f"{W}x{H}", "-framerate", str(FPS), "-i", "-", "-an", "-c:v", "libx264",
        "-preset", "medium", "-crf", "25", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(OUTPUT),
    ], stdin=subprocess.PIPE)
    assert ffmpeg.stdin is not None
    for frame in range(FRAMES):
        ffmpeg.stdin.write(render(frame / FPS).tobytes())
    ffmpeg.stdin.close()
    if ffmpeg.wait() != 0:
        raise SystemExit("ffmpeg failed while encoding the cinematic background")
    render(0.6).save(POSTER, quality=86, optimize=True)
    print(f"Wrote {OUTPUT} and {POSTER}")


if __name__ == "__main__":
    main()
