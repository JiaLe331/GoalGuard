"""Convert ImageGen's baked neutral checkerboard into a real alpha channel.

The generated pose sources use only bright, nearly neutral pixels for the
checkerboard. Flooding that colour range from the canvas edge preserves white
details enclosed by the character, including the eyes and purpose ring.

The runtime-cleanup mode removes enclosed neutral checkerboard and floor pixels
from the lower canvas after the initial edge flood. It deliberately leaves the
upper canvas untouched so the white purpose ring and eyes remain intact.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

MAX_RUNTIME_HEIGHT = 800


def remove_checkerboard(source: Path, destination: Path) -> None:
    rgb = np.asarray(Image.open(source).convert("RGB"), dtype=np.uint8)
    height, width, _ = rgb.shape
    channel_range = rgb.max(axis=2).astype(np.int16) - rgb.min(axis=2).astype(np.int16)
    luminance = rgb.mean(axis=2)
    background_candidate = (channel_range <= 14) & (luminance >= 230)

    outside = np.zeros((height, width), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    def seed(y: int, x: int) -> None:
        if background_candidate[y, x] and not outside[y, x]:
            outside[y, x] = True
            queue.append((y, x))

    for x in range(width):
        seed(0, x)
        seed(height - 1, x)
    for y in range(height):
        seed(y, 0)
        seed(y, width - 1)

    while queue:
        y, x = queue.popleft()
        if y and background_candidate[y - 1, x] and not outside[y - 1, x]:
            outside[y - 1, x] = True
            queue.append((y - 1, x))
        if y + 1 < height and background_candidate[y + 1, x] and not outside[y + 1, x]:
            outside[y + 1, x] = True
            queue.append((y + 1, x))
        if x and background_candidate[y, x - 1] and not outside[y, x - 1]:
            outside[y, x - 1] = True
            queue.append((y, x - 1))
        if x + 1 < width and background_candidate[y, x + 1] and not outside[y, x + 1]:
            outside[y, x + 1] = True
            queue.append((y, x + 1))

    alpha = np.where(outside, 0, 255).astype(np.uint8)

    # Preserve the optional contact shadow as soft alpha while leaving the
    # lavender feet and all enclosed white character details untouched.
    lower_canvas = np.indices((height, width))[0] >= int(height * 0.78)
    shadow = (~outside) & lower_canvas & (channel_range <= 14) & (luminance >= 150)
    shadow_alpha = np.clip((244 - luminance) * 3.2, 0, 180).astype(np.uint8)
    alpha[shadow] = shadow_alpha[shadow]

    rgba = np.dstack((rgb, alpha))
    destination.parent.mkdir(parents=True, exist_ok=True)
    output = Image.fromarray(rgba, mode="RGBA")
    if output.height > MAX_RUNTIME_HEIGHT:
        target_width = round(output.width * MAX_RUNTIME_HEIGHT / output.height)
        output = output.resize((target_width, MAX_RUNTIME_HEIGHT), Image.Resampling.LANCZOS)
    output.save(destination, optimize=True)


def clean_runtime_remnants(source: Path, destination: Path) -> None:
    rgba = np.asarray(Image.open(source).convert("RGBA"), dtype=np.uint8).copy()
    height, _, _ = rgba.shape
    rgb = rgba[:, :, :3]
    channel_range = rgb.max(axis=2).astype(np.int16) - rgb.min(axis=2).astype(np.int16)
    lower_canvas = np.indices(rgba.shape[:2])[0] >= int(height * 0.68)
    neutral_remnant = lower_canvas & (channel_range <= 18) & (rgba[:, :, 3] > 0)
    rgba[:, :, 3][neutral_remnant] = 0

    visible = rgba[:, :, 3] > 0
    visited = np.zeros(visible.shape, dtype=bool)
    largest_component: list[tuple[int, int]] = []
    for start_y, start_x in zip(*np.nonzero(visible & ~visited), strict=False):
        if visited[start_y, start_x]:
            continue
        component: list[tuple[int, int]] = []
        queue: deque[tuple[int, int]] = deque([(int(start_y), int(start_x))])
        visited[start_y, start_x] = True
        while queue:
            y, x = queue.popleft()
            component.append((y, x))
            for next_y, next_x in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= next_y < height and 0 <= next_x < visible.shape[1] and visible[next_y, next_x] and not visited[next_y, next_x]:
                    visited[next_y, next_x] = True
                    queue.append((next_y, next_x))
        if len(component) > len(largest_component):
            largest_component = component

    keep = np.zeros(visible.shape, dtype=bool)
    if largest_component:
        y_coords, x_coords = zip(*largest_component, strict=False)
        keep[np.asarray(y_coords), np.asarray(x_coords)] = True
    rgba[:, :, 3][visible & ~keep] = 0
    rgba[:, :, :3][rgba[:, :, 3] == 0] = 0
    Image.fromarray(rgba, mode="RGBA").save(destination, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--cleanup-runtime", action="store_true")
    args = parser.parse_args()
    if args.cleanup_runtime:
        clean_runtime_remnants(args.source, args.destination)
    else:
        remove_checkerboard(args.source, args.destination)


if __name__ == "__main__":
    main()
