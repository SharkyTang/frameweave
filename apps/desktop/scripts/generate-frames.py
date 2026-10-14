"""Generate three original stills for the bundled geometric demo, without remote media."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

output = Path(__file__).resolve().parents[1] / 'public' / 'demo' / 'frames'
output.mkdir(parents=True, exist_ok=True)
font_path = '/System/Library/Fonts/Supplemental/Arial.ttf'
for index, phase in enumerate(['QUESTION', 'PROCESS', 'RESULT']):
    frame = Image.new('RGB', (1280, 720), '#f2effb')
    draw = ImageDraw.Draw(frame)
    draw.text((64, 45), 'WORKBENCH / SELF-MADE DEMO', font=ImageFont.truetype(font_path, 20), fill='#aaa0bd')
    if index == 0:
        draw.rounded_rectangle((570, 220, 710, 360), radius=6, fill='#8c7cc7')
    elif index == 1:
        for x, color in [(370, '#8c7cc7'), (550, '#a698cf'), (730, '#c3b6db')]:
            draw.rounded_rectangle((x, 240, x + 120, 360), radius=6, outline=color, width=8)
    else:
        draw.ellipse((555, 210, 725, 380), outline='#9b89c6', width=20)
    draw.text((640, 460), phase, anchor='mt', font=ImageFont.truetype(font_path, 48), fill='#746585')
    draw.text((640, 555), 'A question. A process. A result.', anchor='mt', font=ImageFont.truetype(font_path, 23), fill='#b4a8c3')
    frame.save(output / f'phase-{index}.png')
