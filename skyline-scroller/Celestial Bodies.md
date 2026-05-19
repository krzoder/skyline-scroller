# Celestial Bodies

The engine renders the Sun and the Moon dynamically on top of the [[Sky Gradients]]. Handled within `SkySystem.ts`, these bodies trace an arc across the screen synchronized to the 24-hour cycle.

## Orbital Path
Both the sun and moon share a common trajectory logic.
1.  **Horizontal Axis ($X$)**:
    Mapped linearly from hour `0` to `24`. A padding of `150px` is applied to both edges of the screen so the sun/moon rises from fully off-screen and sets fully off-screen without clipping.
    `x = -pad + (time / 24) * (w + pad * 2)`
2.  **Vertical Arc ($Y$)**:
    Height uses a sine wave peaking around noon:
    `cy = 125 + Math.sin((time - 6) * Math.PI / 12) * -75`

## Phase Transitions and Flipping
A unique feature of the `SkySystem` is its "flip" mechanic, which smoothly swaps the celestial body from a Sun to a Moon and vice versa over a short temporal window (`flipWin = 0.15`).

### Sunrise (06:00)
*   **$t < 5.85$**: Full Night (Moon visible).
*   **$5.85 \le t < 6.15$**: Flip Phase. The celestial container's horizontal scale (`scaleX`) transitions using a cosine wave: $scaleX = \cos(angle)$. At $p=0.5$ (exactly 06:00), the body visually compresses to 0 width, swaps from Moon to Sun, and expands again.
*   **$6.15 \le t < 6.5$**: Growing Phase. The Sun's core size scales up from `30` to `40`, and its bloom alpha interpolates from `0` to `0.1`.

### Sunset (18:00)
*   **$17.5 \le t < 17.85$**: Ray Fade Phase. The Sun's glowing bloom fades out, and its core shrinks back to size 30 *before* reaching the horizon.
*   **$17.85 \le t < 18.15$**: Flip Phase. The Sun compresses and swaps to the Moon.
*   **$t \ge 18.15$**: Full Night. Moon is drawn with dual circles (base `#FEFCD7`, shadow `#E0E0E0`) to create a cratered/crescent illusion.

This procedural approach eliminates the need for sprite sheets while retaining a highly dynamic day/night presentation.
