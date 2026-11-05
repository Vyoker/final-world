"""Generator aset pixel-art orisinal untuk Final World. Jalankan: python3 tools/make_assets.py"""
import random
from PIL import Image, ImageDraw, ImageFilter
OUT = __file__.rsplit('/tools/', 1)[0] + '/assets/'

def outline(img, col=(20, 16, 28, 255)):
    w, h = img.size; px = img.load(); res = img.copy(); rp = res.load()
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 0:
                for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    nx, ny = x+dx, y+dy
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] > 0:
                        rp[x, y] = col; break
    return res

def shade(c, f): return tuple(max(0, min(255, int(v*f))) for v in c[:3]) + (255,)

# ---------------- tiles 16x16 ----------------
def tile(name, base, fn=None, seed=1, noise=14):
    rnd = random.Random(seed); im = Image.new('RGBA', (16, 16), base + (255,)); px = im.load()
    for y in range(16):
        for x in range(16):
            d = rnd.randint(-noise, noise); px[x, y] = tuple(max(0, min(255, base[i]+d)) for i in range(3)) + (255,)
    if fn: fn(ImageDraw.Draw(im), rnd, im)
    im.save(OUT + 'tiles/' + name + '.png')

def grass(d, r, im):
    for _ in range(14):
        x, y = r.randint(0, 14), r.randint(1, 14); d.line([(x, y), (x, y-2)], fill=(90, 170, 70, 255))
    for _ in range(2):
        x, y = r.randint(1, 14), r.randint(1, 14); d.point((x, y), fill=(255, 235, 120, 255))
def water(d, r, im):
    for y in (3, 8, 13):
        for x in range(0, 16, 4): d.line([(x, y), (x+2, y)], fill=(150, 200, 255, 255))
def tree(d, r, im):
    d.rectangle([7, 11, 8, 15], fill=(100, 62, 30, 255))
    d.ellipse([1, 0, 14, 12], fill=(30, 110, 50, 255)); d.ellipse([3, 1, 9, 6], fill=(60, 150, 70, 255))
    d.ellipse([1, 0, 14, 12], outline=(15, 60, 28, 255))
def house(d, r, im):
    d.rectangle([0, 0, 15, 15], fill=(150, 95, 50, 255))
    for y in range(0, 16, 4): d.line([(0, y), (15, y)], fill=(110, 65, 32, 255))
    d.polygon([(0, 7), (8, 0), (15, 7)], fill=(190, 60, 50, 255)); d.rectangle([0, 6, 15, 7], fill=(140, 40, 35, 255))
    d.rectangle([2, 9, 5, 12], fill=(255, 235, 150, 255)); d.rectangle([10, 9, 13, 12], fill=(255, 235, 150, 255))
def road(d, r, im):
    for _ in range(8):
        x, y = r.randint(0, 13), r.randint(0, 13); d.rectangle([x, y, x+1, y+1], fill=(170, 140, 90, 255))
def door(d, r, im):
    d.rectangle([0, 0, 15, 15], fill=(194, 163, 107, 255))
    d.rectangle([3, 1, 12, 15], fill=(92, 59, 30, 255)); d.rectangle([3, 1, 12, 15], outline=(50, 30, 14, 255)); d.point((10, 9), fill=(255, 215, 90, 255))
def hdoor(d, r, im):
    d.rectangle([0, 0, 15, 15], fill=(150, 95, 50, 255)); d.rectangle([4, 3, 11, 15], fill=(59, 36, 18, 255)); d.rectangle([4, 3, 11, 15], outline=(30, 18, 8, 255)); d.point((9, 10), fill=(255, 215, 90, 255))
def rock(d, r, im):
    d.polygon([(0, 15), (2, 5), (7, 1), (13, 4), (15, 15)], fill=(90, 90, 105, 255)); d.polygon([(3, 6), (7, 2), (10, 5), (6, 8)], fill=(125, 125, 142, 255))
    d.line([(0, 15), (2, 5), (7, 1), (13, 4), (15, 15)], fill=(40, 40, 52, 255))
