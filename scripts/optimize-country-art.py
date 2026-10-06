"""Create runtime country art only; preserve portrait masters and all dish assets."""
import json
from pathlib import Path
import struct
import subprocess
import zlib

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'src/assets/experience/country-backgrounds'


def lower_edge_color(path):
    """Read the lower RGB edge of these 8-bit non-interlaced PNG masters."""
    data = path.read_bytes()
    width, height = struct.unpack('>II', data[16:24])
    if data[24:29] != bytes([8, 2, 0, 0, 0]):
        raise ValueError('Expected non-interlaced RGB master')
    offset, compressed = 8, bytearray()
    while offset < len(data):
        length = int.from_bytes(data[offset:offset + 4], 'big')
        if data[offset + 4:offset + 8] == b'IDAT':
            compressed.extend(data[offset + 8:offset + 8 + length])
        offset += length + 12
    raw, previous, samples = zlib.decompress(compressed), bytearray(width * 3), []
    for y in range(height):
        start = y * (width * 3 + 1)
        kind, row = raw[start], bytearray(raw[start + 1:start + 1 + width * 3])
        for x in range(len(row)):
            a, b, c = row[x - 3] if x >= 3 else 0, previous[x], previous[x - 3] if x >= 3 else 0
            p = a + b - c
            pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
            predictor = [0, a, b, (a + b) // 2, a if pa <= pb and pa <= pc else b if pb <= pc else c][kind]
            row[x] = (row[x] + predictor) % 256
        if y >= height - 24:
            samples.extend(tuple(row[x:x + 3]) for x in range(0, len(row), 3))
        previous = row
    channels = [round(sum(pixel[i] for pixel in samples) / len(samples)) for i in range(3)]
    return '#' + ''.join(f'{value:02x}' for value in channels)


def main():
    report = []
    for source in sorted(ART.glob('*.png')):
        row = {'country': source.stem, 'originalBytes': source.stat().st_size,
               'foundation': lower_edge_color(source)}
        for label, width, quality in [('card', 400, 88), ('portrait', 941, 88)]:
            target = ART / f'{source.stem}-{label}.webp'
            subprocess.run(['cwebp', '-quiet', '-q', str(quality), '-m', '6', '-resize', str(width), '0', str(source), '-o', str(target)], check=True)
            row[label + 'Bytes'] = target.stat().st_size
            row[label + 'ReductionPercent'] = round(100 * (1 - target.stat().st_size / source.stat().st_size), 2)
        report.append(row)
    output = ROOT / 'docs/production-audit-validation/country-image-sizes.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