def cavefloor(d, r, im):
    for _ in range(5):
        x, y = r.randint(0, 12), r.randint(0, 12); d.rectangle([x, y, x+2, y+1], fill=(100, 90, 72, 255))

tile('grass', (74, 143, 60), grass, 1); tile('water', (42, 95, 168), water, 2, 8); tile('tree', (74, 143, 60), tree, 3, 6)
tile('house', (150, 95, 50), house, 4, 4); tile('road', (194, 163, 107), road, 5, 8); tile('door', (194, 163, 107), door, 6, 0)
tile('housedoor', (150, 95, 50), hdoor, 7, 0); tile('rock', (77, 77, 87), rock, 8, 6); tile('cave', (122, 110, 90), cavefloor, 9, 10)

# ---------------- characters: sheet 64x16 (down, up, left, right) ----------------
def person(skin, hair, body, legs, hat=None, robe=False, accent=None, dirn=0, frame=0):
    """frame: 0=diam, 1=langkah A, 2=langkah B. dirn: 0 bawah, 1 atas, 2 kiri, 3 kanan."""
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    side = dirn in (2, 3); sw = 1 if (dirn == 3) else -1
    # kaki / ujung jubah
    if robe:
        d.rectangle([4, 10, 11, 13], fill=body)
        if frame == 0: d.rectangle([5, 14, 6, 14], fill=legs); d.rectangle([9, 14, 10, 14], fill=legs)
        elif frame == 1: d.rectangle([5, 14, 6, 15], fill=legs); d.rectangle([4, 13, 11, 13], fill=body)
        else: d.rectangle([9, 14, 10, 15], fill=legs); d.rectangle([4, 13, 11, 13], fill=body)
    else:
        d.rectangle([5, 9, 10, 12], fill=body)
        if not side:
            lA, lB = {0: (14, 14), 1: (13, 15), 2: (15, 13)}[frame] if False else ((14, 14) if frame == 0 else ((13, 15) if frame == 1 else (15, 13)))
            d.rectangle([5, 12, 6, lA], fill=legs); d.rectangle([9, 12, 10, lB], fill=legs)
        else:
            if frame == 0: d.rectangle([6, 12, 9, 14], fill=legs)
            elif frame == 1: d.rectangle([4, 12, 6, 14], fill=legs); d.rectangle([9, 12, 11, 14], fill=legs)
            else: d.rectangle([6, 12, 7, 14], fill=legs); d.rectangle([8, 12, 9, 13], fill=legs)
    # lengan mengayun
    if not side:
        aL, aR = (10, 10) if frame == 0 else ((9, 11) if frame == 1 else (11, 9))
        d.rectangle([3, aL, 4, aL + 2], fill=skin); d.rectangle([11, aR, 12, aR + 2], fill=skin)
        d.rectangle([3, aL - 1, 4, aL - 1], fill=accent or body); d.rectangle([11, aR - 1, 12, aR - 1], fill=accent or body)
    else:
        off = 0 if frame == 0 else (2 if frame == 1 else -2) * sw
        d.rectangle([7 + off // 2, 10, 8 + off // 2, 12], fill=skin)
    d.rectangle([4, 9, 11, 9], fill=accent or body)
    bob = 0 if frame == 0 else -1
    d.rectangle([5, 3 + bob, 10, 9 + bob], fill=skin)
    if dirn == 1: d.rectangle([5, 3 + bob, 10, 6 + bob], fill=hair); d.rectangle([5, 7 + bob, 10, 8 + bob], fill=hair)
    else:
        d.rectangle([5, 3 + bob, 10, 4 + bob], fill=hair)
        if dirn == 0: d.point((6, 6 + bob), fill=(20, 20, 30, 255)); d.point((9, 6 + bob), fill=(20, 20, 30, 255))
        elif dirn == 2: d.point((6, 6 + bob), fill=(20, 20, 30, 255)); d.rectangle([9, 4 + bob, 10, 8 + bob], fill=hair)
        else: d.point((9, 6 + bob), fill=(20, 20, 30, 255)); d.rectangle([5, 4 + bob, 6, 8 + bob], fill=hair)
    if hat == 'pointy': d.polygon([(3, 4 + bob), (8, -2 + bob), (12, 4 + bob)], fill=accent)
    if hat == 'helm': d.rectangle([4, 2 + bob, 11, 4 + bob], fill=accent); d.rectangle([7, 0 + bob, 8, 2 + bob], fill=(220, 60, 60, 255))
    if hat == 'hood': d.rectangle([4, 2 + bob, 11, 5 + bob], fill=accent); d.rectangle([4, 5 + bob, 5, 8 + bob], fill=accent); d.rectangle([10, 5 + bob, 11, 8 + bob], fill=accent)
    return outline(im)

def sheet(name, **kw):
    """48x64: kolom = frame (diam, langkah A, langkah B), baris = arah (bawah, atas, kiri, kanan)."""
    s = Image.new('RGBA', (48, 64), (0, 0, 0, 0))
    for r in range(4):
        for c in range(3): s.paste(person(dirn=r, frame=c, **kw), (c*16, r*16))
    s.save(OUT + 'chars/' + name + '.png')
SK = (255, 224, 178, 255)
sheet('warrior', skin=SK, hair=(120, 70, 30, 255), body=(200, 60, 55, 255), legs=(80, 80, 110, 255), hat='helm', accent=(170, 175, 190, 255))
sheet('thief', skin=SK, hair=(60, 40, 30, 255), body=(70, 140, 80, 255), legs=(60, 50, 40, 255), hat='hood', accent=(45, 100, 55, 255))
sheet('whitemage', skin=SK, hair=(240, 240, 250, 255), body=(245, 245, 250, 255), legs=(245, 245, 250, 255), hat='hood', robe=True, accent=(210, 50, 60, 255))
sheet('blackmage', skin=(60, 50, 90, 255), hair=(30, 30, 60, 255), body=(80, 60, 160, 255), legs=(80, 60, 160, 255), hat='pointy', robe=True, accent=(50, 40, 110, 255))
sheet('npc', skin=SK, hair=(180, 180, 180, 255), body=(110, 80, 160, 255), legs=(90, 60, 40, 255), robe=True, accent=(230, 200, 90, 255))
sheet('merchant', skin=SK, hair=(90, 50, 20, 255), body=(230, 170, 50, 255), legs=(70, 50, 30, 255), hat='hood', accent=(160, 100, 30, 255))

# ---------------- enemies 32x32 ----------------
def goblin():
    im = Image.new('RGBA', (32, 32), (0, 0, 0, 0)); d = ImageDraw.Draw(im); g = (90, 180, 80, 255)
    d.polygon([(3, 10), (10, 12), (9, 16)], fill=g); d.polygon([(29, 10), (22, 12), (23, 16)], fill=g)  # ears
    d.ellipse([8, 6, 24, 22], fill=g); d.rectangle([10, 21, 22, 29], fill=(140, 90, 50, 255)); d.rectangle([11, 28, 14, 31], fill=g); d.rectangle([18, 28, 21, 31], fill=g)
    d.rectangle([11, 11, 14, 14], fill=(255, 230, 80, 255)); d.rectangle([18, 11, 21, 14], fill=(255, 230, 80, 255)); d.point((13, 13), fill=(0, 0, 0, 255)); d.point((19, 13), fill=(0, 0, 0, 255))
    d.rectangle([12, 18, 20, 19], fill=(60, 20, 20, 255)); d.point((13, 20), fill=(255, 255, 255, 255)); d.point((19, 20), fill=(255, 255, 255, 255))
    d.rectangle([25, 14, 27, 29], fill=(110, 70, 30, 255)); d.ellipse([23, 8, 29, 16], fill=(90, 55, 25, 255))
    return outline(im)
def wolf():
    im = Image.new('RGBA', (32, 32), (0, 0, 0, 0)); d = ImageDraw.Draw(im); c = (150, 150, 160, 255); dk = (100, 100, 112, 255)
    d.ellipse([4, 12, 24, 24], fill=c); d.rectangle([6, 22, 9, 30], fill=dk); d.rectangle([11, 22, 14, 30], fill=dk); d.rectangle([17, 22, 20, 30], fill=dk)
    d.polygon([(4, 14), (0, 8), (6, 12)], fill=dk)  # tail
    d.ellipse([18, 6, 30, 18], fill=c); d.polygon([(20, 8), (21, 1), (25, 7)], fill=dk); d.polygon([(25, 7), (28, 1), (29, 9)], fill=dk)
    d.polygon([(27, 12), (31, 15), (27, 17)], fill=(210, 210, 220, 255)); d.point((31, 15), fill=(20, 20, 20, 255)); d.rectangle([23, 10, 25, 11], fill=(255, 80, 60, 255))
    d.line([(28, 17), (28, 19)], fill=(255, 255, 255, 255))
    return outline(im)
def ogre():
    im = Image.new('RGBA', (32, 32), (0, 0, 0, 0)); d = ImageDraw.Draw(im); s = (230, 150, 70, 255)
    d.rectangle([7, 14, 25, 28], fill=(120, 70, 40, 255)); d.rectangle([2, 15, 7, 25], fill=s); d.rectangle([25, 15, 30, 25], fill=s)
    d.rectangle([8, 27, 13, 31], fill=s); d.rectangle([19, 27, 24, 31], fill=s)
    d.ellipse([9, 2, 23, 17], fill=s); d.polygon([(10, 5), (8, -1), (13, 4)], fill=(240, 235, 220, 255)); d.polygon([(22, 5), (24, -1), (19, 4)], fill=(240, 235, 220, 255))
    d.rectangle([11, 8, 14, 10], fill=(255, 255, 255, 255)); d.rectangle([18, 8, 21, 10], fill=(255, 255, 255, 255)); d.point((13, 9), fill=(200, 0, 0, 255)); d.point((19, 9), fill=(200, 0, 0, 255))
    d.rectangle([12, 13, 20, 15], fill=(70, 30, 20, 255)); d.rectangle([13, 12, 14, 13], fill=(255, 255, 255, 255)); d.rectangle([18, 12, 19, 13], fill=(255, 255, 255, 255))
    d.rectangle([28, 6, 30, 22], fill=(110, 70, 30, 255)); d.ellipse([25, 2, 31, 10], fill=(90, 55, 25, 255))
    return outline(im)
goblin().save(OUT + 'enemies/goblin.png'); wolf().save(OUT + 'enemies/wolf.png'); ogre().save(OUT + 'enemies/ogre.png')

# ---------------- event icons 16x16 ----------------
def chest():
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle([2, 6, 13, 14], fill=(160, 102, 47, 255)); d.rectangle([2, 4, 13, 7], fill=(190, 125, 60, 255)); d.rectangle([2, 8, 13, 8], fill=(90, 55, 25, 255))
    d.rectangle([7, 7, 8, 10], fill=(255, 215, 80, 255)); d.rectangle([2, 4, 3, 14], fill=(90, 90, 100, 255)); d.rectangle([12, 4, 13, 14], fill=(90, 90, 100, 255))
    outline(im).save(OUT + 'events/chest.png')
def heal():
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle([2, 2, 13, 13], fill=(240, 240, 240, 255)); d.rectangle([7, 4, 8, 11], fill=(210, 50, 60, 255)); d.rectangle([4, 7, 11, 8], fill=(210, 50, 60, 255))
    outline(im).save(OUT + 'events/heal.png')
chest(); heal()
print('aset dibuat di', OUT)
